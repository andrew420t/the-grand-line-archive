import { useState } from 'react'
import { AlertCircle, ArrowRight, Check, LoaderCircle, ScanLine } from 'lucide-react'
import { CARD_FIELDS, parseCardDetails } from './cardParser'
import { rankCatalogueMatches } from './cardMatchRanking'
import { findCatalogueMatches, catalogueMatchToForm, collectrSearchUrl } from './cardCatalogue'
import CatalogueReferenceImage from './CatalogueReferenceImage'
import { findRememberedCardImage, findSharedRememberedCardImage, rememberVerifiedCardImage } from './cardRecognitionMemory'
import { prepareCardNumberRegion } from './cardNumberRegion'

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
  const [rememberMatch, setRememberMatch] = useState(true)
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueError, setCatalogueError] = useState('')
  const [manualCardNumber, setManualCardNumber] = useState('')
  const [manualMatches, setManualMatches] = useState([])
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState('')

  const frontPhoto = photos.find((photo) => photo.role === 'front') || photos[0]
  const hasReview =
    Object.values(fields).some((field) => field.value) || Boolean(rawText.trim())

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

  const scanCard = async () => {
    if (!frontPhoto) {
      setError('Add a card-front photograph in the photo panel before scanning.')
      return
    }

    let worker
    let rememberedImage = null
    let sharedRememberedImage = null
    setScanning(true)
    setError('')
    setStatus('Loading the free browser OCR engine…')
    setProgress(0)

    try {
      try {
        [rememberedImage, sharedRememberedImage] = await Promise.all([
          findRememberedCardImage(frontPhoto.file),
          findSharedRememberedCardImage(frontPhoto.file),
        ])
        if (rememberedImage || sharedRememberedImage) setStatus('Found a similar previously confirmed card image. Checking it against OCR…')
      } catch (memoryError) {
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
      setStatus('Reading the card number and rarity from the bottom-right corner…')
      const numberRegion = await prepareCardNumberRegion(frontPhoto.file)
      const numberResult = await worker.recognize(numberRegion, {}, { blocks: true })
      setStatus('Card number region read. Checking the full card for name, rarity and language…')
      const { data } = await worker.recognize(frontPhoto.file, {}, { blocks: true })
      const lines =
        data.lines ||
        (data.blocks || []).flatMap((block) =>
          (block.paragraphs || []).flatMap((paragraph) => paragraph.lines || []),
        )
      const numberLines =
        numberResult.data.lines ||
        (numberResult.data.blocks || []).flatMap((block) =>
          (block.paragraphs || []).flatMap((paragraph) => paragraph.lines || []),
        )
      const combinedText = [numberResult.data.text || '', data.text || ''].filter(Boolean).join('\n')
      const combinedLines = [...numberLines, ...lines]
      setRawText(combinedText)
      const parsed = parseCardDetails(combinedText, combinedLines, recognitionLanguage)
      setFields(parsed)
      setAutoMatches([])
      setRankedAutoMatches([])
      setSelectedAutoMatchId('')
      setMatchConfirmationOpen(false)
      setAutoMatchStatus('')
      const detectedNumber = parsed.card_number?.value || sharedRememberedImage?.cardNumber || rememberedImage?.cardNumber
      if (detectedNumber) {
        setStatus('Card number detected from the lower-right crop. Looking up the exact catalogue printing and checking rarity…')
        try {
          const matches = await findCatalogueMatches(detectedNumber)
          setAutoMatches(matches)
          if (matches.length) {
            let rememberedId = ''
            try { rememberedId = window.localStorage.getItem('glaScannerCardMatch:' + detectedNumber) || '' } catch { /* storage may be unavailable */ }
            if (rememberedImage?.cardNumber === detectedNumber) rememberedId = rememberedImage.printingId
            if (sharedRememberedImage?.cardNumber === detectedNumber) rememberedId = sharedRememberedImage.printingId
            const ranked = rankCatalogueMatches(matches, parsed.name?.value, parsed.language?.value, rememberedId)
            const best = ranked[0]
            setRankedAutoMatches(ranked)
            setSelectedAutoMatchId(best.match.id)
            setMatchConfirmationOpen(true)
            setAutoMatchStatus((rememberedImage?.printingId === best.match.id || sharedRememberedImage?.printingId === best.match.id)
              ? (sharedRememberedImage?.printingId === best.match.id ? 'Shared recognition library match' : 'Previously confirmed local image') + ' (' + (sharedRememberedImage?.printingId === best.match.id ? sharedRememberedImage.similarity : rememberedImage.similarity) + '% visual similarity). Please confirm the card and variant.'
              : best.nameMatch && best.languageMatch
              ? 'Strong match: card number, name, and language agree.'
              : best.nameMatch
                ? 'Possible match: card number and name agree. Confirm language and set.'
                : 'Possible match found by card number. Compare the name, language, and set manually.')
          } else {
            setAutoMatchStatus('No catalogue entry matched the detected card number. Check the OCR number.')
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
      ...Object.fromEntries(Object.entries({
        name: values.name,
        card_number: values.card_number,
        set_code: values.set_code,
        rarity: values.rarity,
        color: values.color,
        cost: values.cost,
        power: values.power,
        card_type: values.card_type,
        classification: values.classification,
        language: values.language,
        effect_text: values.effect_text,
        variant_label: values.variant_label,
      }).map(([key, value]) => [
        key,
        { value: value || '', confidence: value ? 95 : 0, needsReview: true },
      ])),
    }))
    setStatus('Catalogue details filled in. Check each value against the physical card before saving.')
  }

  const selectedAutoMatch = rankedAutoMatches.find((item) => item.match.id === selectedAutoMatchId)?.match

  const confirmAutoMatch = async () => {
    if (selectedAutoMatch) {
      applyCatalogueMatch(selectedAutoMatch)
      if (rememberMatch && fields.card_number?.value) {
        try { window.localStorage.setItem('glaScannerCardMatch:' + fields.card_number.value, selectedAutoMatch.id) } catch { /* storage may be unavailable */ }
      }
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
        } catch (memoryError) {
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
          <button className="button button--gold" type="button" disabled={!frontPhoto || scanning} onClick={scanCard}>
            {scanning ? <LoaderCircle className="spin-icon" size={16} /> : <ScanLine size={16} />}
            {scanning ? `Scanning… ${progress}%` : hasReview ? 'Rescan card' : 'Scan card'}
          </button>
          {status && <span className="scanner-status" role="status">{status}</span>}
          {error && <span className="form-error scanner-error" role="alert">{error}</span>}
        </div>
      </div>

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
              <div className="scanner-match-confirmation__featured">
                <CatalogueReferenceImage match={selectedAutoMatch} className="scanner-match-confirmation__image" />
                <div>
                  <strong>{selectedAutoMatch.name || 'Name unavailable'}</strong>
                  <span>{selectedAutoMatch.cardNumber} · {selectedAutoMatch.language} · {selectedAutoMatch.setCode || 'Set not listed'}</span>
                  <span>{selectedAutoMatch.rarity || 'Rarity unknown'} · {selectedAutoMatch.variant || 'Base version'}</span>
                  <small>{rankedAutoMatches.find((item) => item.match.id === selectedAutoMatch.id)?.nameMatch ? 'Name agrees with OCR' : 'Name differs from OCR'} · {rankedAutoMatches.find((item) => item.match.id === selectedAutoMatch.id)?.languageMatch ? 'Language agrees' : 'Language needs checking'}</small>
                </div>
              </div>
            )}
            {rankedAutoMatches.length > 1 && (
              <div className="scanner-match-confirmation__options">
                <strong>Select the card you believe is correct</strong>
                <div className="scanner-match-confirmation__list">
                  {rankedAutoMatches.map(({ match, nameMatch, languageMatch }) => (
                    <button className={selectedAutoMatchId === match.id ? 'scanner-match-confirmation__option scanner-match-confirmation__option--selected' : 'scanner-match-confirmation__option'} type="button" key={match.id} onClick={() => setSelectedAutoMatchId(match.id)}>
                      <CatalogueReferenceImage match={match} className="scanner-match-confirmation__thumb" />
                      <span><b>{match.name || 'Unknown card'}</b><small>{match.cardNumber} · {match.language} · {match.setCode || 'Promo'}</small><small>{nameMatch ? 'Name match' : 'Name differs'} · {languageMatch ? 'Language match' : 'Language differs'}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="scanner-match-confirmation__remember"><input type="checkbox" checked={rememberMatch} onChange={(event) => setRememberMatch(event.target.checked)} /> Remember my selection on this browser for future scans of this card number</label>
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
            <button className="button button--outline" type="button" disabled={!frontPhoto || scanning} onClick={scanCard}><ScanLine size={15} /> Rescan</button>
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
