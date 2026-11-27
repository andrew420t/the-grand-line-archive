import assert from 'node:assert/strict'
import test from 'node:test'
import {
  IMAGE_CHECK_STATUS,
  auditCatalogueImageRecord,
  buildCatalogueImageCandidates,
  runResumableCatalogueAudit,
  dedupeCatalogueAuditRecords,
  buildImageAuditSummary,
  classifyImageResponse,
  dedupeImageCandidates,
  loadImageWithRetry,
  mapWithConcurrency,
} from '../src/admin/imageAuditUtils.js'

test('classifies missing, temporary, timeout, invalid and successful image responses separately', () => {
  assert.equal(classifyImageResponse({ status: 404 }), IMAGE_CHECK_STATUS.MISSING)
  assert.equal(classifyImageResponse({ status: 502, upstreamStatus: 404 }), IMAGE_CHECK_STATUS.MISSING)
  assert.equal(classifyImageResponse({ status: 502, upstreamStatus: 503 }), IMAGE_CHECK_STATUS.TEMPORARY_FAILURE)
  assert.equal(classifyImageResponse({ status: 503 }), IMAGE_CHECK_STATUS.TEMPORARY_FAILURE)
  assert.equal(classifyImageResponse({ timedOut: true }), IMAGE_CHECK_STATUS.TIMEOUT)
  assert.equal(classifyImageResponse({ invalidUrl: true }), IMAGE_CHECK_STATUS.INVALID_URL)
  assert.equal(classifyImageResponse({ status: 200, contentType: 'image/png' }), IMAGE_CHECK_STATUS.EXACT_LOADED)
  assert.equal(classifyImageResponse({ status: 200, contentType: 'text/html' }), IMAGE_CHECK_STATUS.INVALID_URL)
})

test('deduplicates image candidates while preserving their priority', () => {
  assert.deepEqual(dedupeImageCandidates(['/proxy/a.png', '/proxy/a.png', 'https://site/a.png', '']), ['/proxy/a.png', 'https://site/a.png'])
})

test('retries transient image failures but does not retry a definitive 404', async () => {
  let calls = 0
  const result = await loadImageWithRetry('https://images.example/card.png', {
    attempts: 3, retryDelayMs: 0, sleep: async () => {},
    fetchImpl: async () => {
      calls += 1
      return calls === 1
        ? new Response('busy', { status: 503 })
        : new Response(new Blob(['image']), { status: 200, headers: { 'content-type': 'image/png' } })
    },
  })
  assert.equal(result.status, IMAGE_CHECK_STATUS.EXACT_LOADED)
  assert.equal(calls, 2)

  calls = 0
  const missing = await loadImageWithRetry('https://images.example/missing.png', {
    attempts: 3, retryDelayMs: 0, sleep: async () => {},
    fetchImpl: async () => { calls += 1; return new Response('', { status: 404 }) },
  })
  assert.equal(missing.status, IMAGE_CHECK_STATUS.MISSING)
  assert.equal(calls, 1)
})

test('reports timeout distinctly', async () => {
  const result = await loadImageWithRetry('https://images.example/slow.png', {
    attempts: 1, timeoutMs: 1,
    fetchImpl: (_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }),
  })
  assert.equal(result.status, IMAGE_CHECK_STATUS.TIMEOUT)
})

test('limits concurrent image probes and preserves result order', async () => {
  let active = 0, maximum = 0
  const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1
    maximum = Math.max(maximum, active)
    await Promise.resolve()
    active -= 1
    return value * 2
  })
  assert.equal(maximum, 2)
  assert.deepEqual(result, [2, 4, 6, 8, 10])
})

test('audit summary makes unchecked and not-yet-processed references visible', () => {
  const summary = buildImageAuditSummary([
    { status: IMAGE_CHECK_STATUS.EXACT_LOADED },
    { status: IMAGE_CHECK_STATUS.TIMEOUT },
    { status: IMAGE_CHECK_STATUS.MISSING },
  ], 10)
  assert.equal(summary.checked, 3)
  assert.equal(summary.remaining, 7)
  assert.equal(summary.counts[IMAGE_CHECK_STATUS.EXACT_LOADED], 1)
  assert.equal(summary.counts[IMAGE_CHECK_STATUS.TIMEOUT], 1)
  assert.equal(summary.counts[IMAGE_CHECK_STATUS.MISSING], 1)
})

test('deduplicates candidate URLs without changing their priority', () => {
  assert.deepEqual(dedupeImageCandidates(['/proxy/card.png', '/proxy/card.png', 'https://cdn.example/card.png', '']), ['/proxy/card.png', 'https://cdn.example/card.png'])
})

test('probes same-origin Cloudflare proxy paths without treating them as invalid URLs', async () => {
  let requested
  const result = await loadImageWithRetry('/_card-image/bandai/en/OP18-001.png', {
    attempts: 1,
    fetchImpl: async (url) => {
      requested = url
      return new Response(new Blob(['image']), { status: 200, headers: { 'content-type': 'image/png' } })
    },
  })
  assert.equal(requested, '/_card-image/bandai/en/OP18-001.png')
  assert.equal(result.status, IMAGE_CHECK_STATUS.EXACT_LOADED)
})


test('retains Worker upstream diagnostics and classifies proxied upstream 404 as missing', async () => {
  const result = await loadImageWithRetry('/_card-image/bandai/en/OP18-001.png', {
    attempts: 1,
    fetchImpl: async () => new Response('Card image source returned HTTP 404', {
      status: 502,
      headers: {
        'content-type': 'text/plain',
        'x-card-image-upstream-status': '404',
        'x-card-image-error': 'upstream-http-error',
      },
    }),
  })
  assert.equal(result.status, IMAGE_CHECK_STATUS.MISSING)
  assert.equal(result.httpStatus, 502)
  assert.equal(result.upstreamStatus, 404)
  assert.equal(result.proxyError, 'upstream-http-error')
})


test('retains upstream 5xx diagnostics after exhausting transient retries', async () => {
  const result = await loadImageWithRetry('/_card-image/bandai/jp/OP18-001.png', {
    attempts: 2,
    retryDelayMs: 0,
    sleep: async () => {},
    fetchImpl: async () => new Response('upstream unavailable', {
      status: 502,
      headers: {
        'content-type': 'text/plain',
        'x-card-image-upstream-status': '503',
        'x-card-image-error': 'upstream-http-error',
      },
    }),
  })
  assert.equal(result.status, IMAGE_CHECK_STATUS.TEMPORARY_FAILURE)
  assert.equal(result.httpStatus, 502)
  assert.equal(result.upstreamStatus, 503)
  assert.equal(result.proxyError, 'upstream-http-error')
  assert.equal(result.attempts, 2)
})

test('classifies upstream 410 as confirmed missing without retrying', async () => {
  let calls = 0
  const result = await loadImageWithRetry('/_card-image/bandai/en/OP01-001.png', {
    attempts: 3,
    fetchImpl: async () => { calls += 1; return new Response('Gone', { status: 410, headers: { 'x-card-image-upstream-status': '410' } }) },
  })
  assert.equal(result.status, IMAGE_CHECK_STATUS.MISSING)
  assert.equal(calls, 1)
})

test('keeps a catalogue record with no image candidates separate from missing', async () => {
  const result = await auditCatalogueImageRecord({ id: 'en-no-ref', languageCode: 'en', imageCandidates: [] }, { language: 'en' })
  assert.equal(result.status, IMAGE_CHECK_STATUS.NO_REFERENCE)
})

test('rejects cross-language candidates before requesting them', async () => {
  let calls = 0
  const result = await auditCatalogueImageRecord({
    id: 'jp-record', languageCode: 'jp',
    imageCandidates: [{ url: 'https://example.test/en.png', kind: 'exact' }],
  }, { language: 'en', fetchImpl: async () => { calls += 1; throw new Error('must not fetch') } })
  assert.equal(result.status, IMAGE_CHECK_STATUS.INVALID_URL)
  assert.equal(result.diagnostic, 'language-mismatch')
  assert.equal(calls, 0)
})

test('distinguishes successfully loaded alternative and base-card fallback artwork', async () => {
  const fetchImpl = async () => new Response(new Blob(['image']), { status: 200, headers: { 'content-type': 'image/png' } })
  const alternative = await auditCatalogueImageRecord({
    id: 'alt', languageCode: 'en',
    imageCandidates: [{ url: '/_card-image/bandai/en/OP01-001_p1.png', kind: 'alternative' }],
  }, { language: 'en', fetchImpl, attempts: 1 })
  const base = await auditCatalogueImageRecord({
    id: 'base', languageCode: 'jp',
    imageCandidates: [{ url: '/_card-image/bandai/jp/OP01-001.png', kind: 'base-fallback' }],
  }, { language: 'jp', fetchImpl, attempts: 1 })
  assert.equal(alternative.status, IMAGE_CHECK_STATUS.ALTERNATIVE_LOADED)
  assert.equal(base.status, IMAGE_CHECK_STATUS.BASE_FALLBACK_LOADED)
  assert.notEqual(alternative.status, IMAGE_CHECK_STATUS.EXACT_LOADED)
  assert.notEqual(base.status, IMAGE_CHECK_STATUS.EXACT_LOADED)
})

test('deduplicates catalogue audit entries by stable record identity', () => {
  const first = { id: 'en:OP01-001:base', languageCode: 'en' }
  const duplicate = { ...first, label: 'duplicate product link' }
  const jp = { id: 'jp:OP01-001:base', languageCode: 'jp' }
  assert.deepEqual(dedupeCatalogueAuditRecords([first, duplicate, jp]), [first, jp])
})

test('classifies HTTP 429 and 5xx as temporary and preserves upstream diagnostics', async () => {
  for (const status of [429, 503]) {
    const result = await loadImageWithRetry('/_card-image/bandai/en/OP01-001.png', {
      attempts: 1,
      fetchImpl: async () => new Response('Temporary', { status, headers: { 'x-card-image-upstream-status': String(status), 'x-card-image-error': 'upstream-http-error' } }),
    })
    assert.equal(result.status, IMAGE_CHECK_STATUS.TEMPORARY_FAILURE)
    assert.equal(result.upstreamStatus, status)
    assert.equal(result.proxyError, 'upstream-http-error')
  }
})

test('candidate builder uses explicit provenance and does not infer alternate from URL order', () => {
  const candidates = buildCatalogueImageCandidates({
    languageCode: 'en',
    imageUrl: '/_card-image/bandai/en/OP01-001.png',
    imageUrls: ['/first.png', '/second.png'],
    source: 'Bandai',
  })
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].kind, 'exact')
  const fallback = buildCatalogueImageCandidates({
    languageCode: 'en',
    usesBaseImageFallback: true,
    imageUrl: '/_card-image/bandai/en/OP01-001.png',
    source: 'Bandai base fallback',
  })
  assert.equal(fallback[0].kind, 'base-fallback')
})

test('audit attempts exact, then explicit same-language alternative and never labels fallback exact', async () => {
  const record = {
    id: 'en-printing', printingKey: 'printing-1', languageCode: 'en', setCode: 'OP-01',
    exactImageUrl: '/_card-image/bandai/en/OP01-001_p1.png',
    alternativeImageCandidates: [{ url: '/_card-image/bandai/en/OP01-001_p2.png', language: 'en', source: 'Bandai alternative' }],
    baseFallbackCandidates: [{ url: '/_card-image/bandai/en/OP01-001.png', language: 'en', source: 'Bandai base' }],
  }
  const fetchImpl = async (url) => url.includes('_p1')
    ? new Response('missing', { status: 404 })
    : new Response(new Blob(['image']), { status: 200, headers: { 'content-type': 'image/png' } })
  const result = await auditCatalogueImageRecord(record, { language: 'en', fetchImpl, attempts: 1 })
  assert.equal(result.status, IMAGE_CHECK_STATUS.ALTERNATIVE_LOADED)
  assert.equal(result.candidateResults.length, 2)
  assert.equal(result.candidateResults[1].candidateKind, 'alternative')
})

test('resumable audit queue keeps English and Japanese records separate', async () => {
  const records = [
    { id: 'one', printingKey: 'one', languageCode: 'en', setCode: 'OP-01' },
    { id: 'two', printingKey: 'two', languageCode: 'jp', setCode: 'OP-01' },
    { id: 'one-duplicate', printingKey: 'one', languageCode: 'en', setCode: 'OP-01' },
  ]
  const result = await runResumableCatalogueAudit(records, {
    language: 'en',
    auditRecord: async (record) => ({ ...record, status: IMAGE_CHECK_STATUS.NO_REFERENCE }),
  })
  assert.equal(result.total, 1)
  assert.equal(result.completed, 1)
  assert.equal(result.results[0].languageCode, 'en')
})


test('rejects candidate descriptors without verifiable language or matching identity', async () => {
  let calls = 0
  const result = await auditCatalogueImageRecord({
    id: 'unknown-lang', languageCode: 'en', printingKey: 'print-1', cardKey: 'card-1',
    imageCandidates: [{ url: 'https://images.example/card.png', kind: 'exact', printingKey: 'print-1', cardKey: 'card-2' }],
  }, { language: 'en', fetchImpl: async () => { calls += 1; throw new Error('must not fetch') } })
  assert.equal(result.status, IMAGE_CHECK_STATUS.INVALID_URL)
  assert.equal(result.diagnostic, 'candidate-language-or-identity-unverified')
  assert.equal(calls, 0)
})

test('caps requested retry attempts at five', async () => {
  let calls = 0
  const result = await loadImageWithRetry('https://images.example/card.png', {
    attempts: 99, retryDelayMs: 0, sleep: async () => {},
    fetchImpl: async () => { calls += 1; return new Response('busy', { status: 503 }) },
  })
  assert.equal(result.status, IMAGE_CHECK_STATUS.TEMPORARY_FAILURE)
  assert.equal(result.attempts, 5)
  assert.equal(calls, 5)
})

test('retains printing provenance and candidate types from catalogue descriptors', () => {
  const candidates = buildCatalogueImageCandidates({
    id: 'print-1:en:product',
    printingKey: 'print-1',
    cardKey: 'card-1',
    cardNumber: 'OP01-001',
    languageCode: 'en',
    setCode: 'OP-01',
    rarity: 'SEC',
    variant: 'Parallel',
    imageCandidates: [
      { url: '/_card-image/bandai/en/OP01-001_p1.png', kind: 'exact', language: 'en', printingKey: 'print-1', cardKey: 'card-1', cardNumber: 'OP01-001', setCode: 'OP-01', rarity: 'SEC', variant: 'Parallel', originalImageUrl: 'https://en.onepiece-cardgame.com/source.png', source: 'Bandai locator' },
      { url: '/_card-image/bandai/en/OP01-001_p2.png', kind: 'alternative', language: 'en', printingKey: 'print-2', cardKey: 'card-1', cardNumber: 'OP01-001', source: 'Bandai alternate locator' },
      { url: '/_card-image/bandai/en/OP01-001.png', kind: 'base-fallback', language: 'en', cardKey: 'card-1', cardNumber: 'OP01-001', source: 'Bandai base image' },
    ],
  })
  assert.deepEqual(candidates.map((item) => item.kind), ['exact', 'alternative', 'base-fallback'])
  assert.equal(candidates[0].printingKey, 'print-1')
  assert.equal(candidates[1].printingKey, 'print-2')
  assert.equal(candidates[0].originalImageUrl, 'https://en.onepiece-cardgame.com/source.png')
  assert.equal(candidates[0].rarity, 'SEC')
  assert.equal(candidates[0].variant, 'Parallel')
})
