/**
 * Resolve card artwork using official/source-specific URLs and the same-origin
 * Cloudflare image proxy. Original source URLs remain as fallbacks.
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

const BANDAI_IMAGE_ID = /^(?:(?:OP|EB|ST|PRB)\d{2}|P)-\d{3}(?:_[a-z]\d+)?$/i

const PREVIEW_SUPABASE_IMAGE_PROJECT = 'ehzqsnfkmwphyllhaqhe.supabase.co'

export function buildPreviewBandaiImageFunctionUrl(imageId, language = 'en', supabaseUrl = '') {
  const id = String(imageId || '').trim()
  const text = String(language || '').toLowerCase()
  const lang = text.startsWith('jp') || text.includes('japanese') ? 'jp'
    : text.startsWith('en') || text.includes('english') ? 'en' : ''
  if (!lang || !BANDAI_IMAGE_ID.test(id)) return ''
  let projectUrl
  try {
    projectUrl = new URL(String(supabaseUrl || ''))
  } catch {
    return ''
  }
  if (
    projectUrl.protocol !== 'https:' ||
    projectUrl.hostname !== PREVIEW_SUPABASE_IMAGE_PROJECT ||
    projectUrl.username ||
    projectUrl.password ||
    projectUrl.port ||
    projectUrl.pathname !== '/'
  ) return ''
  const endpoint = new URL('/functions/v1/bandai-card-image', projectUrl.origin)
  endpoint.searchParams.set('language', lang)
  endpoint.searchParams.set('id', id)
  return endpoint.toString()
}

export function buildOfficialImageProxyUrl(imageId, language = 'en') {
  const id = String(imageId || '').trim()
  const text = String(language || '').toLowerCase()
  const lang = text.startsWith('jp') || text.includes('japanese') ? 'jp'
    : text.startsWith('en') || text.includes('english') ? 'en' : ''
  if (!lang || !BANDAI_IMAGE_ID.test(id)) return ''
  // Branch previews use Testing Supabase to bypass Bandai's same-site CORP
  // header and the Cloudflare Worker-to-Bandai 522 timeout.
  if (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_PREVIEW_BUILD === true) {
    const previewImageUrl = buildPreviewBandaiImageFunctionUrl(
      id,
      lang,
      import.meta.env.VITE_PREVIEW_SUPABASE_URL || '',
    )
    if (previewImageUrl) return previewImageUrl
  }
  // Production keeps the existing same-origin Worker route until its image
  // endpoint is separately approved and deployed to the Production project.
  return '/_card-image/bandai/' + lang + '/' + encodeURIComponent(id) + '.png'
}

export function buildCatalogueImageProxyUrl(imageUrl) {
  const raw = String(imageUrl || '').trim()
  if (!raw) return ''
  let url
  try {
    url = new URL(raw)
  } catch {
    return ''
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return ''
  if (url.hostname === 'en.onepiece-cardgame.com' || url.hostname === 'www.onepiece-cardgame.com') {
    const match = url.pathname.match(/^\/images\/cardlist\/card\/([^/]+)\.png$/i)
    if (!match) return ''
    let imageId
    try {
      imageId = decodeURIComponent(match[1])
    } catch {
      return ''
    }
    return buildOfficialImageProxyUrl(imageId, url.hostname.startsWith('www.') ? 'jp' : 'en')
  }
  const tcg = url.hostname === 'tcgplayer-cdn.tcgplayer.com'
    && /^\/product\/\d+_in_\d+x\d+\.(?:jpe?g|png|webp)$/i.test(url.pathname)
  const chinese = url.hostname === 'source.windoent.com'
    && /^\/OnePiecePc\/Picture\/[a-z0-9_.-]+\.(?:jpe?g|png|webp)$/i.test(url.pathname)
  if (!tcg && !chinese) return ''
  return '/_card-image/external?url=' + encodeURIComponent(url.toString())
}

function uniqueUrls(values) {
  return [...new Set(values.filter((url) => typeof url === 'string' && url.trim()))]
}

function sourceImageCandidates(url) {
  const raw = String(url || '').trim()
  if (!raw) return []
  return uniqueUrls([buildCatalogueImageProxyUrl(raw), raw])
}

export function resolveCatalogueImage({ printing, index = {}, printings = [], language = 'en', cardNumber = '' } = {}) {
  if (!printing) return { imageUrl: '', imageUrls: [], fallbackImageUrl: '', imageCandidates: [], source: 'No image reference', usesBaseImageFallback: false }
  const locatorFor = (candidate) => index.locatorsByPrinting instanceof Map
    ? index.locatorsByPrinting.get(candidate.key + ':' + candidate.site)
    : undefined
  const officialImageFor = (candidate, locator) => {
    if (!locator?.image_id || !['en', 'jp'].includes(candidate.site)) return null
    const host = candidate.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
    const id = String(locator.image_id)
    return {
      proxyUrl: buildOfficialImageProxyUrl(id, candidate.site),
      directUrl: host + '/images/cardlist/card/' + encodeURIComponent(id) + '.png',
    }
  }

  const exactOfficial = officialImageFor(printing, locatorFor(printing))
  const directProductUrl = String(printing.image_url || '')
  const exactProductPhoto = printing.site === 'tcgcsv' && Boolean(directProductUrl)
  const exactOtherSourceImage = !exactOfficial && printing.site !== 'tcgcsv' && Boolean(directProductUrl)
  const exactUrls = exactOfficial
    ? uniqueUrls([exactOfficial.proxyUrl, exactOfficial.directUrl, ...sourceImageCandidates(directProductUrl)])
    : sourceImageCandidates(directProductUrl, language)
  const alternateUrls = (printings || [])
    .filter((candidate) =>
      candidate.card_key === printing.card_key &&
      candidate.site === printing.site &&
      candidate.key !== printing.key,
    )
    .flatMap((candidate) => {
      const official = officialImageFor(candidate, locatorFor(candidate))
      if (official) return [official.proxyUrl, official.directUrl]
      return candidate.site === 'cn' ? sourceImageCandidates(candidate.image_url) : []
    })

  const canUseSameLanguageFallback = (printing.site === 'tcgcsv' || printing.site === language) && ['en', 'jp'].includes(language)
  const normalizedNumber = String(cardNumber || '').toUpperCase().replace(/^(OP|EB|ST|PRB)-(\d{2})-/, '$1$2-')
  const baseDirectUrl = canUseSameLanguageFallback ? buildOfficialBaseImageUrl(cardNumber, language) : ''
  const baseProxyUrl = canUseSameLanguageFallback ? buildOfficialImageProxyUrl(normalizedNumber, language) : ''
  const candidateMeta = (candidate, candidateLanguage, kind, url, source) => ({
    url,
    kind,
    printingKey: candidate?.key || '',
    cardKey: candidate?.card_key || '',
    cardNumber: String(cardNumber || ''),
    language: candidateLanguage,
    originalImageUrl: String(candidate?.image_url || ''),
    source,
  })
  const imageCandidates = []
  const exactLanguage = printing.site === 'tcgcsv' ? 'en' : printing.site
  for (const url of exactUrls) {
    imageCandidates.push(candidateMeta(
      printing,
      exactLanguage,
      'exact',
      url,
      exactOfficial ? 'Bandai official printing locator' : exactProductPhoto ? 'TCGCSV product image' : 'Catalogue printing image',
    ))
  }
  const alternativePrintings = (printings || []).filter((candidate) =>
    candidate.card_key === printing.card_key &&
    candidate.site === printing.site &&
    candidate.key !== printing.key &&
    ['en', 'jp'].includes(candidate.site),
  )
  for (const candidate of alternativePrintings) {
    const official = officialImageFor(candidate, locatorFor(candidate))
    const urls = official ? [official.proxyUrl, official.directUrl] : sourceImageCandidates(candidate.image_url)
    for (const url of urls) {
      imageCandidates.push(candidateMeta(candidate, candidate.site, 'alternative', url, official ? 'Bandai alternate printing locator' : 'Same-language alternate catalogue printing'))
    }
  }
  if (canUseSameLanguageFallback) {
    for (const url of uniqueUrls([baseProxyUrl, baseDirectUrl])) {
      imageCandidates.push({
        url,
        kind: 'base-fallback',
        printingKey: '',
        cardKey: printing.card_key || '',
        cardNumber: String(cardNumber || ''),
        language,
        originalImageUrl: '',
        source: 'Bandai official same-language base-card image',
      })
    }
  }
  const imageUrls = uniqueUrls([...exactUrls, ...alternateUrls, baseProxyUrl, baseDirectUrl])

  const usesAlternateOfficialFallback = !exactOfficial && !exactProductPhoto && alternateUrls.length > 0
  const hasExactImage = Boolean(exactOfficial || exactProductPhoto || exactOtherSourceImage)
  const usesBaseImageFallback = !hasExactImage && !usesAlternateOfficialFallback && Boolean(baseProxyUrl || baseDirectUrl)
  let source = 'No image reference'
  if (exactOfficial) source = 'Bandai official ' + (printing.site === 'jp' ? 'Japanese' : 'English') + ' printing image'
  else if (exactProductPhoto) source = 'Catalogue product image (TCGPlayer / TCGCSV source)'
  else if (exactOtherSourceImage) source = printing.site === 'cn' ? 'Chinese catalogue source image' : 'Third-party catalogue image source'
  else if (usesAlternateOfficialFallback) source = language === 'cn'
    ? 'Chinese catalogue alternate printing image (exact finish may differ)'
    : 'Bandai official alternate printing image (exact finish may differ)'
  else if (usesBaseImageFallback) source = 'Bandai official ' + (language === 'jp' ? 'Japanese' : 'English') + ' base-card image (special finish may differ)'

  return {
    imageUrl: imageUrls[0] || '',
    imageUrls,
    fallbackImageUrl: imageUrls[1] || '',
    source,
    usesBaseImageFallback,
    usesAlternateOfficialFallback,
  }
}
