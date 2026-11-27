const OFFICIAL_METADATA_CORRECTIONS = new Map([
  ['jp:EB01056:OP10', {
    name: 'シャーロット・フランペ',
    source: 'Official Bandai Japanese OP-10 card list',
  }],
])

function normalizeCardNumber(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeProductCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Apply only explicit, source-verified Bandai metadata corrections.
 * The EB01-056 name changes on the OP-10 reprint page, so the correction is
 * scoped to Japanese language AND the OP-10 release product. Its EB-01
 * original keeps the original Japanese source spelling.
 */
export function applyCatalogueOfficialMetadataCorrection({ cardNumber, language, productCode, observation }) {
  if (!observation) return observation
  const key = [
    String(language || '').toLowerCase(),
    normalizeCardNumber(cardNumber),
    normalizeProductCode(productCode),
  ].join(':')
  const correction = OFFICIAL_METADATA_CORRECTIONS.get(key)
  return correction ? { ...observation, ...correction } : observation
}
