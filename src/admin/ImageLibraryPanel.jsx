import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, PackagePlus, RefreshCw, ShieldAlert, Trash2, Upload } from 'lucide-react'
import { deleteLibraryPhoto, listLibraryPhotos, uploadLibraryPhotos } from './productStorage'
import { getCatalogueCoverageReport, getCatalogueImageAuditInventory, getCatalogueImageGallery, saveDonCardSetOverride } from './cardCatalogue'
import { loadAdminLibraryFileDraft, saveAdminLibraryFileDraft } from './adminDraftStorage'
import { readPersistentDraft, savePersistentDraft } from './persistentDraftStorage'
import { auditCatalogueImageRecord, buildImageAuditSummary, IMAGE_CHECK_STATUS, runResumableCatalogueAudit } from './imageAuditUtils.js'

const DON_SET_OPTIONS = [
  ...Array.from({ length: 18 }, (_, index) => 'OP-' + String(index + 1).padStart(2, '0')),
  ...Array.from({ length: 5 }, (_, index) => 'EB-' + String(index + 1).padStart(2, '0')),
  'PRB-01', 'PRB-02', 'OP14-EB04', 'OP15-EB04',
  ...Array.from({ length: 12 }, (_, index) => 'DP-' + String(index + 1).padStart(2, '0')),
  ...Array.from({ length: 36 }, (_, index) => 'ST-' + String(index + 1).padStart(2, '0')),
  'PROMO', 'Other Product',
]

export default function ImageLibraryPanel({ user, onAddCard }) {
  const inputRef = useRef(null)
  const uploadLock = useRef(false)
  const deleteLock = useRef(false)
  const imageListRequestId = useRef(0)
  const referenceRequestId = useRef(0)
  const matrixCheckLock = useRef({ en: false, jp: false })
  const auditPauseState = useRef({ en: false, jp: false })
  const donSetSaveLock = useRef(false)
  const [files, setFiles] = useState([])
  const [filesRestored, setFilesRestored] = useState(false)
  const [fileDraftWritable, setFileDraftWritable] = useState(false)
  const [fileDraftError, setFileDraftError] = useState('')
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
  const [referenceFilterOptions, setReferenceFilterOptions] = useState({ languages: [], sets: [], cardNumberSets: [], rarities: [], cardTypes: [], colors: [], variants: [] })
  const [savedLibraryDraft] = useState(() => readPersistentDraft(user?.id, 'image-library', {}))
  const [referenceQuery, setReferenceQuery] = useState(() => savedLibraryDraft.referenceQuery || '')
  const [referenceCardNumber, setReferenceCardNumber] = useState(() => savedLibraryDraft.referenceCardNumber || '')
  const [referenceSort, setReferenceSort] = useState(() => savedLibraryDraft.referenceSort || 'card-number-asc')
  const [referenceLanguage, setReferenceLanguage] = useState(() => savedLibraryDraft.referenceLanguage || 'all')
  const [referenceSet, setReferenceSet] = useState(() => savedLibraryDraft.referenceSet || 'all')
  const [referenceCardNumberSet, setReferenceCardNumberSet] = useState(() => savedLibraryDraft.referenceCardNumberSet || 'all')
  const [referenceRarity, setReferenceRarity] = useState(() => savedLibraryDraft.referenceRarity || 'all')
  const [referenceCardType, setReferenceCardType] = useState(() => savedLibraryDraft.referenceCardType || 'all')
  const [referenceColor, setReferenceColor] = useState(() => savedLibraryDraft.referenceColor || 'all')
  const [referenceVariant, setReferenceVariant] = useState(() => savedLibraryDraft.referenceVariant || 'all')
  const [referenceImageStatus, setReferenceImageStatus] = useState(() => savedLibraryDraft.referenceImageStatus || 'all')
  const [failedReferenceIds, setFailedReferenceIds] = useState([])
  const [loadedReferenceIds, setLoadedReferenceIds] = useState([])
  const [referenceImageIndexes, setReferenceImageIndexes] = useState({})
  const [matrixRunning, setMatrixRunning] = useState(false)
  const [auditSessions, setAuditSessions] = useState(() => readPersistentDraft(user?.id, 'image-audit-sessions', {
    en: { status: 'idle', results: [], total: 0, completed: 0, retryCount: 0, history: [], lastRunAt: null },
    jp: { status: 'idle', results: [], total: 0, completed: 0, retryCount: 0, history: [], lastRunAt: null },
  }))
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [matrixReport, setMatrixReport] = useState(() => savedLibraryDraft.matrixReport || null)
  const [matrixResults, setMatrixResults] = useState(() => savedLibraryDraft.matrixResults || [])
  const [matrixError, setMatrixError] = useState('')
  const [donSetSelections, setDonSetSelections] = useState(() => savedLibraryDraft.donSetSelections || {})
  const [donSetSaving, setDonSetSaving] = useState('')
  const [donSetError, setDonSetError] = useState('')
  const [donSetNotice, setDonSetNotice] = useState('')

  const loadImages = useCallback(async () => {
    const requestId = ++imageListRequestId.current
    setLoading(true); setError('')
    try {
      const loadedImages = await listLibraryPhotos(user.id)
      if (requestId === imageListRequestId.current) setImages(loadedImages)
    } catch (loadError) {
      if (requestId === imageListRequestId.current) setError(loadError.message)
    } finally {
      if (requestId === imageListRequestId.current) setLoading(false)
    }
  }, [user.id])
  useEffect(() => {
    let active = true
    loadAdminLibraryFileDraft(user?.id)
      .then((restoredFiles) => {
        if (active) {
          setFiles(restoredFiles)
          setFileDraftWritable(true)
          setFilesRestored(true)
        }
      })
      .catch((restoreError) => {
        if (active) {
          setFileDraftError(restoreError.message || 'The saved image upload queue could not be restored.')
          setFilesRestored(true)
        }
      })
    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !filesRestored || !fileDraftWritable) return undefined
    let active = true
    const save = () => {
      saveAdminLibraryFileDraft(user.id, files)
        .then(() => { if (active) setFileDraftError('') })
        .catch((saveError) => { if (active) setFileDraftError(saveError.message || 'The image upload queue could not be saved on this device.') })
    }
    save()
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', flushWhenHidden)
    window.addEventListener('pagehide', save)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', flushWhenHidden)
      window.removeEventListener('pagehide', save)
    }
  }, [user?.id, files, filesRestored, fileDraftWritable])

  useEffect(() => {
    if (!user?.id) return
    savePersistentDraft(user.id, 'image-library', {
      referenceQuery, referenceCardNumber, referenceSort, referenceLanguage, referenceSet, referenceCardNumberSet, referenceRarity, referenceCardType,
      referenceColor, referenceVariant, referenceImageStatus, donSetSelections, matrixReport, matrixResults,
    })
  }, [user?.id, referenceQuery, referenceCardNumber, referenceSort, referenceLanguage, referenceSet, referenceCardNumberSet, referenceRarity, referenceCardType, referenceColor, referenceVariant, referenceImageStatus, donSetSelections, matrixReport, matrixResults])

  useEffect(() => {
    loadImages()
    return () => { imageListRequestId.current += 1 }
  }, [loadImages])
  const loadCoverageReport = async () => {
    if (coverage || coverageLoading) return
    setCoverageLoading(true)
    setCoverageError('')
    try {
      setCoverage(await getCatalogueCoverageReport())
    } catch (loadError) {
      setCoverageError(loadError.message || 'Could not load catalogue coverage.')
    } finally {
      setCoverageLoading(false)
    }
  }

  const loadReferenceImages = useCallback(async (offset = 0) => {
    const requestId = ++referenceRequestId.current
    setReferenceLoading(true); setReferenceError('')
    // Clear the previous result set immediately when filters change. Otherwise
    // old cards remain visible under the new filter controls while the request
    // is pending, which looks like a filter mismatch.
    if (offset === 0) {
      setReferenceImages([])
      setReferenceTotal(0)
      setReferenceNextOffset(0)
      setFailedReferenceIds([])
      setLoadedReferenceIds([])
      setReferenceImageIndexes({})
    }
    try {
      const page = await getCatalogueImageGallery({
        offset, limit: 24, query: referenceQuery, cardNumber: referenceCardNumber, sortBy: referenceSort,
        language: referenceLanguage, set: referenceSet, cardNumberSet: referenceCardNumberSet, rarity: referenceRarity, cardType: referenceCardType,
        color: referenceColor, variant: referenceVariant, imageStatus: referenceImageStatus,
      })
      if (requestId !== referenceRequestId.current) return
      setReferenceImages((current) => {
        const combined = offset === 0 ? page.items : [...current, ...page.items]
        // Pagination can overlap if the underlying catalogue changes between
        // requests. Keep the first occurrence of each stable gallery entry ID.
        return [...new Map(combined.map((item) => [item.id, item])).values()]
      })
      setReferenceFilterOptions(page.filters || { languages: [], sets: [], cardNumberSets: [], rarities: [], cardTypes: [], colors: [], variants: [] })
      setReferenceTotal(page.total)
      setReferenceNextOffset(page.nextOffset)
    } catch (loadError) {
      if (requestId === referenceRequestId.current) setReferenceError(loadError.message)
    } finally {
      if (requestId === referenceRequestId.current) setReferenceLoading(false)
    }
  }, [referenceQuery, referenceCardNumber, referenceSort, referenceLanguage, referenceSet, referenceCardNumberSet, referenceRarity, referenceCardType, referenceColor, referenceVariant, referenceImageStatus])
  useEffect(() => {
    loadReferenceImages(0)
    return () => { referenceRequestId.current += 1 }
  }, [loadReferenceImages])

  const runReferenceMatrixCheck = async (language) => {
    if (matrixCheckLock.current) return
    matrixCheckLock.current = true
    setMatrixRunning(true); setMatrixError(''); setMatrixReport(null); setMatrixResults([])
    try {
      const inventory = await getCatalogueImageAuditInventory(language)
      setMatrixReport({ ...inventory, expectedTotal: inventory.total, missingSlots: [] })
      const checked = await mapWithConcurrency(inventory.records, 4, async (item) => auditCatalogueImageRecord({
        ...item,
        imageCandidates: item.imageUrl ? [{ url: item.imageUrl, kind: 'exact' }] : [],
      }, { language, attempts: 2, timeoutMs: 10000, retryDelayMs: 400 }))
      setMatrixResults(checked)
    } catch (checkError) {
      setMatrixError(checkError.message || 'Could not build the complete catalogue image audit.')
    } finally {
      matrixCheckLock.current = false
      setMatrixRunning(false)
    }
  }

  const saveDonSet = async (item) => {
    if (donSetSaveLock.current) return
    const setCode = donSetSelections[item.id] || (item.setCode && item.setCode !== 'DON!!' ? item.setCode : '')
    if (!setCode) { setDonSetError('Choose the source set for this DON!! printing first.'); return }
    donSetSaveLock.current = true
    setDonSetSaving(item.id); setDonSetError(''); setDonSetNotice('')
    try {
      await saveDonCardSetOverride({
        printingKey: item.printingKey,
        language: item.language,
        setCode,
        userId: user?.id,
        sourceNote: 'Manually assigned after checking Bandai DON!! reference list',
      })
      setDonSetNotice(`Saved ${item.cardNumber} as ${setCode}.`)
      await loadReferenceImages(0)
    } catch (saveError) {
      setDonSetError(saveError.message || 'Could not save the DON!! source-set assignment.')
    } finally {
      donSetSaveLock.current = false
      setDonSetSaving('')
    }
  }

  const chooseFiles = (fileList) => {
    if (uploadLock.current) { setError('Wait for the current upload to finish before adding more files.'); return }
    const allSelected = [...fileList]
    const selected = allSelected.filter((file) => file.type.startsWith('image/'))
    const rejectedCount = allSelected.length - selected.length
    const remaining = Math.max(0, 30 - files.length)
    const accepted = selected.slice(0, remaining)
    setFiles((current) => [...current, ...accepted])
    const messages = []
    if (rejectedCount) messages.push(`${rejectedCount} non-image file${rejectedCount === 1 ? ' was' : 's were'} skipped.`)
    if (selected.length > remaining) messages.push('The image library accepts up to 30 files per upload batch; extra images were skipped.')
    setError(messages.join(' '))
    setNotice(accepted.length ? `${accepted.length} image${accepted.length === 1 ? '' : 's'} ready to upload.` : '')
  }
  const upload = async () => {
    if (!files.length || uploadLock.current) return
    uploadLock.current = true
    setBusy(true); setError(''); setNotice('')
    try {
      const saved = await uploadLibraryPhotos({ userId: user.id, files })
      setFiles((current) => current.filter((file) => !files.includes(file)))
      setNotice(`${saved.length} image${saved.length === 1 ? '' : 's'} saved to your image library.`)
      await loadImages()
    } catch (uploadError) { setError(uploadError.message) }
    finally { uploadLock.current = false; setBusy(false) }
  }
  const removeImage = async (image) => {
    if (deleteLock.current) return
    if (!window.confirm('Delete this image from the library?')) return
    deleteLock.current = true
    setDeletingPath(image.path); setError(''); setNotice('')
    try {
      await deleteLibraryPhoto(image.path)
      setImages((current) => current.filter((entry) => entry.path !== image.path))
      setNotice('Image deleted from the library.')
    } catch (deleteError) { setError(deleteError.message) }
    finally { deleteLock.current = false; setDeletingPath('') }
  }

  return (
    <section className="admin-view image-library-panel">
      <div className="admin-view-heading">
        <div><p className="eyebrow"><ImagePlus size={14} /> IMAGE LIBRARY</p><h2>Your image library.</h2>
          <p>Upload and reuse your own card photographs. Your saved images stay separate from catalogue reference artwork and are only added to a product when you choose.</p></div>
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
      {fileDraftError && <div className="error-notice"><ShieldAlert size={15} /><span>{fileDraftError}</span></div>}
      {!filesRestored && <p className="admin-muted">Restoring the saved image upload queue…</p>}
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={15} /><span>{notice}</span></div>}
      <div className="photo-studio__heading"><div><p className="eyebrow">SAVED PHOTOGRAPHS</p><h3>{images.length} image{images.length === 1 ? '' : 's'} in storage</h3></div></div>
      {loading ? <div className="loading-state">Loading image library…</div> : images.length ? (
        <div className="photo-grid image-library-grid">{images.map((image) => <article className="photo-card" key={image.path}>
          <div className="photo-card__preview"><img src={image.url} alt="Saved card photograph" loading="lazy" /></div>
          <div className="photo-card__body"><span className="photo-card__name" title={image.name}>{image.name}</span>
            <button className="button button--danger" type="button" disabled={Boolean(deletingPath)} onClick={() => removeImage(image)}><Trash2 size={14} /> {deletingPath === image.path ? 'Deleting…' : 'Delete image'}</button></div>
        </article>)}</div>
      ) : <div className="empty-catalogue"><ImagePlus size={24} /><h3>Your image library is empty.</h3><p>Upload card photographs above and they will be kept here for future card entries.</p></div>}
      <details className="image-library-disclosure image-library-diagnostics" onToggle={(event) => { if (event.currentTarget.open) loadCoverageReport() }}>
        <summary>
          <span className="image-library-disclosure__copy">
            <strong>Advanced catalogue health</strong>
            <small>Optional maintenance report: source freshness, set coverage and image-source gaps. It does not affect uploads or stock.</small>
          </span>
          <span className="image-library-disclosure__meta">Advanced details <span aria-hidden="true">⌄</span></span>
        </summary>
        <section className="catalogue-health-panel">
          <div className="photo-studio__heading"><div><p className="eyebrow">REFERENCE CATALOGUE</p><h3>Catalogue source health</h3></div></div>
          <p className="muted-copy">This report describes metadata in the source feed; it is not a live test of every image file. Actual image loading is counted in the reference gallery.</p>
          <div className="catalogue-health-unassigned">
            <h4>Complete available catalogue image audit</h4>
            <p className="muted-copy">Runs independently for the selected language across every available gallery catalogue entry, including records without image URLs. These totals describe discovered catalogue records, not authoritative expected set coverage. This first pass verifies each record's primary image reference; alternate/base fallback verification is a separate follow-up.</p>
            <div className="catalogue-reference-actions">
              <button className="button button--outline" type="button" disabled={matrixRunning} onClick={() => runReferenceMatrixCheck('en')}>{matrixRunning ? 'Auditing…' : 'Run English audit'}</button>
              <button className="button button--outline" type="button" disabled={matrixRunning} onClick={() => runReferenceMatrixCheck('jp')}>{matrixRunning ? 'Auditing…' : 'Run Japanese audit'}</button>
            </div>
            <div className="catalogue-reference-actions">
              {['en', 'jp'].map((language) => {
                const session = auditSessions[language] || {}
                const label = language === 'en' ? 'English' : 'Japanese'
                const counts = buildImageAuditSummary(session.results || [], session.total || 0).counts
                return <div className="catalogue-health-unassigned" key={language}>
                  <strong>{label} audit · {session.status || 'idle'}</strong>
                  <p className="muted-copy">{session.completed || 0}/{session.total || 0} completed · {Math.max(0, (session.total || 0) - (session.completed || 0))} remaining · {session.retryCount || 0} retries · last run {session.lastRunAt ? new Date(session.lastRunAt).toLocaleString() : 'never'}</p>
                  <p className="muted-copy">Exact {counts[IMAGE_CHECK_STATUS.EXACT_LOADED] || 0} · Alternative {counts[IMAGE_CHECK_STATUS.ALTERNATIVE_LOADED] || 0} · Base fallback {counts[IMAGE_CHECK_STATUS.BASE_FALLBACK_LOADED] || 0} · Missing {counts[IMAGE_CHECK_STATUS.MISSING] || 0} · Temporary {counts[IMAGE_CHECK_STATUS.TEMPORARY_FAILURE] || 0} · Timeouts {counts[IMAGE_CHECK_STATUS.TIMEOUT] || 0} · Invalid {counts[IMAGE_CHECK_STATUS.INVALID_URL] || 0} · No reference {counts[IMAGE_CHECK_STATUS.NO_REFERENCE] || 0}</p>
                  <div className="catalogue-reference-actions">
                    <button className="button button--outline" type="button" disabled={matrixRunning} onClick={() => runReferenceMatrixCheck(language)}>{session.results?.length ? 'Restart ' + label : 'Start ' + label}</button>
                    {session.status === 'running' && <button className="button button--outline" type="button" onClick={() => pauseReferenceAudit(language)}>Pause</button>}
                    {(session.status === 'paused' || session.status === 'error') && <button className="button button--outline" type="button" onClick={() => resumeReferenceAudit(language)}>Resume</button>}
                  </div>
                </div>
              })}
            </div>
            {matrixError && <p className="form-error">{matrixError}</p>}
            {matrixReport && (() => {
              const summary = buildImageAuditSummary([
                ...matrixResults.map((item) => ({
                  status: item.status === 'loaded' ? IMAGE_CHECK_STATUS.EXACT_LOADED
                    : item.status === 'fallback-loaded' ? IMAGE_CHECK_STATUS.FALLBACK_LOADED
                      : item.status === 'failed' ? IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
                        : item.status === 'missing-url' ? IMAGE_CHECK_STATUS.MISSING
                          : item.status,
                })),
                ...matrixReport.missingSlots.map(() => ({ status: IMAGE_CHECK_STATUS.MISSING })),
              ], matrixReport.expectedTotal)
              return <p className="muted-copy">
                {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.EXACT_LOADED).length} exact loaded · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.ALTERNATIVE_LOADED).length} alternative loaded · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.BASE_FALLBACK_LOADED).length} base fallback loaded · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.MISSING).length} confirmed missing · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.TEMPORARY_FAILURE).length} temporary failures · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.TIMEOUT).length} timed out · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.INVALID_URL).length} invalid URLs · {matrixResults.filter((item) => item.status === IMAGE_CHECK_STATUS.NO_REFERENCE).length} no image reference · {summary.remaining} unchecked ({matrixReport.expectedTotal} discovered records; {matrixReport.language.toUpperCase()}).
              </p>
            })()}
            {matrixReport && <details className="catalogue-health-missing">
              <summary>View image-by-image results ({matrixResults.length})</summary>
              <div className="catalogue-health-table">
                {matrixResults.map((item) => <div className="catalogue-health-row" key={item.id}><strong>{item.setCode || 'Unassigned'} · {item.cardNumber || 'No card number'}</strong><span>{item.languageCode?.toUpperCase() || matrixReport.language.toUpperCase()}</span><span>{item.status}{item.httpStatus ? ' · HTTP ' + item.httpStatus : ''}{item.upstreamStatus ? ' · upstream ' + item.upstreamStatus : ''}{item.proxyError ? ' · ' + item.proxyError : ''}{item.checkedAt ? ' · checked ' + new Date(item.checkedAt).toLocaleString() : ''} · {item.source || 'No image source'}</span></div>)}
              </div>
            </details>}
          </div>
          {coverageError && <div className="error-notice"><ShieldAlert size={15} /><span>{coverageError}</span></div>}
          {coverageLoading && <div className="loading-state">Loading source coverage…</div>}
          {coverage && <>
            <div className="overview-metrics">
              <article className="overview-metric"><strong>{coverage.cards.toLocaleString()}</strong><span>Card records</span></article>
              <article className="overview-metric"><strong>{coverage.printings.toLocaleString()}</strong><span>Printings / variants</span></article>
              <article className="overview-metric"><strong>{coverage.withOfficialImage.toLocaleString()}</strong><span>Exact official image locators</span></article>
              <article className="overview-metric"><strong>{coverage.withFallbackImage?.toLocaleString() || 0}</strong><span>Base image fallbacks</span></article>
              <article className="overview-metric"><strong>{coverage.withoutImageLocator.toLocaleString()}</strong><span>Missing source locators</span></article>
            </div>
            <p className="muted-copy">Source snapshot: {coverage.sourceGeneratedAt ? new Date(coverage.sourceGeneratedAt).toLocaleDateString() : 'date unavailable'} · {coverage.sourceAgeDays ?? 'unknown'} days old. Feed coverage is not the same as live image availability.</p>
            <p className="muted-copy">Image references in feed: English {coverage.languages.en?.withImage || 0}/{coverage.languages.en?.printings || 0} · Japanese {coverage.languages.jp?.withImage || 0}/{coverage.languages.jp?.printings || 0} · Chinese (CN) {coverage.languages.cn?.withImage || 0}/{coverage.languages.cn?.printings || 0}.</p>
            <div className="catalogue-health-unassigned">
              <strong>Catalogue record completeness is not yet proven.</strong>
              <p className="muted-copy">{coverage.expectedCoverage?.note || 'Set totals below count discovered feed rows only; independent expected-card inventories are required to identify catalogue records missing from the feed.'}</p>
              <p className="muted-copy">Discovered feed rows: {Object.entries(coverage.expectedCoverage?.availableFeedRecordsBySet || {}).sort(([a], [b]) => a.localeCompare(b)).map(([setCode, count]) => setCode + ' ' + count).join(' · ') || 'Not available'}</p>
              <p className="muted-copy">Missing catalogue records: not measurable without authoritative expected-card and printing inventories. Missing image references for records found in the feed are counted separately below.</p>
            </div>
            {coverage.sourceIsStale && <div className="catalogue-health-unassigned"><strong>Metadata feed is stale.</strong><p className="muted-copy">The Koala Kollect snapshot has not refreshed for more than seven days. Bandai's live card list may contain newer entries.</p></div>}
            <details className="catalogue-health-missing">
              <summary>Set-by-set totals ({Object.keys(coverage.sets).length} sets)</summary>
              <div className="catalogue-health-table">
                {Object.entries(coverage.sets).sort(([a], [b]) => a.localeCompare(b)).map(([code, stats]) => (
                  <div className="catalogue-health-row" key={code}><strong>{code}</strong><span>{stats.printings} printings</span><span>{stats.withImage} references · {stats.withoutImage} missing · {stats.withFallbackImage || 0} fallback</span></div>
                ))}
              </div>
            </details>
            <details className="catalogue-health-missing">
              <summary>Missing source-image samples ({coverage.missingImageTotal?.toLocaleString() || 0} total; first {coverage.missingImageSamples?.length || 0})</summary>
              <p className="muted-copy">These records have no image locator in the metadata snapshot. A fallback source may still display artwork in the gallery.</p>
              {coverage.missingImageSamples?.length > 0 ? <div className="catalogue-health-table">
                {coverage.missingImageSamples.map((item) => (
                  <div className="catalogue-health-row" key={item.printingKey}>
                    <strong>{item.cardNumber || 'No card number'}</strong>
                    <span>{item.language.toUpperCase()} · {item.sourceSite}</span>
                    <span>{[item.rarity, item.variant].filter(Boolean).join(' / ') || 'Not supplied'} · {item.setCode || item.numberPrefixHint || 'Unassigned'}</span>
                  </div>
                ))}
              </div> : <p className="muted-copy">No source-image locator gaps were recorded.</p>}
            </details>
          </>}
        </section>
      </details>
      <details className="image-library-disclosure image-library-reference" open>
        <summary>
          <span className="image-library-disclosure__copy">
            <strong>Card reference library</strong>
            <small>Browse base cards, alternate printings, stamped prints and DON!! artwork. Your uploaded stock photos remain separate.</small>
          </span>
          <span className="image-library-disclosure__meta">{referenceTotal.toLocaleString()} references <span aria-hidden="true">⌄</span></span>
        </summary>
        <section className="catalogue-reference-gallery">
          <div className="photo-studio__heading">
            <div>
              <p className="eyebrow">SEARCH AND BROWSE</p>
              <h3>{referenceImages.length.toLocaleString()} of {referenceTotal.toLocaleString()} matching printings</h3>
              <p className="muted-copy">The release set identifies the product that contained a printing; the card-number set identifies the original set encoded in its card number. Special and parallel reprints can appear in a newer release while retaining an older card number. Filter both separately.</p>
            </div>
          </div>
          <p className="muted-copy">Displayed in this page: {loadedReferenceIds.length} images loaded · {failedReferenceIds.length} image URLs failed.</p>
          {failedReferenceIds.length > 0 && <button className="button button--outline" type="button" onClick={() => { setFailedReferenceIds([]); setLoadedReferenceIds([]); setReferenceImageIndexes({}) }}>Retry failed reference images</button>}
          <div className="catalogue-reference-filters catalogue-reference-filters--extended">
            <label className="form-field">
              <span>Search card name</span>
              <input type="search" value={referenceQuery} onChange={(event) => setReferenceQuery(event.target.value)} placeholder="Edward.Newgate or Karoo" />
            </label>
            <label className="form-field">
              <span>Card number</span>
              <input type="search" value={referenceCardNumber} onChange={(event) => setReferenceCardNumber(event.target.value)} placeholder="OP18-001" />
            </label>
            <label className="form-field">
              <span>Release set / product</span>
              <select value={referenceSet} onChange={(event) => setReferenceSet(event.target.value)}>
                <option value="all">All release sets</option>
                {referenceFilterOptions.sets.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Card-number set</span>
              <select value={referenceCardNumberSet} onChange={(event) => setReferenceCardNumberSet(event.target.value)}>
                <option value="all">All card-number sets</option>
                {(referenceFilterOptions.cardNumberSets || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Language / source</span>
              <select value={referenceLanguage} onChange={(event) => setReferenceLanguage(event.target.value)}>
                <option value="all">All languages</option>
                {referenceFilterOptions.languages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Rarity</span>
              <select value={referenceRarity} onChange={(event) => setReferenceRarity(event.target.value)}>
                <option value="all">All rarities</option>
                {referenceFilterOptions.rarities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Card type</span>
              <select value={referenceCardType} onChange={(event) => setReferenceCardType(event.target.value)}>
                <option value="all">All card types</option>
                {referenceFilterOptions.cardTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Colour</span>
              <select value={referenceColor} onChange={(event) => setReferenceColor(event.target.value)}>
                <option value="all">All colours</option>
                {referenceFilterOptions.colors.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Printing / variant</span>
              <select value={referenceVariant} onChange={(event) => setReferenceVariant(event.target.value)}>
                <option value="all">All variants</option>
                {referenceFilterOptions.variants.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Sort by card number</span>
              <select value={referenceSort} onChange={(event) => setReferenceSort(event.target.value)}>
                <option value="card-number-asc">Ascending (A–Z / 001–119)</option>
                <option value="card-number-desc">Descending (Z–A / 119–001)</option>
              </select>
            </label>
            <label className="form-field">
              <span>Image status</span>
              <select value={referenceImageStatus} onChange={(event) => setReferenceImageStatus(event.target.value)}>
                <option value="all">All image states</option>
                <option value="available">Has image reference</option>
                <option value="fallback">Base / alternate fallback</option>
                <option value="missing">Missing image reference</option>
              </select>
            </label>
          </div>
          <div className="catalogue-reference-actions">
            <button className="button button--quiet" type="button" onClick={() => {
              // Invalidate any in-flight page before resetting every filter.
              referenceRequestId.current += 1
              setReferenceQuery('')
              setReferenceCardNumber('')
              setReferenceSort('card-number-asc')
              setReferenceLanguage('all')
              setReferenceSet('all')
              setReferenceCardNumberSet('all')
              setReferenceRarity('all')
              setReferenceCardType('all')
              setReferenceColor('all')
              setReferenceVariant('all')
              setReferenceImageStatus('all')
              setReferenceImages([])
              setReferenceTotal(0)
              setReferenceNextOffset(0)
              setFailedReferenceIds([])
              setLoadedReferenceIds([])
              setReferenceImageIndexes({})
              setReferenceError('')
            }}>Clear all filters</button>
            <a className="muted-copy" href="https://en.onepiece-cardgame.com/cardlist/" target="_blank" rel="noopener noreferrer">Open Bandai’s full official card list ↗</a>
          </div>
          {donSetError && <div className="error-notice"><ShieldAlert size={15} /><span>{donSetError}</span></div>}
          {donSetNotice && <div className="success-notice"><Check size={15} /><span>{donSetNotice}</span></div>}
          {referenceError && <div className="error-notice"><ShieldAlert size={15} /><span>{referenceError}</span></div>}
          {referenceImages.length > 0 && <div className="photo-grid image-library-grid catalogue-reference-grid">
            {referenceImages.map((item) => {
              const candidates = item.imageUrls?.length ? item.imageUrls : [item.imageUrl, item.fallbackImageUrl].filter(Boolean)
              const imageIndex = referenceImageIndexes[item.id] || 0
              const currentImage = candidates[imageIndex]
              const isFailed = failedReferenceIds.includes(item.id)
              return <article className="photo-card" key={item.id}>
                <div className="photo-card__preview">
                  {currentImage && !isFailed ? <img
                    key={item.id + ':' + imageIndex}
                    src={currentImage}
                    alt={item.name ? item.name + ' ' + item.cardNumber : 'One Piece card ' + item.cardNumber}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={() => {
                      setLoadedReferenceIds((current) => current.includes(item.id) ? current : [...current, item.id])
                      setFailedReferenceIds((current) => current.filter((id) => id !== item.id))
                    }}
                    onError={() => {
                      if (imageIndex + 1 < candidates.length) {
                        setReferenceImageIndexes((current) => ({ ...current, [item.id]: imageIndex + 1 }))
                      } else {
                        setLoadedReferenceIds((current) => current.filter((id) => id !== item.id))
                        setFailedReferenceIds((current) => current.includes(item.id) ? current : [...current, item.id])
                      }
                    }}
                  /> : <div className="empty-catalogue"><ImagePlus size={20} /><span>{isFailed ? 'All image sources failed' : 'No image reference yet'}</span></div>}
                </div>
                <div className="photo-card__body">
                  {item.cardNumber && item.cardNumber !== 'DON!!' && <span className="catalogue-card-number">CARD NO. {item.cardNumber}</span>}
                  <span className="photo-card__name" title={item.name || item.sourceText}>{item.name || item.sourceText || item.cardNumber || 'Unknown card'}</span>
                  <span className="muted-copy">{item.language} · Release set {item.setCode || 'Unassigned'} · {item.rarity || 'Rarity not listed'} · {item.variant || 'Base'}</span>
                  {item.cardNumberSet && <span className="muted-copy">Card-number set {item.cardNumberSet}{item.cardNumberSet !== item.setCode ? ' · reprint / cross-set printing' : ''}</span>}
                  <span className="muted-copy">{item.imageStatus === 'missing' ? 'Missing source image' : item.imageStatus === 'fallback' ? 'Fallback image · confirm exact finish' : item.source || 'Catalogue reference'}</span>
                  <button
                    className="button button--outline catalogue-reference-add"
                    type="button"
                    disabled={!onAddCard || !item.cardNumber}
                    onClick={() => onAddCard({
                      ...item,
                      imageUrl: currentImage || item.imageUrl,
                      imageUrls: candidates,
                    })}
                  >
                    <PackagePlus size={14} /> Add card
                  </button>
                  {item.officialListUrl && <a className="muted-copy" href={item.officialListUrl} target="_blank" rel="noopener noreferrer">Official card list ↗</a>}
                  {item.isDon && <div className="catalogue-don-set-assignment">
                    <label className="form-field"><span>DON!! source set</span><select value={donSetSelections[item.id] ?? (item.setCode !== 'DON!!' ? item.setCode : '')} onChange={(event) => setDonSetSelections((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Choose source set…</option>{DON_SET_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
                    <button className="button button--outline" type="button" disabled={Boolean(donSetSaving)} onClick={() => saveDonSet(item)}>{donSetSaving === item.id ? 'Saving set…' : 'Save source set'}</button>
                    {item.setAssignmentSource && <span className="muted-copy">Set source: {item.setAssignmentSource}</span>}
                  </div>}
                </div>
              </article>
            })}
          </div>}
          {referenceNextOffset !== null && <button className="button button--outline" type="button" disabled={referenceLoading} onClick={() => loadReferenceImages(referenceNextOffset)}>{referenceLoading ? 'Loading references…' : 'Load more references'}</button>}
          {referenceLoading && referenceImages.length === 0 && <div className="loading-state">Loading card references…</div>}
          {!referenceLoading && referenceImages.length === 0 && !referenceError && <p className="muted-copy">No catalogue entries match those filters. Clear a filter or try a card number.</p>}
        </section>
      </details>

    </section>
  )
}