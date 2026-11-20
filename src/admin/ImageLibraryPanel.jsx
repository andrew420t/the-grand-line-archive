import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, RefreshCw, ShieldAlert, Trash2, Upload } from 'lucide-react'
import { deleteLibraryPhoto, listLibraryPhotos, uploadLibraryPhotos } from './productStorage'

export default function ImageLibraryPanel({ user }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingPath, setDeletingPath] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadImages = useCallback(async () => {
    setLoading(true); setError('')
    try { setImages(await listLibraryPhotos(user.id)) }
    catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadImages() }, [user.id])

  const chooseFiles = (fileList) => {
    const selected = [...fileList].filter((file) => file.type.startsWith('image/'))
    const remaining = Math.max(0, 30 - files.length)
    const accepted = selected.slice(0, remaining)
    setFiles((current) => [...current, ...accepted])
    setError(selected.length > remaining ? 'The image library accepts up to 30 files per upload batch.' : '')
    setNotice(accepted.length ? `${accepted.length} image${accepted.length === 1 ? '' : 's'} ready to upload.` : '')
  }
  const upload = async () => {
    if (!files.length) return
    setBusy(true); setError(''); setNotice('')
    try {
      const saved = await uploadLibraryPhotos({ userId: user.id, files })
      setFiles([])
      setNotice(`${saved.length} image${saved.length === 1 ? '' : 's'} saved to your image library.`)
      await loadImages()
    } catch (uploadError) { setError(uploadError.message) }
    finally { setBusy(false) }
  }
  const removeImage = async (image) => {
    if (!window.confirm('Delete this image from the library?')) return
    setDeletingPath(image.path); setError(''); setNotice('')
    try {
      await deleteLibraryPhoto(image.path)
      setImages((current) => current.filter((entry) => entry.path !== image.path))
      setNotice('Image deleted from the library.')
    } catch (deleteError) { setError(deleteError.message) }
    finally { setDeletingPath('') }
  }

  return (
    <section className="admin-view image-library-panel">
      <div className="admin-view-heading">
        <div><p className="eyebrow"><ImagePlus size={14} /> IMAGE LIBRARY</p><h2>Store card photographs for later.</h2>
          <p>Upload one image or a whole batch. These images are stored separately from product listings, ready for future card entries.</p></div>
        <button className="button button--outline" type="button" onClick={loadImages} disabled={loading}><RefreshCw size={14} /> Refresh library</button>
      </div>
      <div className="photo-dropzone image-library-dropzone" role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); chooseFiles(event.dataTransfer.files) }}>
        <ImagePlus size={26} /><strong>Select or drop card images here</strong>
        <span>Choose one photo or multiple photos. Images are resized and saved as JPEGs.</span>
        <button className="button button--outline" type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }}><Upload size={14} /> Choose images</button>
        <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { if (event.target.files) chooseFiles(event.target.files); event.target.value = '' }} />
      </div>
      {files.length > 0 && <div className="image-library-queue">
        <div className="admin-view-heading"><div><p className="eyebrow">UPLOAD QUEUE</p><h3>{files.length} image{files.length === 1 ? '' : 's'} selected</h3></div>
          <button className="button button--gold" type="button" disabled={busy} onClick={upload}><Upload size={14} /> {busy ? 'Uploading…' : 'Upload to image storage'}</button></div>
        <ul>{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}>{file.name} <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span></li>)}</ul>
        <button className="button button--outline" type="button" disabled={busy} onClick={() => setFiles([])}>Clear selection</button>
      </div>}
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={15} /><span>{notice}</span></div>}
      <div className="photo-studio__heading"><div><p className="eyebrow">SAVED PHOTOGRAPHS</p><h3>{images.length} image{images.length === 1 ? '' : 's'} in storage</h3></div></div>
      {loading ? <div className="loading-state">Loading image library…</div> : images.length ? (
        <div className="photo-grid image-library-grid">{images.map((image) => <article className="photo-card" key={image.path}>
          <div className="photo-card__preview"><img src={image.url} alt="Saved card photograph" loading="lazy" /></div>
          <div className="photo-card__body"><span className="photo-card__name" title={image.name}>{image.name}</span>
            <button className="button button--danger" type="button" disabled={deletingPath === image.path} onClick={() => removeImage(image)}><Trash2 size={14} /> {deletingPath === image.path ? 'Deleting…' : 'Delete image'}</button></div>
        </article>)}</div>
      ) : <div className="empty-catalogue"><ImagePlus size={24} /><h3>Your image library is empty.</h3><p>Upload card photographs above and they will be kept here for future card entries.</p></div>}
    </section>
  )
}