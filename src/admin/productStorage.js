import { supabase } from '../lib/supabase'
import { makePhotoFile, prepareCardImage } from './imageTools'

export const CARD_IMAGE_BUCKET = 'product-card-images'

export async function ensurePhotoStorageReady() {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error: tableError } = await supabase
    .from('product_images')
    .select('id')
    .limit(0)
  if (tableError) {
    throw new Error(
      `The product_images table is not available to this administrator: ${tableError.message}`,
    )
  }
}

export async function getProductImagePaths(productId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const result = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)
  if (result.error) {
    if (result.error.code === 'PGRST205' || result.error.code === '42P01') return []
    throw new Error(`Could not inspect linked product images: ${result.error.message}`)
  }
  return (result.data || []).map((image) => image.storage_path).filter(Boolean)
}

export async function removeStoredPhotos(paths) {
  if (!supabase || !paths.length) return
  const result = await supabase.storage.from(CARD_IMAGE_BUCKET).remove(paths)
  if (result.error) throw new Error(result.error.message)
}

export async function uploadProductPhotos({ productId, userId, photos }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!photos.length) return []

  const storage = supabase.storage.from(CARD_IMAGE_BUCKET)
  const uploadedPaths = []
  let metadataInserted = false
  let imageRecords = []
  let previousProductImageUrl = null
  let productImageUpdateAttempted = false

  try {
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index]
      const compressed = await prepareCardImage(
        photo.file,
        photo.rotation,
        photo.cropToCard,
      )
      const file = makePhotoFile(compressed, photo.name)
      const path = `${productId}/${photo.role}/${crypto.randomUUID()}.jpg`
      const { error } = await storage.upload(path, file, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      })
      if (error) throw new Error(`Could not upload ${photo.name}: ${error.message}`)

      uploadedPaths.push(path)
      const { data } = storage.getPublicUrl(path)
      imageRecords.push({
        product_id: productId,
        image_url: data.publicUrl,
        storage_path: path,
        role: photo.role,
        sort_order: index,
        uploaded_by: userId,
      })
    }

    const metadataResult = await supabase.from('product_images').insert(imageRecords)
    if (metadataResult.error) {
      throw new Error(`Photographs uploaded but could not be linked to the product: ${metadataResult.error.message}`)
    }
    metadataInserted = true

    const frontImage = imageRecords.find((image) => image.role === 'front')
    if (frontImage) {
      const currentProduct = await supabase
        .from('products')
        .select('id,image_url')
        .eq('id', productId)
        .maybeSingle()
      if (currentProduct.error || !currentProduct.data) {
        throw new Error(`Could not verify the product before updating its front photograph: ${currentProduct.error?.message || 'Product not found'}`)
      }
      previousProductImageUrl = currentProduct.data.image_url ?? null
      productImageUpdateAttempted = true
      const productResult = await supabase
        .from('products')
        .update({
          image_url: frontImage.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select('id')
        .maybeSingle()
      if (productResult.error || !productResult.data) {
        throw new Error(`Photographs are linked, but the public catalogue image could not be updated: ${productResult.error?.message || 'Product not found'}`)
      }
    }

    return imageRecords
  } catch (error) {
    const cleanupMessages = []
    if (productImageUpdateAttempted) {
      try {
        const restoreResult = await supabase
          .from('products')
          .update({
            image_url: previousProductImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
          // Restore only if this upload still owns the front-image value. A
          // concurrent admin edit must not be overwritten by rollback.
          .eq('image_url', imageRecords.find((image) => image.role === 'front')?.image_url)
        if (restoreResult.error) cleanupMessages.push(`product image rollback failed: ${restoreResult.error.message}`)
      } catch (restoreError) {
        cleanupMessages.push(`product image rollback failed: ${restoreError.message || String(restoreError)}`)
      }
    }
    if (metadataInserted) {
      try {
        const deleteResult = await supabase
          .from('product_images')
          .delete()
          .in('storage_path', uploadedPaths)
        if (deleteResult.error) cleanupMessages.push(`image metadata cleanup failed: ${deleteResult.error.message}`)
      } catch (deleteError) {
        cleanupMessages.push(`image metadata cleanup failed: ${deleteError.message || String(deleteError)}`)
      }
    }
    if (uploadedPaths.length) {
      try {
        const removeResult = await storage.remove(uploadedPaths)
        if (removeResult.error) cleanupMessages.push(`Storage cleanup failed: ${removeResult.error.message}`)
      } catch (removeError) {
        cleanupMessages.push(`Storage cleanup failed: ${removeError.message || String(removeError)}`)
      }
    }
    const cleanup = cleanupMessages.length ? ` (${cleanupMessages.join('; ')})` : ''
    throw new Error(`${error.message}${cleanup}`)
  }
}

export async function removeLocalPhotos(photos) {
  photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
}

export async function listLibraryPhotos(userId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const folder = `${userId}/library`
  const result = await supabase.storage.from(CARD_IMAGE_BUCKET).list(folder, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (result.error) throw new Error(`Could not load the image library: ${result.error.message}`)
  const storage = supabase.storage.from(CARD_IMAGE_BUCKET)
  return (result.data || []).filter((file) => file.name && !file.name.startsWith('.')).map((file) => {
    const path = `${folder}/${file.name}`
    const { data } = storage.getPublicUrl(path)
    return { ...file, path, url: data.publicUrl }
  })
}

export async function uploadLibraryPhotos({ userId, files }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const storage = supabase.storage.from(CARD_IMAGE_BUCKET)
  const uploaded = []
  try {
    for (const sourceFile of files) {
      const compressed = await prepareCardImage(sourceFile)
      const file = makePhotoFile(compressed, sourceFile.name)
      const path = `${userId}/library/${crypto.randomUUID()}.jpg`
      const result = await storage.upload(path, file, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' })
      if (result.error) throw new Error(`Could not upload ${sourceFile.name}: ${result.error.message}`)
      const { data } = storage.getPublicUrl(path)
      uploaded.push({ path, url: data.publicUrl, name: sourceFile.name })
    }
    return uploaded
  } catch (error) {
    if (uploaded.length) {
      const cleanup = await storage.remove(uploaded.map((photo) => photo.path))
      if (cleanup.error) throw new Error(`${error.message} (Some uploaded images could not be rolled back: ${cleanup.error.message})`)
    }
    throw error
  }
}

export async function deleteLibraryPhoto(path) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const result = await supabase.storage.from(CARD_IMAGE_BUCKET).remove([path])
  if (result.error) throw new Error(`Could not delete image: ${result.error.message}`)
}