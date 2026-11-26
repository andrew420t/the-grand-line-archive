const BANDAI_IMAGE_HOSTS = {
  en: 'en.onepiece-cardgame.com',
  jp: 'www.onepiece-cardgame.com',
}
const BANDAI_IMAGE_ID = /^(?:(?:OP|EB|ST|PRB)\d{2}|P)-\d{3}(?:_[a-z]\d+)?$/i
const TCGPLAYER_IMAGE_PATH = /^\/product\/\d+_in_\d+x\d+\.(?:jpe?g|png|webp)$/i
const CHINESE_IMAGE_PATH = /^\/OnePiecePc\/Picture\/[a-z0-9_.-]+\.(?:jpe?g|png|webp)$/i
const IMAGE_CONTENT_TYPE = /^image\/(?:png|jpeg|webp|gif|avif)$/i
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

function isAllowedExternalImageUrl(url) {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  if (url.hostname === 'tcgplayer-cdn.tcgplayer.com') return TCGPLAYER_IMAGE_PATH.test(url.pathname)
  if (url.hostname === 'source.windoent.com') return CHINESE_IMAGE_PATH.test(url.pathname)
  return false
}

export function resolveCardImageTarget(requestUrl) {
  const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl)
  const match = url.pathname.match(/^\/_card-image\/bandai\/(en|jp)\/([^/]+)$/i)
  if (match) {
    let imageId = ''
    try {
      imageId = decodeURIComponent(match[2]).replace(/\.png$/i, '')
    } catch {
      return null
    }
    if (!BANDAI_IMAGE_ID.test(imageId)) return null
    const language = match[1].toLowerCase()
    const host = BANDAI_IMAGE_HOSTS[language]
    return {
      url: new URL('https://' + host + '/images/cardlist/card/' + imageId + '.png'),
      referer: 'https://' + host + '/cardlist/',
      kind: 'bandai',
    }
  }

  if (url.pathname === '/_card-image/external') {
    const raw = url.searchParams.get('url')
    if (!raw) return null
    let target
    try {
      target = new URL(raw)
    } catch {
      return null
    }
    if (!isAllowedExternalImageUrl(target)) return null
    return { url: target, referer: 'https://' + target.hostname + '/', kind: 'external' }
  }

  return null
}

function isRedirect(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

function isAllowedRedirect(url, originalTarget) {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  if (originalTarget.kind === 'bandai') {
    return Object.values(BANDAI_IMAGE_HOSTS).includes(url.hostname)
      && /^\/images\/cardlist\/card\/[a-z0-9_-]+\.png$/i.test(url.pathname)
  }
  return isAllowedExternalImageUrl(url)
}

export async function handleCardImageProxy(request, fetchImpl = fetch) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } })
  }
  const original = resolveCardImageTarget(new URL(request.url))
  if (!original) return new Response('Unsupported card image source', { status: 404, headers: { 'Cache-Control': 'no-store' } })

  let target = original.url
  let upstream
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    try {
      upstream = await fetchImpl(target.toString(), {
        method: request.method,
        redirect: 'manual',
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: original.referer,
        },
        cf: { cacheTtl: 86400 },
      })
    } catch {
      return new Response('Card image source is temporarily unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } })
    }
    if (!isRedirect(upstream.status)) break
    const location = upstream.headers.get('location')
    if (!location || redirectCount === 3) return new Response('Card image source returned an invalid redirect', { status: 502 })
    let redirected
    try {
      redirected = new URL(location, target)
    } catch {
      return new Response('Card image source returned an invalid redirect', { status: 502 })
    }
    if (!isAllowedRedirect(redirected, original)) return new Response('Card image redirect is not allowlisted', { status: 502 })
    target = redirected
  }

  if (!upstream || !upstream.ok) {
    return new Response('Card image was not found at the source', {
      status: upstream?.status === 404 ? 404 : 502,
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  }
  const contentType = upstream.headers.get('content-type') || ''
  if (!IMAGE_CONTENT_TYPE.test(contentType)) return new Response('Card image source returned a non-image response', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  const contentLength = Number(upstream.headers.get('content-length') || 0)
  if (contentLength > MAX_IMAGE_BYTES) return new Response('Card image is larger than the allowed size', { status: 413, headers: { 'Cache-Control': 'no-store' } })

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  if (upstream.headers.get('content-length')) headers.set('Content-Length', upstream.headers.get('content-length'))
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: 200, headers })
}
