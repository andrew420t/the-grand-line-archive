import assert from 'node:assert/strict'
import test from 'node:test'
import {
  IMAGE_CHECK_STATUS,
  buildImageAuditSummary,
  classifyImageResponse,
  dedupeImageCandidates,
  loadImageWithRetry,
  mapWithConcurrency,
} from '../src/admin/imageAuditUtils.js'

test('classifies missing, temporary, timeout, invalid and successful image responses separately', () => {
  assert.equal(classifyImageResponse({ status: 404 }), IMAGE_CHECK_STATUS.MISSING)
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
