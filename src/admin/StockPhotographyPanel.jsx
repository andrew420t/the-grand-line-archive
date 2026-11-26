import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ShieldAlert, Upload } from 'lucide-react'
import PhotoStudio from './PhotoStudio'
import { readPersistentDraft, savePersistentDraft } from './persistentDraftStorage'
import {
  ensurePhotoStorageReady,
  removeLocalPhotos,
  uploadProductPhotos,
} from './productStorage'

export default function StockPhotographyPanel({
  products,
  photos,
  onPhotosChange,
  user,
  onSaved,
}) {
  const [productDraft] = useState(() => readPersistentDraft(user?.id, 'stock-photography', {}))
  const [productId, setProductId] = useState(() => productDraft.productId || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const uploadLock = useRef(false)
  const selectedProduct = products.find((product) => String(product.id) === productId)

  useEffect(() => {
    if (!user?.id) return
    savePersistentDraft(user.id, 'stock-photography', { productId })
  }, [user?.id, productId])

  const upload = async () => {
    if (uploadLock.current) return
    if (!selectedProduct) {
      setError('Choose an existing product. To photograph a new card, use Add Stock.')
      return
    }
    if (!photos.length) {
      setError('Add at least one photograph before uploading.')
      return
    }

    uploadLock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await ensurePhotoStorageReady()
      const saved = await uploadProductPhotos({
        productId: selectedProduct.id,
        userId: user.id,
        photos,
      })
      await removeLocalPhotos(photos)
      const uploadedPhotoIds = new Set(photos.map((photo) => photo.id))
      onPhotosChange((current) => current.filter((photo) => !uploadedPhotoIds.has(photo.id)))
      // These queued preview URLs are no longer referenced after a successful upload.
      photos.forEach((photo) => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      })
      setNotice(`${saved.length} photograph${saved.length === 1 ? '' : 's'} linked to ${selectedProduct.name}.`)
      onSaved()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      uploadLock.current = false
      setBusy(false)
    }
  }

  return (
    <section className="stock-photo-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow"><Camera size={14} /> STOCK PHOTOGRAPHY</p>
          <h2>Show each card<br /><em>as it really is.</em></h2>
          <p>Photograph card fronts, backs, and close details; review, crop, rotate, compress, and attach them to one product record.</p>
        </div>
        <label className="form-field photo-product-picker">
          <span>Attach photographs to product</span>
          <select value={productId} onChange={(event) => { setProductId(event.target.value); setError(''); setNotice('') }}>
            <option value="">Choose a product</option>
            {products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.id}</option>)}
          </select>
        </label>
      </div>

      {products.length === 0 && (
        <div className="photo-infrastructure-note">
          <ShieldAlert size={16} />
          <span>No products are currently available to attach photographs to. Add a product first, or use Scan Card and continue to Add Stock.</span>
        </div>
      )}
      {error && <div className="error-notice"><ShieldAlert size={16} /><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={16} /><span>{notice}</span></div>}

      <PhotoStudio photos={photos} onPhotosChange={onPhotosChange} />

      <div className="photo-upload-footer">
        <p>Images are prepared as JPEG (max 1800px, quality 90%) before upload. Uploading requires an administrator Storage policy and the reviewed photo table/bucket setup.</p>
        <button className="button button--gold" type="button" disabled={busy || photos.length === 0 || !selectedProduct} onClick={upload}>
          <Upload size={15} /> {busy ? 'Uploading…' : `Upload ${photos.length || ''} photograph${photos.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </section>
  )
}
