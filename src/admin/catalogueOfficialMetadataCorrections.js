const OFFICIAL_METADATA_CORRECTIONS = new Map([
  ['jp:EB01056', {
    name: 'シャーロット・フランペ',
    source: 'Official Bandai Japanese card list',
  }],
])

function normalizeCardNumber(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Apply only explicit, source-verified Bandai metadata corrections.
 * The correction is language- and card-number-specific; other printings and
 * English observations remain untouched.
 */
export function applyCatalogueOfficialMetadataCorrection({ cardNumber, language, observation }) {
  if (!observation) return observation
  const key = String(language || '').toLowerCase() + ':' + normalizeCardNumber(cardNumber)
  const correction = OFFICIAL_METADATA_CORRECTIONS.get(key)
  return correction ? { ...observation, ...correction } : observation
}
