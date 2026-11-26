const OPTCG_IMAGE_PROXY_ROOT = 'https://optcg-api.arjunbansal-ai.workers.dev/images/'

/**
 * Public image transport for official card artwork. The proxy fetches Bandai
 * images with a Bandai referrer, retries via its image CDN when hot-link
 * protection blocks the first request, and returns cache/CORS headers.
 * It does not re-host or claim ownership of the card art.
 */
export function buildOfficialImageProxyUrl(imageId, language = 'en') {
  const id = String(imageId || '').trim().toUpperCase()
  const safeId = /^(?:(?:OP|EB|ST|PRB)\d{2}|P)-\d{3}(?:_(?:P|R)\d+|_JP\d+|_T\d+)?$/.test(id)
    || /^DON-\d{3}$/.test(id)
  if (!safeId) return ''
  const languageText = String(language || '').toLowerCase()
  const lang = languageText.startsWith('jp') || languageText.includes('japanese') ? 'ja' : 'en'
  return OPTCG_IMAGE_PROXY_ROOT + encodeURIComponent(id) + (lang === 'ja' ? '?lang=ja' : '')
}

/** Construct the direct Bandai base-card URL retained as a final fallback. */
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
 * Exact photo first, then official image through the referrer-aware proxy,
 * direct Bandai, same-card alternate art, then base-card reference.
 */
export function resolveCatalogueImage({ printing, index = {}, printings = [], language = 'en', cardNumber = '' } = {}) {
  if (!printing) return { imageUrl: '', imageUrls: [], fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }

  const locatorFor = (candidate) => index.locatorsByPrinting instanceof Map
    ? index.locatorsByPrinting.get(candidate.key + ':' + candidate.site)
    : undefined

  const officialImageFor = (candidate, locator) => {
    if (!locator?.image_id || !['en', 'jp'].includes(candidate.site)) return null
    const host = candidate.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
    const imageId = String(locator.image_id)
    return {
      proxyUrl: buildOfficialImageProxyUrl(imageId, candidate.site),
      directUrl: host + '/images/cardlist/card/' + encodeURIComponent(imageId) + '.png',
    }
  }

  const exactOfficial = officialImageFor(printing, locatorFor(printing))
  const directProductUrl = String(printing.image_url || '')
  const exactProductPhoto = printing.site === 'tcgcsv' && Boolean(directProductUrl)
  const exactOtherSourceImage = !exactOfficial && printing.site !== 'tcgcsv' && Boolean(directProductUrl)
  const exactUrls = exactOfficial
    ? [exactOfficial.proxyUrl, exactOfficial.directUrl]
    : [directProductUrl]

  const alternateOfficial = (printings || [])
    .filter((candidate) => candidate.card_key === printing.card_key && candidate.site === language && candidate.key !== printing.key)
    .map((candidate) => officialImageFor(candidate, locatorFor(candidate)))
    .filter(Boolean)
  const alternateUrls = alternateOfficial.flatMap((candidate) => [candidate.proxyUrl, candidate.directUrl])

  const canUseSameLanguageFallback = (printing.site === 'tcgcsv' || printing.site === language) && ['en', 'jp'].includes(language)
  const normalizedNumber = String(cardNumber || '').toUpperCase().replace(/^(OP|EB|ST|PRB)-(\d{2})-/, '$1$2-')
  const baseProxyUrl = canUseSameLanguageFallback ? buildOfficialImageProxyUrl(normalizedNumber, language) : ''
  const baseDirectUrl = canUseSameLanguageFallback ? buildOfficialBaseImageUrl(cardNumber, language) : ''

  const imageUrls = uniqueUrls([
    ...exactUrls,
    ...alternateUrls,
    baseProxyUrl,
    baseDirectUrl,
  ])

  const usesAlternateOfficialFallback = !exactOfficial && !exactProductPhoto && alternateUrls.length > 0
  const hasExactImage = Boolean(exactOfficial || exactProductPhoto || exactOtherSourceImage)
  const usesBaseImageFallback = !hasExactImage && !usesAlternateOfficialFallback && Boolean(baseProxyUrl || baseDirectUrl)

  let source = 'No image reference'
  if (exactOfficial) {
    source = 'Bandai official ' + (printing.site === 'jp' ? 'Japanese' : 'English') + ' image via OPTCG image proxy'
  } else if (exactProductPhoto) {
    source = 'Catalogue product image (TCGPlayer / TCGCSV source)'
  } else if (exactOtherSourceImage) {
    source = printing.site === 'cn' ? 'Chinese catalogue source image' : 'Third-party catalogue image source'
  } else if (usesAlternateOfficialFallback) {
    source = 'Bandai official alternate printing via OPTCG image proxy (exact finish may differ)'
  } else if (usesBaseImageFallback) {
    source = 'Bandai official ' + (language === 'jp' ? 'Japanese' : 'English') + ' base-card image via OPTCG image proxy (special finish may differ)'
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
