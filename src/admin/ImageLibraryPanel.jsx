import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, RefreshCw, ShieldAlert, Trash2, Upload } from 'lucide-react'
import { deleteLibraryPhoto, listLibraryPhotos, uploadLibraryPhotos } from './productStorage'
import { getCatalogueCoverageReport, getCatalogueImageGallery, getCatalogueReferenceTestMatrix } from './cardCatalogue'

export default function ImageLibraryPanel({ user }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingPath, setDeletingPath] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [coverage, setCoverage] = useState(null)
  const [coverageError, setCoverageError] = useState('')
  const [referenceImages, setReferenceImages] = useState([])
  const [referenceTotal, setReferenceTotal] = useState(0)
  const [referenceNextOffset, setReferenceNextOffset] = useState(0)
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [referenceError, setReferenceError] = useState('')
  const [referenceQuery, setReferenceQuery] = useState('')
  const [referenceLanguage, setReferenceLanguage] = useState('all')
  const [failedReferenceIds, setFailedReferenceIds] = useState([])
  const [loadedReferenceIds, setLoadedReferenceIds] = useState([])
  const [imageRetryVersion, setImageRetryVersion] = useState(0)
  const [matrixRunning, setMatrixRunning] = useState(false)
  const [matrixReport, setMatrixReport] = useState(null)
  const [matrixResults, setMatrixResults] = useState([])
  const [matrixError, setMatrixError] = useState('')

  const loadImages = useCallback(async () => {
    setLoading(true); setError('')
    try { setImages(await listLibraryPhotos(user.id)) }
    catch (loadError) { setError(loadError.message) }
    finally { setLoading(false) }
  }, [user.id])
  useEffect(() => { loadImages() }, [loadImages])
  useEffect(() => {
    let active = true
    getCatalogueCoverageReport()
      .then((report) => { if (active) setCoverage(report) })
      .catch((loadError) => { if (active) setCoverageError(loadError.message) })
    return () => { active = false }
  }, [])

  const loadReferenceImages = useCallback(async (offset = 0) => {
    setReferenceLoading(true); setReferenceError('')
    try {
      const page = await getCatalogueImageGallery({ offset, limit: 60, query: referenceQuery, language: referenceLanguage })
      setReferenceImages((current) => offset === 0 ? page.items : [...current, ...page.items])
      if (offset === 0) { setFailedReferenceIds([]); setLoadedReferenceIds([]) }
      setReferenceTotal(page.total)
      setReferenceNextOffset(page.nextOffset)
    } catch (loadError) { setReferenceError(loadError.message) }
    finally { setReferenceLoading(false) }
  }, [referenceQuery, referenceLanguage])
  useEffect(() => { loadReferenceImages(0) }, [loadReferenceImages])

  const runReferenceMatrixCheck = async () => {
    setMatrixRunning(true); setMatrixError(''); setMatrixReport(null); setMatrixResults([])
    try {
      const matrix = await getCatalogueReferenceTestMatrix()
      setMatrixReport(matrix)
      const results = []
      // Check ten official image references at a time to avoid flooding image hosts.
      for (let offset = 0; offset < matrix.items.length; offset += 10) {
        const batch = matrix.items.slice(offset, offset + 10)
        const checked = await Promise.all(batch.map((item) => new Promise((resolve) => {
          const image = new window.Image()
          image.onload = () => resolve({ ...item, status: 'loaded' })
          image.onerror = () => resolve({ ...item, status: 'failed' })
          image.src = item.imageUrl
        })))
        results.push(...checked)
        setMatrixResults([...results])
      }
    } catch (checkError) {
      setMatrixError(checkError.message || 'Could not build the 100-image reference test.')
    } finally {
      setMatrixRunning(false)
    }
  }

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
      <section className="catalogue-health-panel">
        <div className="photo-studio__heading"><div><p className="eyebrow">REFERENCE CATALOGUE</p><h3>Card image and set coverage</h3></div></div>
        {coverageError && <div className="error-notice"><ShieldAlert size={15} /><span>{coverageError}</span></div>}
        {!coverage && !coverageError && <div className="loading-state">Checking reference catalogue…</div>}
        {coverage && <>
          <div className="overview-metrics">
            <article className="overview-metric"><strong>{coverage.cards.toLocaleString()}</strong><span>Card records</span></article>
            <article className="overview-metric"><strong>{coverage.printings.toLocaleString()}</strong><span>Printings / variants</span></article>
            <article className="overview-metric"><strong>{coverage.withOfficialImage.toLocaleString()}</strong><span>Official Bandai image references</span></article>
            <article className="overview-metric"><strong>{coverage.withoutImageLocator.toLocaleString()}</strong><span>Printings without image reference</span></article>
          </div>
          <p className="muted-copy">English: {coverage.languages.en?.withImage || 0}/{coverage.languages.en?.printings || 0} with image references · Japanese: {coverage.languages.jp?.withImage || 0}/{coverage.languages.jp?.printings || 0}. This is source-feed coverage, not a live HTTP check of every image.</p>
          {coverage.sourceGeneratedAt && <p className="muted-copy">Primary reference dataset last generated: {new Date(coverage.sourceGeneratedAt).toLocaleString()} · {coverage.sourceAgeDays} day{coverage.sourceAgeDays === 1 ? '' : 's'} old.</p>}
          {coverage.sourceIsStale && <div className="catalogue-health-unassigned"><strong>Reference data is out of date.</strong><p className="muted-copy">The upstream Koala Kollect manifest is more than 7 days old. Newer official sets may exist on Bandai's card list but not yet be present in this feed.</p></div>}
          {coverage.missingExpectedSets?.length > 0 && <div className="catalogue-health-unassigned"><strong>Known set coverage gaps: {coverage.missingExpectedSets.join(', ')}</strong><p className="muted-copy">These sets are not represented in the current primary source feed. We are checking the current official Bandai lists and alternate reference feeds rather than treating them as empty sets.</p></div>}
          <div className="catalogue-health-unassigned">
            <h4>100-image reference smoke test</h4>
            <p className="muted-copy">Checks two unique English and two Japanese image references for each of OP-01–OP-18, EB-01–EB-05 and PRB-01/02. It verifies that image URLs load in this browser; it does not run card OCR.</p>
            <button className="button button--outline" type="button" disabled={matrixRunning} onClick={runReferenceMatrixCheck}>{matrixRunning ? 'Checking image references…' : 'Run 100-image reference test'}</button>
            {matrixError && <p className="form-error">{matrixError}</p>}
            {matrixReport && <p className="muted-copy">Image checks: {matrixResults.filter((item) => item.status === 'loaded').length} loaded · {matrixResults.filter((item) => item.status === 'failed').length} failed · {matrixReport.missingSlots.length} missing from source · {matrixReport.expectedTotal} expected.</p>}
            {matrixReport && <details className="catalogue-health-missing">
              <summary>View image test results ({matrixResults.length + matrixReport.missingSlots.length} rows)</summary>
              <div className="catalogue-health-table">
                {matrixResults.map((item) => <div className="catalogue-health-row" key={item.id}><strong>{item.targetSet} · {item.cardNumber}</strong><span>{item.language.toUpperCase()} · sample {item.sampleSlot}</span><span>{item.name || 'Name not supplied'}</span><span>{item.status === 'loaded' ? 'Image loaded' : 'Image failed'} · {item.source}</span></div>)}
                {matrixReport.missingSlots.map((item) => <div className="catalogue-health-row" key={item.targetSet + item.language + item.sampleSlot}><strong>{item.targetSet}</strong><span>{item.language.toUpperCase()} · sample {item.sampleSlot}</span><span>No source record</span><span>Missing from feed</span></div>)}
              </div>
            </details>}
          </div>
          <div className="catalogue-health-table">
            {Object.entries(coverage.sets).sort(([a], [b]) => a.localeCompare(b)).map(([code, stats]) => (
              <div className="catalogue-health-row" key={code}><strong>{code}</strong><span>{stats.printings} printings</span><span>{stats.withImage} images</span><span>{stats.withoutImage} missing</span></div>
            ))}
          </div>
          <div className="catalogue-health-unassigned">
            <h4>Missing-image diagnostics</h4>
            <p className="muted-copy">{coverage.missingImageTotal?.toLocaleString() || 0} printings have no image reference in the current source feed. The table below samples up to 250 missing entries across assigned and unassigned sets. {coverage.unassigned?.printings?.toLocaleString() || 0} printings also have no linked product/set record; {coverage.unassigned?.withoutImage?.toLocaleString() || 0} of those are missing images. Missing by language: {Object.entries(coverage.missingImageByLanguage || {}).map(([language, count]) => `${language.toUpperCase()}: ${count}`).join(' · ') || 'none'}. Missing by set: {Object.entries(coverage.missingImageBySet || {}).map(([set, count]) => `${set}: ${count}`).join(' · ') || 'none'}. Source breakdown for unassigned missing images: {Object.entries(coverage.unassigned?.withoutImageBySite || {}).map(([site, count]) => `${site}: ${count}`).join(' · ') || 'none'}.</p>
            {coverage.missingImageSamples?.length > 0 ? (
              <div className="catalogue-health-table catalogue-health-missing">
                <div className="catalogue-health-row catalogue-health-row--heading"><strong>Card number</strong><span>Language / source</span><span>Rarity / variant</span><span>Set / link</span></div>
                {coverage.missingImageSamples.map((item) => (
                  <div className="catalogue-health-row" key={item.printingKey}>
                    <strong>{item.cardNumber || 'No card number'}</strong>
                    <span>{item.language.toUpperCase()} · {item.sourceSite}</span>
                    <span>{[item.rarity, item.variant].filter(Boolean).join(' / ') || 'Not supplied'}</span>
                    <span>{item.setCode || item.numberPrefixHint || 'No set'} · {item.hasProductLink ? 'Product link exists' : 'No product link'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="muted-copy">No printings without image references were found in this source feed.</p>}
          </div>
          <p className="muted-copy">Image source priority: Bandai official card-image URLs when an official image ID is present; structured card metadata is currently supplied by the Koala Kollect reference dataset. Seller-uploaded product photographs remain separate and take priority in the public archive.</p>
        </>}
      </section>
      <section className="catalogue-reference-gallery">
        <div className="photo-studio__heading"><div><p className="eyebrow">CARD-NUMBER REFERENCE LIBRARY</p><h3>{referenceImages.length.toLocaleString()} of {referenceTotal.toLocaleString()} matching references</h3><p className="muted-copy">Indexed by card number, language, set and printing variant. References remain separate from your own uploaded photographs; source artwork is loaded from its catalogue host.</p></div></div>
        <p className="muted-copy">Live image check for references currently loaded in this browser: {loadedReferenceIds.length} loaded · {failedReferenceIds.length} failed. This checks displayed images only, not the entire catalogue.</p>
        {failedReferenceIds.length > 0 && <button className="button button--outline" type="button" onClick={() => { setFailedReferenceIds([]); setLoadedReferenceIds([]); setImageRetryVersion((value) => value + 1) }}>Retry failed reference images</button>}
        <div className="catalogue-reference-filters">
          <label className="form-field"><span>Search card number, name or set</span><input type="search" value={referenceQuery} onChange={(event) => setReferenceQuery(event.target.value)} placeholder="OP01-001 or Monkey D. Luffy" /></label>
          <label className="form-field"><span>Language</span><select value={referenceLanguage} onChange={(event) => setReferenceLanguage(event.target.value)}><option value="all">All languages</option><option value="en">English</option><option value="jp">Japanese</option></select></label>
        </div>
        {referenceError && <div className="error-notice"><ShieldAlert size={15} /><span>{referenceError}</span></div>}
        {referenceImages.length > 0 && <div className="photo-grid image-library-grid">{referenceImages.map((item) => <article className="photo-card" key={item.id}>
          <div className="photo-card__preview">{failedReferenceIds.includes(item.id) ? <div className="empty-catalogue"><ImagePlus size={20}/><span>Reference image unavailable</span></div> : <img key={`${item.id}:${imageRetryVersion}`} src={item.imageUrl} alt={item.name ? item.name + ' ' + item.cardNumber : 'One Piece card ' + item.cardNumber} loading="lazy" onLoad={() => setLoadedReferenceIds((current) => current.includes(item.id) ? current : [...current, item.id])} onError={() => { setLoadedReferenceIds((current) => current.filter((id) => id !== item.id)); setFailedReferenceIds((current) => current.includes(item.id) ? current : [...current, item.id]) }} />}</div>
          <div className="photo-card__body"><span className="photo-card__name" title={item.name}>{item.name || item.cardNumber} · {item.cardNumber}</span><span className="muted-copy">{item.language.toUpperCase()} · {item.setCode || 'Unassigned'} · {item.rarity} {item.variant}</span><span className="muted-copy">{failedReferenceIds.includes(item.id) ? 'Image failed to load' : 'Reference artwork · not a personal upload'}</span></div>
        </article>)}</div>}
        {referenceNextOffset !== null && <button className="button button--outline" type="button" disabled={referenceLoading} onClick={() => loadReferenceImages(referenceNextOffset)}>{referenceLoading ? 'Loading catalogue images…' : 'Load more reference images'}</button>}
        {referenceLoading && referenceImages.length === 0 && <div className="loading-state">Loading catalogue reference images…</div>}{!referenceLoading && referenceImages.length === 0 && !referenceError && <p className="muted-copy">No reference images match this search. Try another card number or select all languages.</p>}
      </section>
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