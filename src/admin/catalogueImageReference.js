/**
 * Construct the standard Bandai base-card image URL for a known card number.
 * This is a reference-art fallback only; it does not identify parallel/foil
 * variants and never invents an image for numberless DON!! cards.
 */
export function buildOfficialBaseImageUrl(cardNumber, language = 'en') {
  const normalized = String(cardNumber || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .replace(/^(OP|EB|ST|PRB)-(\d{2})-/, '$1$2-')
    .trim()
  const languageText = String(language || '').toLowerCase()
  const languageCode = languageText.startsWith('jp') || languageText.includes('japanese') ? 'jp'
    : languageText.startsWith('en') || languageText.includes('english') ? 'en' : ''
  if (!languageCode || !/^(?:(?:OP|EB|ST|PRB)\d{2}|P)-\d{3}$/.test(normalized)) return ''
  const host = languageCode === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
  return host + '/images/cardlist/card/' + encodeURIComponent(normalized) + '.png'
}

/**
 * Resolve a catalogue image for a printing and safe alternate official artwork.
 *
 * A TCGCSV stamped/foil record may not have its own image. We may reuse
 * official base-card artwork for identification, but label it as a fallback
 * because it may not depict the special finish.
 */
export function resolveCatalogueImage({ printing, index = {}, printings = [], language = 'en', cardNumber = '' } = {}) {
  if (!printing) return { imageUrl: '', fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }

  const locatorFor = (candidate) => index.locatorsByPrinting instanceof Map
    ? index.locatorsByPrinting.get(candidate.key + ':' + candidate.site)
    : undefined
  const officialUrlFor = (candidate, locator) => {
    if (!locator?.image_id || !['en', 'jp'].includes(candidate.site)) return ''
    const host = candidate.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
    return host + '/images/cardlist/card/' + encodeURIComponent(locator.image_id) + '.png'
  }
  const locator = locatorFor(printing)
  const officialUrl = officialUrlFor(printing, locator)
  const directUrl = officialUrl || String(printing.image_url || '')
  const alternateOfficialUrls = [...new Set((printings || [])
    .filter((candidate) => candidate.card_key === printing.card_key && candidate.site === language && candidate.key !== printing.key)
    .map((candidate) => officialUrlFor(candidate, locatorFor(candidate)))
    .filter((url) => url && url !== directUrl))]
  const canUseSameLanguageFallback = printing.site === 'tcgcsv' || printing.site === language
  const baseImageFallbackUrl = canUseSameLanguageFallback
    ? buildOfficialBaseImageUrl(cardNumber, language)
    : ''
  const fallbackCandidates = [...new Set([
    baseImageFallbackUrl,
    ...alternateOfficialUrls,
  ].filter((url) => url && url !== directUrl))]

  if (directUrl) {
    return {
      imageUrl: directUrl,
      fallbackImageUrl: fallbackCandidates[0] || '',
      source: officialUrl
        ? (printing.site === 'jp' ? 'Bandai official Japanese image' : 'Bandai official English image')
        : 'Catalogue source image',
      usesBaseImageFallback: false,
    }
  }

  if (fallbackCandidates.length) {
    return {
      imageUrl: fallbackCandidates[0],
      fallbackImageUrl: fallbackCandidates[1] || '',
      source: language === 'jp'
        ? 'Bandai official Japanese base-card fallback (special finish may differ)'
        : 'Bandai official English base-card fallback (special finish may differ)',
      usesBaseImageFallback: true,
    }
  }

  return { imageUrl: '', fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }
}
