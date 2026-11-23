import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, LoaderCircle, ScanLine } from 'lucide-react'
import { CARD_FIELDS, parseCardDetails } from './cardParser'
import { rankCatalogueMatches } from './cardMatchRanking'
import { findCatalogueMatches, catalogueMatchToForm, collectrSearchUrl } from './cardCatalogue'
import { mergeCatalogueScannerFields } from './productSchema'
import CatalogueReferenceImage from './CatalogueReferenceImage'
import { findRememberedCardImage, findSharedRememberedCardImage, rememberVerifiedCardImage } from './cardRecognitionMemory'
import { prepareCardNumberRegions, prepareManualCardCropFile } from './cardNumberRegion'
import { extractCardNumberCandidates } from './cardNumberCandidates'

const confidenceLabel = (field) => {
  if (!field.value) return 'Not detected'
  if (field.confidence >= 82) return 'High confidence'
  if (field.confidence >= 60) return 'Review'
  return 'Low confidence'
}

export default function CardScanner({
  photos,
  fields,
  setFields,
  rawText,
  setRawText,
  onContinue,
}) {
  const [recognitionLanguage, setRecognitionLanguage] = useState('eng')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [catalogueMatches, setCatalogueMatches] = useState([])
  const [autoMatches, setAutoMatches] = useState([])
  const [autoMatchStatus, setAutoMatchStatus] = useState('')
  const [matchConfirmationOpen, setMatchConfirmationOpen] = useState(false)
  const [selectedAutoMatchId, setSelectedAutoMatchId] = useState('')
  const [rankedAutoMatches, setRankedAutoMatches] = useState([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueError, setCatalogueError] = useState('')
  const [manualCardNumber, setManualCardNumber] = useState('')
  const [manualMatches, setManualMatches] = useState([])
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState('')
  const [numberReadings, setNumberReadings] = useState([])
  const [numberCandidates, setNumberCandidates] = useState([])
  const [manualCropEnabled, setManualCropEnabled] = useState(false)
  const [manualCropConfirmed, setManualCropConfirmed] = useState(false)
  const [manualCropConfirmedForFile, setManualCropConfirmedForFile] = useState(null)
  const [manualCropSelectionMade, setManualCropSelectionMade] = useState(false)
  const [manualCropPercent, setManualCropPercent] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const cropPreviewRef = useRef(null)
  const cropDragRef = useRef(null)

  const frontPhoto = photos.find((photo) => photo.role === 'front') || photos[0]
  const hasReview =
    Object.values(fields).some((field) => field.value) || Boolean(rawText.trim())
  const manualCropGeometryIsValid = (
    Number(manualCropPercent.x) >= 0 &&
    Number(manualCropPercent.y) >= 0 &&
    Number(manualCropPercent.width) >= 12 &&
    Number(manualCropPercent.height) >= 12 &&
    Number(manualCropPercent.x) + Number(manualCropPercent.width) <= 100 &&
    Number(manualCropPercent.y) + Number(manualCropPercent.height) <= 100
  )
  const manualCropIsValid = manualCropEnabled && manualCropGeometryIsValid
  const manualCropReady = manualCropIsValid && manualCropSelectionMade && manualCropConfirmed && manualCropConfirmedForFile === frontPhoto?.file

  const clearCropConfirmation = () => {
    setManualCropConfirmed(false)
    setManualCropConfirmedForFile(null)
  }

  useEffect(() => {
    setManualCropPercent({ x: 0, y: 0, width: 100, height: 100 })
    setManualCropConfirmed(false)
    setManualCropConfirmedForFile(null)
    setManualCropSelectionMade(false)
  }, [frontPhoto?.file])

  const updateField = (key, value) => {
    setFields((current) => ({
      ...current,
      [key]: {
        ...current[key],
        value,
        needsReview: true,
        confidence: current[key]?.confidence || 0,
      },
    }))
  }

  const updateCropFromPointer = (event, finish = false) => {
    const bounds = cropPreviewRef.current?.getBoundingClientRect()
    const start = cropDragRef.current
    if (!bounds || bounds.width <= 0 || bounds.height <= 0 || !start) return
    const current = {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)
    setManualCropPercent({ x: x * 100, y: y * 100, width: width * 100, height: height * 100 })
    clearCropConfirmation()
    if (finish) {
      cropDragRef.current = null
      setManualCropSelectionMade(true)
    }
  }

  const startCropSelection = (event) => {
    if (scanning || !manualCropEnabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const bounds = cropPreviewRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return
    cropDragRef.current = {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
    clearCropConfirmation()
    setManualCropSelectionMade(false)
    setManualCropPercent({ x: cropDragRef.current.x * 100, y: cropDragRef.current.y * 100, width: 0, height: 0 })
  }

  const scanCard = async () => {
    if (!frontPhoto) {
      setError('Add a card-front photograph in the photo panel before scanning.')
      return
    }
    if (!manualCropReady) {
      setError('Enable the card crop, select the full card inside the photo, and confirm that the crop is correct before scanning.')
      setStatus('')
      return
    }

    let worker
    let rememberedImage = null
    let sharedRememberedImage = null
    setScanning(true)
    setError('')
    setStatus('Loading the free browser OCR engine…')
    setProgress(0)
    // Clear the previous scan's result panels immediately so a failed/new scan
    // cannot leave an old catalogue match looking like it belongs to this photo.
    setCatalogueMatches([])
    setAutoMatches([])
    setRankedAutoMatches([])
    setSelectedAutoMatchId('')
    setMatchConfirmationOpen(false)
    setAutoMatchStatus('')
    setCatalogueError('')
    setManualMatches([])
    setManualError('')
    setNumberReadings([])
    setNumberCandidates([])

    try {
      try {
        [rememberedImage, sharedRememberedImage] = await Promise.all([
          findRememberedCardImage(frontPhoto.file),
          findSharedRememberedCardImage(frontPhoto.file),
        ])
        if (rememberedImage || sharedRememberedImage) setStatus('Found a similar previously confirmed card image. Checking it against OCR…')
      } catch {
        // Recognition memory is an optional enhancement; OCR must still work if local storage is unavailable.
      }
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker(recognitionLanguage, 1, {
        logger: (message) => {
          if (typeof message.progress === 'number') {
            setProgress(Math.round(message.progress * 100))
          }
          if (message.status) setStatus(message.status)
        },
      })
      setStatus('Finding the card number: checking bottom edges in upright, sideways and rotated orientations…')
      const manualCrop = Object.fromEntries(Object.entries(manualCropPercent).map(([key, value]) => [key, Number(value) / 100]))
      const numberRegions = await prepareCardNumberRegions(frontPhoto.file, manualCrop, manualCropConfirmed)
      const numberResults = await Promise.all(numberRegions.map(async (region) => {
        const { data: regionData } = await worker.recognize(region.file, { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' }, { blocks: true })
        const lineConfidence = (regionData.lines || [])
          .map((line) => Number(line.confidence))
          .filter(Number.isFinite)
        return {
          label: region.label,
          text: regionData.text || '',
          confidence: Number.isFinite(Number(regionData.confidence))
            ? Number(regionData.confidence)
            : lineConfidence.length ? Math.max(...lineConfidence) : 0,
        }
      }))
      setNumberReadings(numberResults)
      const candidates = extractCardNumberCandidates(numberResults)
      setNumberCandidates(candidates)
      setStatus('Number-area scans complete. Checking the card photo for supporting details…')
      const fullCardScanFile = await prepareManualCardCropFile(frontPhoto.file, manualCrop, manualCropConfirmed)
      const { data } = await worker.recognize(fullCardScanFile, {}, { blocks: true })
      const lines =
        data.lines ||
        (data.blocks || []).flatMap((block) =>
          (block.paragraphs || []).flatMap((paragraph) => paragraph.lines || []),
        )
      const numberLines = numberResults.flatMap((result) =>
        result.text.split(/\r?\n/).filter(Boolean).map((text) => ({ text, confidence: result.confidence })),
      )
      const numberCandidateText = candidates[0]?.number || ''
      const combinedText = [numberCandidateText, ...numberResults.map((item) => item.text), data.text || ''].filter(Boolean).join('\n')
      const combinedLines = [
        ...(candidates[0] ? [{ text: candidates[0].number, confidence: candidates[0].confidence }] : []),
        ...numberResults.flatMap((item) => item.text.split(/\r?\n/).filter(Boolean).map((text) => ({ text, confidence: item.confidence }))),
        ...numberLines,
        ...lines,
      ]
      setRawText(combinedText)
      const parsed = parseCardDetails(combinedText, combinedLines, recognitionLanguage)
      setFields(parsed)
      setAutoMatches([])
      setRankedAutoMatches([])
      setSelectedAutoMatchId('')
      setMatchConfirmationOpen(false)
      setAutoMatchStatus('')
      const detectedNumbers = [...new Set([
        ...candidates.map((candidate) => candidate.number),
        parsed.card_number?.value,
        sharedRememberedImage?.cardNumber,
        rememberedImage?.cardNumber,
      ].filter(Boolean))].slice(0, 6)
      if (detectedNumbers.length) {
        setStatus('Checking the strongest OCR number readings against the English and Japanese catalogue…')
        try {
          const lookups = await Promise.all(detectedNumbers.map(async (cardNumber) => {
            try {
              return { cardNumber, matches: await findCatalogueMatches(cardNumber) }
            } catch (lookupError) {
              return { cardNumber, matches: [], error: lookupError.message }
            }
          }))
          const successfulLookups = lookups.filter((lookup) => lookup.matches.length)
          const allMatches = [...new Map(successfulLookups.flatMap((lookup) => lookup.matches).map((match) => [match.id, match])).values()]
          setAutoMatches(allMatches)
          if (allMatches.length) {
            const candidateByNumber = new Map(candidates.map((candidate) => [candidate.number, candidate]))
            const topResolvedNumber = successfulLookups[0].cardNumber
            // Only image-similarity memory may influence ranking. A card-number-only
            // saved choice can point to the wrong parallel/normal printing.
            let rememberedId = ''
            if (rememberedImage?.cardNumber === topResolvedNumber) rememberedId = rememberedImage.printingId
            if (sharedRememberedImage?.cardNumber === topResolvedNumber) rememberedId = sharedRememberedImage.printingId
            const numberEvidence = Object.fromEntries(candidates.map((candidate) => [candidate.number, { occurrences: candidate.occurrences, confidence: candidate.confidence, sources: candidate.sources }]))
            const ranked = rankCatalogueMatches(allMatches, parsed.name?.value, parsed.language?.value || recognitionLanguage, rememberedId, numberEvidence)
            const best = ranked[0]
            setRankedAutoMatches(ranked)
            setSelectedAutoMatchId(best.match.id)
            setMatchConfirmationOpen(true)
            const winningReading = candidateByNumber.get(best.match.cardNumber)
            const recoveredAlternate = candidates[0]?.number !== best.match.cardNumber
            setAutoMatchStatus((rememberedImage?.printingId === best.match.id || sharedRememberedImage?.printingId === best.match.id)
              ? (sharedRememberedImage?.printingId === best.match.id ? 'Shared recognition library match' : 'Previously confirmed local image') + ' (' + (sharedRememberedImage?.printingId === best.match.id ? sharedRememberedImage.similarity : rememberedImage.similarity) + '% visual similarity). Please confirm the card and variant.'
              : recoveredAlternate
                ? 'The first OCR number did not resolve, so the scanner recovered a catalogue match from another number reading. Compare the card number, name, language, set and variant before confirming.'
                : winningReading?.occurrences > 1
                  ? 'The card number was read repeatedly and matched the catalogue. Confirm the language, set and printing variant.'
                  : best.nameMatch && best.languageMatch
                    ? 'Strong match: card number, name and language agree.'
                    : best.nameMatch
                      ? 'Possible match: card number and name agree. Confirm language and set.'
                      : 'Possible match found by card number. Compare the name, language, set and variant manually.')
          } else {
            const failures = lookups.filter((lookup) => lookup.error)
            setAutoMatchStatus(failures.length === lookups.length
              ? 'Catalogue verification was unavailable: ' + failures[0]?.error
              : 'None of the OCR number readings matched the catalogue. Check the enlarged readings or search by card number manually.')
          }
        } catch (lookupError) {
          setAutoMatchStatus('Catalogue verification was unavailable: ' + lookupError.message)
        }
      }
      setStatus(combinedText.trim() ? 'Scan complete. Check every field before saving.' : 'No readable text found. Enter details manually or rescan.')
      setProgress(100)
    } catch (scanError) {
      setError(`OCR could not read this photograph: ${scanError.message}`)
      setStatus('')
    } finally {
      if (worker) {
        try {
          await worker.terminate()
        } catch (terminateError) {
          setError((current) =>
            current
              ? `${current} OCR cleanup also failed: ${terminateError.message}`
              : `OCR worker cleanup failed: ${terminateError.message}`,
          )
        }
      }
      setScanning(false)
    }
  }

  const lookupCatalogue = async () => {
    const cardNumber = fields.card_number?.value
    if (!cardNumber) return
    setCatalogueLoading(true)
    setCatalogueError('')
    setCatalogueMatches([])
    try {
      const matches = await findCatalogueMatches(cardNumber)
      setCatalogueMatches(matches)
      if (!matches.length) setCatalogueError('No catalogue match found for this card number. You can still enter the details manually.')
    } catch (lookupError) {
      setCatalogueError('Catalogue lookup failed: ' + lookupError.message)
    } finally {
      setCatalogueLoading(false)
    }
  }

  const searchByCardNumber = async (event) => {
    event.preventDefault()
    const cardNumber = manualCardNumber.trim()
    if (!cardNumber) {
      setManualError('Enter a card number, for example OP01-001.')
      return
    }
    setManualLoading(true)
    setManualError('')
    setManualMatches([])
    try {
      const matches = await findCatalogueMatches(cardNumber)
      setManualMatches(matches)
      if (!matches.length) setManualError('No catalogue match found. Check the card number or enter the details manually.')
    } catch (lookupError) {
      setManualError('Card-number search failed: ' + lookupError.message)
    } finally {
      setManualLoading(false)
    }
  }

  const applyCatalogueMatch = (match) => {
    const values = catalogueMatchToForm(match)
    setFields((current) => ({
      ...current,
      ...mergeCatalogueScannerFields(current, values),
    }))
    setStatus('Catalogue details filled in. Check each value against the physical card before saving.')
  }

  const selectedAutoMatch = rankedAutoMatches.find((item) => item.match.id === selectedAutoMatchId)?.match
  const sameNumberVariants = new Set(rankedAutoMatches.map(({ match }) => [match.cardNumber, match.languageCode, match.setCode, match.variantLabel || match.variant || match.rarity].join('|'))).size

  const confirmAutoMatch = async () => {
    if (selectedAutoMatch) {
      applyCatalogueMatch(selectedAutoMatch)
      setMatchConfirmationOpen(false)
      let memoryMessage = ''
      if (frontPhoto?.file) {
        try {
          const result = await rememberVerifiedCardImage(frontPhoto.file, selectedAutoMatch)
          memoryMessage = result.shared?.saved
            ? ' Reference saved to the shared recognition library.' + (result.localError ? ' Browser-local copy unavailable: ' + result.localError : ' Also saved on this browser.')
            : result.shared?.error
              ? (result.localError ? ' Reference could not be saved: ' + result.localError : ' Saved on this browser; shared library upload failed: ' + result.shared.error)
              : result.shared?.reason
                ? (result.localError ? ' Recognition memory unavailable: ' + result.localError : ' Saved on this browser only. ' + result.shared.reason)
                : result.duplicate ? ' Existing reference refreshed.' : ' Reference image added to this browser’s recognition library.'
        } catch {
          memoryMessage = ' The card was confirmed, but its reference image could not be saved on this browser.'
        }
      }
      setStatus('Confirmed card match. Catalogue details filled in—review them before saving.' + memoryMessage)
    }
  }

  const reparseText = () => {
    setFields(parseCardDetails(rawText, [], recognitionLanguage))
    setStatus('Fields extracted from the edited OCR text. Verify them before continuing.')
  }

  return (
    <section className="scanner-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow"><ScanLine size={14} /> CARD SCANNER · BROWSER OCR</p>
          <h2>Read the card.<br /><em>Verify every detail.</em></h2>
          <p>OCR runs in your browser using Tesseract.js. Missing or uncertain values stay blank for manual review.</p>
        </div>
        <label className="form-field scanner-language">
          <span>Recognition language</span>
          <select value={recognitionLanguage} disabled={scanning} onChange={(event) => setRecognitionLanguage(event.target.value)}>
            <option value="eng">English</option>
            <option value="jpn">Japanese</option>
          </select>
        </label>
      </div>

      <div className="scanner-source">
        {frontPhoto ? (
          <div className="scanner-source__image">
            <img src={frontPhoto.previewUrl} alt="Original card photograph for OCR" />
            <span>{frontPhoto.role === 'front' ? 'Card front' : 'Selected photograph'}</span>
          </div>
        ) : (
          <div className="scanner-source__empty"><ScanLine size={26} /><strong>Photograph first</strong><span>Add a front image using the photo controls below.</span></div>
        )}
        <div className="scanner-source__controls">
          <p className="eyebrow">01 · SOURCE PHOTOGRAPH</p>
          <h3>Use the clearest front image.</h3>
          <p>Keep the card square to the camera, in focus, and evenly lit. Front/back and detail images remain linked for the stock record.</p>
          <button className="button button--gold" type="button" disabled={!frontPhoto || scanning || !manualCropReady} onClick={scanCard}>
            {scanning ? <LoaderCircle className="spin-icon" size={16} /> : <ScanLine size={16} />}
            {scanning ? `Scanning… ${progress}%` : hasReview ? 'Rescan card' : 'Scan card'}
          </button>
          {status && <span className="scanner-status" role="status">{status}</span>}
          {error && <span className="form-error scanner-error" role="alert">{error}</span>}
        </div>
      </div>

      <section className="scanner-manual-crop" aria-labelledby="scanner-manual-crop-title">
        <div className="scanner-manual-crop__heading">
          <div>
            <p className="eyebrow">OCR SAFETY · REQUIRED</p>
            <h3 id="scanner-manual-crop-title">Select and confirm the card crop</h3>
            <p>Number-area and supporting text OCR run only inside this crop. Include every card edge and avoid unrelated background. Values are percentages from the photo's top-left; the original photo is not changed.</p>
          </div>
          <label className="scanner-manual-crop__toggle">
            <input type="checkbox" checked={manualCropEnabled} disabled={scanning || !frontPhoto} onChange={(event) => { setManualCropEnabled(event.target.checked); clearCropConfirmation(); setManualCropSelectionMade(false) }} />
            <span>Enable manual crop selection</span>
          </label>
        </div>
        {manualCropEnabled && frontPhoto?.previewUrl && (
          <div className="scanner-manual-crop__preview-instructions">
            Drag across the photo to select the card area. The crop should include all four card edges and leave a little margin.
          </div>
        )}
        {manualCropEnabled && frontPhoto?.previewUrl && (
          <div
            className="scanner-manual-crop__preview"
            ref={cropPreviewRef}
            onPointerDown={startCropSelection}
            onPointerMove={(event) => updateCropFromPointer(event)}
            onPointerUp={(event) => updateCropFromPointer(event, true)}
            onPointerCancel={() => { cropDragRef.current = null }}
            role="group"
            aria-label="Drag to select the crop area on the card photograph"
          >
            <img src={frontPhoto.previewUrl} alt="Photo to crop for OCR" draggable="false" />
            <div className="scanner-manual-crop__shade" style={{
              clipPath: `polygon(0 0, 100% 0, 100% ${manualCropPercent.y}%, ${Number(manualCropPercent.x) + Number(manualCropPercent.width)}% ${manualCropPercent.y}%, ${Number(manualCropPercent.x) + Number(manualCropPercent.width)}% ${Number(manualCropPercent.y) + Number(manualCropPercent.height)}%, ${manualCropPercent.x}% ${Number(manualCropPercent.y) + Number(manualCropPercent.height)}%, ${manualCropPercent.x}% ${manualCropPercent.y}%, 0 ${manualCropPercent.y}%)`,
            }} />
            <div className="scanner-manual-crop__selection" style={{
              left: manualCropPercent.x + '%',
              top: manualCropPercent.y + '%',
              width: manualCropPercent.width + '%',
              height: manualCropPercent.height + '%',
            }} />
          </div>
        )}
        {manualCropEnabled && (
          <div className="scanner-manual-crop__fields">
            {[
              ['x', 'Left edge'],
              ['y', 'Top edge'],
              ['width', 'Crop width'],
              ['height', 'Crop height'],
            ].map(([key, label]) => (
              <label className="form-field" key={key}>
                <span>{label} (%)</span>
                <input type="number" min="0" max="100" step="1" value={manualCropPercent[key]} disabled={scanning} onChange={(event) => {
                  const value = Math.max(0, Math.min(100, Number(event.target.value) || 0))
                  setManualCropPercent((current) => {
                    const next = { ...current, [key]: value }
                    if (key === 'x') next.width = Math.min(Number(current.width) || 0, 100 - value)
                    if (key === 'y') next.height = Math.min(Number(current.height) || 0, 100 - value)
                    if (key === 'width') next.width = Math.min(value, 100 - (Number(current.x) || 0))
                    if (key === 'height') next.height = Math.min(value, 100 - (Number(current.y) || 0))
                    return next
                  })
                  clearCropConfirmation()
                  setManualCropSelectionMade(true)
                }} />
              </label>
            ))}
            <button className="button button--quiet" type="button" disabled={scanning} onClick={() => { setManualCropPercent({ x: 0, y: 0, width: 100, height: 100 }); clearCropConfirmation(); setManualCropSelectionMade(false) }}>Reset full photo</button>
            <p className="scanner-manual-crop__note">{manualCropGeometryIsValid ? 'Crop dimensions are valid. Visually verify that all card edges are inside this area.' : 'Select a larger area: width and height must each be at least 12%, and the crop must stay within the photo.'}</p>
            <label className="scanner-manual-crop__confirm"><input type="checkbox" checked={manualCropConfirmed} disabled={scanning || !frontPhoto || !manualCropGeometryIsValid || !manualCropSelectionMade} onChange={(event) => { setManualCropConfirmed(event.target.checked); setManualCropConfirmedForFile(event.target.checked ? frontPhoto.file : null) }} /><span>I confirm the crop contains the entire card and avoids unrelated background.</span></label>
          </div>
        )}
        {!manualCropEnabled && <p className="scanner-manual-crop__required-note">Scanning is locked until you enable the crop, select the card area, and confirm it.</p>}
        {manualCropEnabled && !manualCropSelectionMade && <p className="scanner-manual-crop__required-note">Draw a crop rectangle or edit the percentage fields first. The full photo can be selected if it contains only the card.</p>}
        {manualCropEnabled && manualCropSelectionMade && !manualCropConfirmed && <p className="scanner-manual-crop__required-note">Confirm that the selection includes all card edges before scanning.</p>}
      </section>

      {numberReadings.length > 0 && (
        <section className="scanner-number-readings" aria-live="polite">
          <div>
            <p className="eyebrow">NUMBER READING · ZOOMED SCAN AREAS</p>
            <h3>{numberCandidates[0]?.number || 'Card number not confidently read yet'}</h3>
            <p>{numberCandidates.length
              ? 'The scanner compares repeated number readings from multiple enlarged areas before searching the catalogue.'
              : 'No valid card-number pattern was found. Check the enlarged-area OCR below, then enter the number manually if needed.'}</p>
          </div>
          <div className="scanner-number-readings__list">
            {numberReadings.map((reading) => (
              <div className="scanner-number-readings__item" key={reading.label}>
                <strong>{reading.label}</strong>
                <span>{reading.confidence ? Math.round(reading.confidence) + '% OCR confidence' : 'Confidence unavailable'}</span>
                <code>{reading.text.trim() || 'No text read'}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="scanner-photo-tools">
        <div>
          <p className="eyebrow">ADD OR CHANGE PHOTOGRAPHS</p>
          <span>Capture or upload front, back, and detail photographs. Choose a photograph side before capturing.</span>
        </div>
      </div>

      <section className="scanner-manual-lookup" aria-labelledby="scanner-manual-lookup-title">
        <div>
          <p className="eyebrow">CARD DATABASE SEARCH</p>
          <h3 id="scanner-manual-lookup-title">Search by card number</h3>
          <p>Look up an English or Japanese One Piece card directly. You do not need to scan a photograph first.</p>
        </div>
        <form className="scanner-manual-lookup__form" onSubmit={searchByCardNumber}>
          <label className="form-field">
            <span>Card number</span>
            <input value={manualCardNumber} onChange={(event) => setManualCardNumber(event.target.value)} placeholder="e.g. OP01-001 or OP17-119" />
          </label>
          <button className="button button--gold" type="submit" disabled={manualLoading || !manualCardNumber.trim()}>
            {manualLoading ? 'Searching…' : 'Search card number'}
          </button>
        </form>
        {manualError && <p className="form-error" role="status">{manualError}</p>}
        {manualMatches.map((match) => (
          <article className="scanner-catalogue__match" key={match.id}>
            <CatalogueReferenceImage match={match} className="scanner-catalogue__reference" />
            <div>
              <strong>{match.name || 'Unnamed card'}</strong>
              <span>{match.cardNumber} · {match.language} · {match.setCode || 'Promo'} · {match.rarity || 'Rarity not listed'} · {match.variant || 'Base'}</span>
              <small>{match.category || 'Card'} · {match.colors || 'Colour not listed'} · {match.power ? match.power + ' power' : 'No power'} · {match.cost !== '' ? match.cost + ' cost' : 'No cost'}</small>
              {match.setName && <small>{match.setName}</small>}
            </div>
            <div className="scanner-catalogue__actions"><button className="button button--outline" type="button" onClick={() => window.open(collectrSearchUrl(match), "_blank", "noopener,noreferrer")}>Search on Collectr ↗</button><button className="button button--gold" type="button" onClick={() => applyCatalogueMatch(match)}>Use details</button></div>
          </article>
        ))}
      </section>


      {matchConfirmationOpen && rankedAutoMatches.length > 0 && (
        <div className="scanner-match-confirmation__backdrop" role="presentation" onClick={() => setMatchConfirmationOpen(false)}>
          <section className="scanner-match-confirmation" role="dialog" aria-modal="true" aria-labelledby="scanner-match-confirmation-title" onClick={(event) => event.stopPropagation()}>
            <button className="scanner-match-confirmation__close" type="button" onClick={() => setMatchConfirmationOpen(false)} aria-label="Close card confirmation">×</button>
            <p className="eyebrow">CARD RECOGNITION · PLEASE CONFIRM</p>
            <h3 id="scanner-match-confirmation-title">Is this the card I found?</h3>
            <p className="scanner-match-confirmation__intro">The number crop finds the candidate. Compare the official catalogue image, rarity, language and set with the physical card. A number match alone is not proof. Your choice fills the form but does not save stock.</p>
            {selectedAutoMatch && (
              <>
                <div className="scanner-match-confirmation__comparison">
                  <div className="scanner-match-confirmation__compare-item">
                    <span>YOUR CARD PHOTO</span>
                    {frontPhoto?.previewUrl ? <img src={frontPhoto.previewUrl} alt="Your photographed card for comparison" /> : <div className="scanner-match-confirmation__compare-empty">No card photo</div>}
                  </div>
                  <div className="scanner-match-confirmation__compare-item">
                    <span>CATALOGUE REFERENCE</span>
                    <CatalogueReferenceImage match={selectedAutoMatch} className="scanner-match-confirmation__compare-image" />
                  </div>
                </div>
                <div className="scanner-match-confirmation__featured">
                  <div>
                    <strong>{selectedAutoMatch.name || 'Name unavailable'}</strong>
                    <span>{selectedAutoMatch.cardNumber} · {selectedAutoMatch.language} · {selectedAutoMatch.setCode || 'Set not listed'}</span>
                    {selectedAutoMatch.setName && <span>{selectedAutoMatch.setName}</span>}
                    <span>{selectedAutoMatch.rarity || 'Rarity unknown'} · {selectedAutoMatch.variantLabel || selectedAutoMatch.variant || 'Base version'}</span>
                    <small>{rankedAutoMatches.find((item) => item.match.id === selectedAutoMatch.id)?.nameMatch ? 'Name agrees with OCR' : 'Name differs from OCR'} · {rankedAutoMatches.find((item) => item.match.id === selectedAutoMatch.id)?.languageMatch ? 'Language agrees' : 'Language needs checking'}</small>
                  </div>
                </div>
              </>
            )}
            {rankedAutoMatches.length > 1 && (
              <div className="scanner-match-confirmation__options">
                <strong>Select the card you believe is correct ({rankedAutoMatches.length} catalogue printings)</strong>
                {sameNumberVariants > 1 && <p className="scanner-match-confirmation__intro">Several printings share this card number. The scanner cannot reliably identify the finish from OCR alone—compare the artwork and variant details before choosing.</p>}
                <div className="scanner-match-confirmation__list">
                  {rankedAutoMatches.map(({ match, nameMatch, languageMatch }) => (
                    <button className={selectedAutoMatchId === match.id ? 'scanner-match-confirmation__option scanner-match-confirmation__option--selected' : 'scanner-match-confirmation__option'} type="button" key={match.id} onClick={() => setSelectedAutoMatchId(match.id)}>
                      <CatalogueReferenceImage match={match} className="scanner-match-confirmation__thumb" />
                      <span><b>{match.name || 'Unknown card'}</b><small>{match.cardNumber} · {match.language} · {match.setCode || 'Set not listed'}</small>{match.setName && <small>{match.setName}</small>}<small>{match.rarity || 'Rarity unknown'} · {match.variantLabel || match.variant || 'Base version'}</small><small>{nameMatch ? 'Name match' : 'Name differs'} · {languageMatch ? 'Language match' : 'Language differs'}</small><small>{rankedAutoMatches.find((item) => item.match.id === match.id)?.numberEvidence ? `OCR number: ${rankedAutoMatches.find((item) => item.match.id === match.id).numberEvidence.occurrences} reading(s), ${rankedAutoMatches.find((item) => item.match.id === match.id).numberEvidence.confidence}% average confidence` : 'Number reading not independently corroborated'}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="scanner-match-confirmation__actions">
              <button className="button button--outline" type="button" onClick={() => setMatchConfirmationOpen(false)}>Not sure / enter manually</button>
              <button className="button button--gold" type="button" onClick={confirmAutoMatch} disabled={!selectedAutoMatch}>Yes, use this card</button>
            </div>
          </section>
        </div>
      )}

      {autoMatchStatus && (
        <section className="scanner-catalogue scanner-auto-match" aria-live="polite">
          <div><p className="eyebrow">AUTOMATIC CATALOGUE VERIFICATION</p><strong>{autoMatchStatus}</strong></div>
          {autoMatches.map((match) => (
            <article className="scanner-catalogue__match" key={match.id}>
              <CatalogueReferenceImage match={match} className="scanner-catalogue__reference" />
              <div><strong>{match.name || 'Unnamed card'}</strong><span>{match.cardNumber} · {match.language} · {match.setCode || 'Promo'} · {match.rarity || 'Rarity not listed'}</span>{match.setName && <small>{match.setName}</small>}</div>
              <div className="scanner-catalogue__actions"><button className="button button--outline" type="button" onClick={() => window.open(collectrSearchUrl(match), '_blank', 'noopener,noreferrer')}>Search on Collectr ↗</button><button className="button button--gold" type="button" onClick={() => applyCatalogueMatch(match)}>Use details</button></div>
            </article>
          ))}
        </section>
      )}

      {hasReview && (
        <div className="scan-review">
          <div className="scan-review__heading">
            <div><p className="eyebrow">02 · SCAN REVIEW</p><h3>Review extracted details</h3></div>
            <button className="button button--outline" type="button" disabled={!frontPhoto || scanning || !manualCropReady} onClick={scanCard}><ScanLine size={15} /> Rescan</button>
          </div>
          <label className="form-field extracted-text">
            <span>Recognised text · editable</span>
            <textarea rows="7" value={rawText} onChange={(event) => setRawText(event.target.value)} />
          </label>
          <div className="scanner-catalogue">
            <div>
              <p className="eyebrow">03 · CARD CATALOGUE MATCH</p>
              <p>Look up known One Piece card details using the detected card number. This is a free catalogue lookup, not AI image recognition.</p>
            </div>
            <button className="button button--outline" type="button" disabled={!fields.card_number?.value || catalogueLoading} onClick={lookupCatalogue}>
              {catalogueLoading ? 'Looking up…' : 'Find card details'}
            </button>
            {catalogueError && <p className="form-error" role="status">{catalogueError}</p>}
            {catalogueMatches.map((match) => (

              <div className="scanner-catalogue__match" key={match.id}>
                <CatalogueReferenceImage match={match} className="scanner-catalogue__reference" />
                <div>
                  <strong>{match.name || 'Unnamed card'}</strong>
                  <span>{match.cardNumber} · {match.language} · {match.setCode || 'Promo'} · {match.rarity || 'Rarity not listed'} · {match.variant || 'Base'}</span>
                  <small>{match.category || 'Card'} · {match.colors || 'Colour not listed'} · {match.power ? match.power + ' power' : 'No power'} · {match.cost !== '' ? match.cost + ' cost' : 'No cost'}</small>
                  {match.setName && <small>{match.setName}</small>}
                </div>
                <div className="scanner-catalogue__actions"><button className="button button--outline" type="button" onClick={() => window.open(collectrSearchUrl(match), "_blank", "noopener,noreferrer")}>Search on Collectr ↗</button><button className="button button--gold" type="button" onClick={() => applyCatalogueMatch(match)}>Use details</button></div>
              </div>
            ))}
          </div>
          <button className="text-button" type="button" onClick={reparseText}>Re-extract fields from edited text</button>
          <div className="scan-fields">
            {CARD_FIELDS.map(([key, label]) => {
              const field = fields[key] || { value: '', confidence: 0, needsReview: true }
              const needsReview = field.needsReview || !field.value
              return (
                <label className="form-field scan-field" key={key}>
                  <span>{label}</span>
                  {key === 'effect_text' ? (
                    <textarea rows="3" value={field.value} onChange={(event) => updateField(key, event.target.value)} />
                  ) : (
                    <input value={field.value} onChange={(event) => updateField(key, event.target.value)} />
                  )}
                  <small className={needsReview ? 'confidence confidence--review' : 'confidence confidence--good'}>
                    {needsReview ? <AlertCircle size={12} /> : <Check size={12} />}
                    {confidenceLabel(field)}{field.value ? ` · ${field.confidence}%` : ' · manual entry needed'}
                  </small>
                </label>
              )
            })}
          </div>
          <div className="scan-review__footer">
            <p><AlertCircle size={14} /> The bottom-right number crop drives catalogue lookup; full-card OCR reads supporting details. Compare the catalogue image and verify rarity, number, language and every effect before adding stock.</p>
            <button className="button button--gold" type="button" onClick={onContinue}>Continue to product form <ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </section>
  )
}
