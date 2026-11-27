import assert from 'node:assert/strict'
import test from 'node:test'
import { handleCardImageProxy, resolveCardImageTarget } from '../src/cardImageProxy.js'

test('resolves English Bandai image IDs to a fixed host and official Referer', () => {
  const target = resolveCardImageTarget('https://archive.example/_card-image/bandai/en/OP01-036.png')
  assert.equal(target.url.toString(), 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-036.png')
  assert.equal(target.referer, 'https://en.onepiece-cardgame.com/cardlist/')
  assert.equal(target.kind, 'bandai')
})

test('resolves Japanese Bandai printings to the Japanese official host', () => {
  const target = resolveCardImageTarget('https://archive.example/_card-image/bandai/jp/OP18-001_p1.png')
  assert.equal(target.url.toString(), 'https://www.onepiece-cardgame.com/images/cardlist/card/OP18-001_p1.png')
  assert.equal(target.referer, 'https://www.onepiece-cardgame.com/cardlist/')
})

test('rejects malformed Bandai IDs and arbitrary external URLs', () => {
  assert.equal(resolveCardImageTarget('https://archive.example/_card-image/bandai/en/../../secret.png'), null)
  assert.equal(resolveCardImageTarget('https://archive.example/_card-image/bandai/en/OP18-9999.png'), null)
  assert.equal(resolveCardImageTarget('https://archive.example/_card-image/external?url=https%3A%2F%2Fevil.example%2Fsecret.png'), null)
  assert.equal(resolveCardImageTarget('https://archive.example/_card-image/external?url=http%3A%2F%2Ftcgplayer-cdn.tcgplayer.com%2Fproduct%2F123_in_1000x1000.jpg'), null)
})

test('resolves allowlisted TCGPlayer and Chinese catalogue image URLs', () => {
  const tcg = resolveCardImageTarget('https://archive.example/_card-image/external?url=' + encodeURIComponent('https://tcgplayer-cdn.tcgplayer.com/product/620759_in_1000x1000.jpg'))
  const cn = resolveCardImageTarget('https://archive.example/_card-image/external?url=' + encodeURIComponent('https://source.windoent.com/OnePiecePc/Picture/card-01.png'))
  assert.equal(tcg.url.hostname, 'tcgplayer-cdn.tcgplayer.com')
  assert.equal(cn.url.hostname, 'source.windoent.com')
})

test('fetches Bandai bytes with official Referer and returns a cacheable image response', async () => {
  let called
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png'),
    async (url, options) => {
      called = { url, options }
      return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'Content-Type': 'image/png', 'Content-Length': '4' } })
    },
  )
  assert.equal(called.url, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-036.png')
  assert.equal(called.options.headers.Referer, 'https://en.onepiece-cardgame.com/cardlist/')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.match(response.headers.get('cache-control'), /max-age=86400/)
  assert.equal((await response.arrayBuffer()).byteLength, 4)
})

test('does not follow redirects to untrusted hosts', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png'),
    async () => new Response(null, { status: 302, headers: { Location: 'https://evil.example/steal.png' } }),
  )
  assert.equal(response.status, 502)
})

test('rejects non-image upstream responses', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png'),
    async () => new Response('<html>blocked</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
  )
  assert.equal(response.status, 502)
})

test('permits HEAD but rejects other methods', async () => {
  const head = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png', { method: 'HEAD' }),
    async () => new Response(null, { status: 200, headers: { 'Content-Type': 'image/png' } }),
  )
  const post = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png', { method: 'POST' }),
    async () => { throw new Error('must not fetch') },
  )
  assert.equal(head.status, 200)
  assert.equal(post.status, 405)
})

test('reports upstream denial status without caching generic proxy failures', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/ST04-008_p1.png'),
    async () => new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } }),
  )
  assert.equal(response.status, 502)
  assert.equal(response.headers.get('x-card-image-source-host'), 'en.onepiece-cardgame.com')
  assert.equal(response.headers.get('x-card-image-upstream-status'), '403')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(await response.text(), 'Card image source returned HTTP 403')
})

test('preserves a genuine upstream 404 as a not-found response', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/ST04-008_p1.png'),
    async () => new Response('Not found', { status: 404 }),
  )
  assert.equal(response.status, 404)
  assert.equal(response.headers.get('x-card-image-upstream-status'), '404')
  assert.equal(await response.text(), 'Card image source returned HTTP 404')
})


test('returns a distinct 504 diagnostic when the upstream fetch times out', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png'),
    async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }),
  )
  assert.equal(response.status, 504)
  assert.equal(response.headers.get('x-card-image-error'), 'upstream-timeout')
  assert.match(await response.text(), /timed out/)
})


test('preserves a genuine upstream 410 as a gone response and marks it missing', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/ST04-008_p1.png'),
    async () => new Response('Gone', { status: 410 }),
  )
  assert.equal(response.status, 410)
  assert.equal(response.headers.get('x-card-image-upstream-status'), '410')
  assert.equal(response.headers.get('x-card-image-error'), 'upstream-gone')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('keeps upstream 5xx distinct from confirmed missing images', async () => {
  for (const status of [500, 503]) {
    const response = await handleCardImageProxy(
      new Request('https://archive.example/_card-image/bandai/en/OP01-036.png'),
      async () => new Response('Unavailable', { status }),
    )
    assert.equal(response.status, 502)
    assert.equal(response.headers.get('x-card-image-upstream-status'), String(status))
    assert.equal(response.headers.get('x-card-image-error'), 'upstream-http-error')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('marks network failures temporary and never caches them', async () => {
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/en/OP01-036.png'),
    async () => { throw new TypeError('network unavailable') },
  )
  assert.equal(response.status, 502)
  assert.equal(response.headers.get('x-card-image-error'), 'upstream-network-error')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('configures edge caching for successful images only', async () => {
  let calledOptions
  const response = await handleCardImageProxy(
    new Request('https://archive.example/_card-image/bandai/jp/OP18-001.png'),
    async (_url, options) => {
      calledOptions = options
      return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { 'Content-Type': 'image/png' } })
    },
  )
  assert.equal(response.status, 200)
  assert.deepEqual(calledOptions.cf.cacheTtlByStatus, { '200-299': 86400, '400-599': 0 })
  assert.match(response.headers.get('cache-control'), /max-age=86400/)
})
