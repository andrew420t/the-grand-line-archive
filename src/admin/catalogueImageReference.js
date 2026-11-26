/**
 * Resolve card artwork using only image sources available to this application.
 * Bandai remains the source of truth for official English/Japanese card art.
 * Exact third-party catalogue photos remain preferred for stamped/foil entries.
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

function uniqueUrls(values) {
  return [...new Set(values.filter((url) => typeof url === 'string' && url.trim()))]
}

/**
 * Resolution order: exact printing locator / photo, same-card same-language
 * alternate artwork, then the official base-card image. Chinese rows never
 * fall back to English/Japanese art.
 */
export function resolveCatalogueImage({ printing, index = {}, printings = [], language = 'en', cardNumber = '' } = {}) {
  if (!printing) return { imageUrl: '', imageUrls: [], fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }

  const locatorFor = (candidate) => index.locatorsByPrinting instanceof Map
    ? index.locatorsByPrinting.get(candidate.key + ':' + candidate.site)
    : undefined

  const officialImageFor = (candidate, locator) => {
    if (!locator?.image_id || !['en', 'jp'].includes(candidate.site)) return null
    const host = candidate.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
    return host + '/images/cardlist/card/' + encodeURIComponent(String(locator.image_id)) + '.png'
  }

  const exactOfficial = officialImageFor(printing, locatorFor(printing))
  const directProductUrl = String(printing.image_url || '')
  const exactProductPhoto = printing.site === 'tcgcsv' && Boolean(directProductUrl)
  const exactOtherSourceImage = !exactOfficial && printing.site !== 'tcgcsv' && Boolean(directProductUrl)
  const exactUrls = exactOfficial
    ? [exactOfficial, directProductUrl]
    : [directProductUrl]

  const alternateUrls = (printings || [])
    .filter((candidate) => candidate.card_key === printing.card_key && candidate.site === language && candidate.key !== printing.key)
    .map((candidate) => officialImageFor(candidate, locatorFor(candidate)) || (candidate.site === 'cn' ? candidate.image_url : ''))
    .filter(Boolean)

  const canUseSameLanguageFallback = (printing.site === 'tcgcsv' || printing.site === language) && ['en', 'jp'].includes(language)
  const baseDirectUrl = canUseSameLanguageFallback ? buildOfficialBaseImageUrl(cardNumber, language) : ''
  const imageUrls = uniqueUrls([...exactUrls, ...alternateUrls, baseDirectUrl])

  const usesAlternateOfficialFallback = !exactOfficial && !exactProductPhoto && alternateUrls.length > 0
  const hasExactImage = Boolean(exactOfficial || exactProductPhoto || exactOtherSourceImage)
  const usesBaseImageFallback = !hasExactImage && !usesAlternateOfficialFallback && Boolean(baseDirectUrl)

  let source = 'No image reference'
  if (exactOfficial) {
    source = 'Bandai official ' + (printing.site === 'jp' ? 'Japanese' : 'English') + ' printing image'
  } else if (exactProductPhoto) {
    source = 'Catalogue product image (TCGPlayer / TCGCSV source)'
  } else if (exactOtherSourceImage) {
    source = printing.site === 'cn' ? 'Chinese catalogue source image' : 'Third-party catalogue image source'
  } else if (usesAlternateOfficialFallback) {
    source = language === 'cn'
      ? 'Chinese catalogue alternate printing image (exact finish may differ)'
      : 'Bandai official alternate printing image (exact finish may differ)'
  } else if (usesBaseImageFallback) {
    source = 'Bandai official ' + (language === 'jp' ? 'Japanese' : 'English') + ' base-card image (special finish may differ)'
  }

  return {
    imageUrl: imageUrls[0] || '',
    imageUrls,
    fallbackImageUrl: imageUrls[1] || '',
    source,
    usesBaseImageFallback,
    usesAlternateOfficialFallback,
  }
}
