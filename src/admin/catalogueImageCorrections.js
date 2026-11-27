const normalizeCardNumber = (value) => String(value || '').toUpperCase().replace(/\s+/g, '').replace(/_/g, '-').replace(/-+/g, '-')
const normalizeSetCode = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

function languageLabel(languageCode) {
  return languageCode === 'en' ? 'English' : languageCode === 'jp' ? 'Japanese' : ''
}

export function matchesCatalogueImageCorrection(record, correction) {
  if (!record || !correction || !correction.details?.reference_image_url) return false
  const language = languageLabel(record.languageCode)
  if (!language || correction.language !== language) return false
  if (normalizeCardNumber(record.cardNumber) !== normalizeCardNumber(correction.card_number)) return false
  if (normalizeSetCode(record.setCode) !== normalizeSetCode(correction.set_code)) return false
  const recordVariant = String(record.variantLabel || record.variant || '')
  if (recordVariant !== String(correction.variant_label || '')) return false
  const recordPrintingKey = String(record.printingKey || '')
  const correctionPrintingKey = String(correction.printing_key || '')
  return recordPrintingKey === correctionPrintingKey
}

export function applyCatalogueImageCorrection(record, correction) {
  if (!matchesCatalogueImageCorrection(record, correction)) return record
  const url = String(correction.details.reference_image_url).trim()
  if (!url || (!url.startsWith('https://') && !url.startsWith('/_card-image/')) || url.startsWith('//')) return record
  const candidate = {
    url,
    kind: 'exact',
    language: record.languageCode,
    printingKey: record.printingKey || '',
    cardKey: record.cardKey || '',
    cardNumber: record.cardNumber || '',
    setCode: record.setCode || '',
    rarity: record.rarity || '',
    variant: record.variant || '',
    originalImageUrl: url,
    source: correction.source || 'Administrator-corrected image reference',
  }
  const existingCandidates = (record.imageCandidates || []).filter((item) => item.kind !== 'exact' || item.url !== url)
  return {
    ...record,
    imageUrl: url,
    imageUrls: [url, ...(record.imageUrls || []).filter((item) => item !== url)],
    exactImageUrl: url,
    imageCandidates: [candidate, ...existingCandidates],
    source: candidate.source,
    referenceCorrected: true,
    hasImage: true,
    imageStatus: 'available',
  }
}

export function applyCatalogueImageCorrections(records = [], corrections = []) {
  if (!corrections.length) return records
  return records.map((record) => {
    const correction = corrections.find((item) => matchesCatalogueImageCorrection(record, item))
    return correction ? applyCatalogueImageCorrection(record, correction) : record
  })
}
