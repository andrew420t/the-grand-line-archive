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
      const productResult = await supabase
        .from('products')
        .update({
          image_url: frontImage.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
      if (productResult.error) {
        throw new Error(`Photographs are linked, but the public catalogue image could not be updated: ${productResult.error.message}`)
      }
    }

    return imageRecords
  } catch (error) {
    const cleanupMessages = []
    if (metadataInserted) {
      const deleteResult = await supabase
        .from('product_images')
        .delete()
        .in('storage_path', uploadedPaths)
      if (deleteResult.error) cleanupMessages.push(`image metadata cleanup failed: ${deleteResult.error.message}`)
    }
    if (uploadedPaths.length) {
      const removeResult = await storage.remove(uploadedPaths)
      if (removeResult.error) cleanupMessages.push(`Storage cleanup failed: ${removeResult.error.message}`)
    }
    const cleanup = cleanupMessages.length ? ` (${cleanupMessages.join('; ')})` : ''
    throw new Error(`${error.message}${cleanup}`)
  }
}

export async function removeLocalPhotos(photos) {
  photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
}
