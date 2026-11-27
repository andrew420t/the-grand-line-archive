const BANDAl_HOSTS = {
  en: 'en.onepiece-cardgame.com',
  jp: 'www.onepiece-cardgame.com',
}

const IMAGE_ID_PATTERN = /^(?:(?:OP|EB|ST|PRB)\d{2}|P)-\d{3}(?:_[a-z]\d+)?$/i
const IMAGE_TYPE_PATTERN = /^image\/(?:png|jpeg|webp|gif|avif)$/i
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Timing-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
}

function errorResponse(message: string, status: number, extra: Record<string, string> = {}) {
  return new Response(message, {
    status,
    headers: {
      ...responseHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    },
  })
}

function isRedirect(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse('Method not allowed', 405, { Allow: 'GET, HEAD, OPTIONS' })
  }

  const requestUrl = new URL(request.url)
  const language = (requestUrl.searchParams.get('language') || '').toLowerCase()
  const imageId = (requestUrl.searchParams.get('id') || '').replace(/\.png$/i, '')

  if (!Object.hasOwn(BANDAl_HOSTS, language)) return errorResponse('Unsupported image language', 400)
  if (!IMAGE_ID_PATTERN.test(imageId)) return errorResponse('Unsupported card image ID', 400)

  const host = BANDAl_HOSTS[language as keyof typeof BANDAl_HOSTS]
  let target = new URL(`https://${host}/images/cardlist/card/${encodeURIComponent(imageId)}.png`)
  let upstream: Response | null = null

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    try {
      upstream = await fetch(target.toString(), {
        method: request.method,
        redirect: 'manual',
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: `https://${host}/cardlist/`,
        },
      })
    } catch (error) {
      const detail = error instanceof Error ? error.name : 'network-error'
      return errorResponse('Bandai image source is temporarily unavailable', 502, {
        'X-Card-Image-Source-Host': host,
        'X-Card-Image-Upstream-Error': detail,
      })
    }

    if (!isRedirect(upstream.status)) break

    const location = upstream.headers.get('location')
    if (!location || redirectCount === 3) {
      return errorResponse('Bandai image source returned an invalid redirect', 502, {
        'X-Card-Image-Source-Host': host,
        'X-Card-Image-Upstream-Status': String(upstream.status),
      })
    }

    let redirected: URL
    try {
      redirected = new URL(location, target)
    } catch {
      return errorResponse('Bandai image source returned an invalid redirect', 502)
    }

    if (
      redirected.protocol !== 'https:' ||
      redirected.username ||
      redirected.password ||
      redirected.port ||
      redirected.hostname !== host ||
      !/^\/images\/cardlist\/card\/[a-z0-9_-]+\.png$/i.test(redirected.pathname)
    ) {
      return errorResponse('Bandai image redirect is not allowed', 502)
    }
    target = redirected
  }

  if (!upstream || !upstream.ok) {
    const upstreamStatus = upstream?.status || 0
    return errorResponse(
      upstreamStatus ? `Bandai image source returned HTTP ${upstreamStatus}` : 'Bandai image source returned no response',
      upstreamStatus === 404 ? 404 : 502,
      {
        'X-Card-Image-Source-Host': host,
        'X-Card-Image-Upstream-Status': String(upstreamStatus || 'unavailable'),
      },
    )
  }

  const contentType = upstream.headers.get('content-type') || ''
  if (!IMAGE_TYPE_PATTERN.test(contentType)) {
    return errorResponse('Bandai image source returned a non-image response', 502, {
      'X-Card-Image-Source-Host': host,
      'X-Card-Image-Upstream-Status': String(upstream.status),
      'X-Card-Image-Upstream-Type': contentType || 'missing',
    })
  }

  const contentLength = Number(upstream.headers.get('content-length') || 0)
  if (contentLength > MAX_IMAGE_BYTES) return errorResponse('Card image exceeds the allowed size', 413)

  const headers = new Headers({
    ...responseHeaders,
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    'X-Card-Image-Source-Host': host,
    'X-Card-Image-Upstream-Status': String(upstream.status),
  })
  if (upstream.headers.get('content-length')) headers.set('Content-Length', upstream.headers.get('content-length'))

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: 200,
    headers,
  })
})
