export const IMAGE_CHECK_STATUS = Object.freeze({
  UNCHECKED: 'unchecked',
  NO_REFERENCE: 'no-image-reference',
  ALTERNATIVE_LOADED: 'alternative-loaded',
  BASE_FALLBACK_LOADED: 'base-fallback-loaded',
  EXACT_LOADED: 'exact-loaded',
  FALLBACK_LOADED: 'fallback-loaded',
  MISSING: 'missing',
  TEMPORARY_FAILURE: 'temporary-failure',
  TIMEOUT: 'timeout',
  INVALID_URL: 'invalid-url',
})

export function classifyImageResponse({ status = 0, upstreamStatus = 0, contentType = '', timedOut = false, invalidUrl = false } = {}) {
  if (invalidUrl) return IMAGE_CHECK_STATUS.INVALID_URL
  if (timedOut) return IMAGE_CHECK_STATUS.TIMEOUT
  // The Worker maps upstream failures to 502; inspect its diagnostic header
  // before deciding whether the original card image is genuinely missing.
  const sourceStatus = Number(upstreamStatus) || status
  if (sourceStatus === 404 || sourceStatus === 410) return IMAGE_CHECK_STATUS.MISSING
  if (sourceStatus >= 500 || sourceStatus === 408 || sourceStatus === 429 || sourceStatus === 0) return IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
  if (status >= 500 || status === 408 || status === 429 || status === 0) return IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
  if (status >= 200 && status < 300 && /^image\/(png|jpeg|webp|gif|avif)$/i.test(contentType)) return IMAGE_CHECK_STATUS.EXACT_LOADED
  return IMAGE_CHECK_STATUS.INVALID_URL
}

export function buildImageAuditSummary(results = [], expectedTotal = results.length) {
  const counts = Object.fromEntries(Object.values(IMAGE_CHECK_STATUS).map((status) => [status, 0]))
  for (const item of results) {
    const status = item.status || IMAGE_CHECK_STATUS.UNCHECKED
    counts[status] = (counts[status] || 0) + 1
  }
  return { expectedTotal, checked: results.length, remaining: Math.max(0, expectedTotal - results.length), counts }
}

export function dedupeImageCandidates(candidates = []) {
  return [...new Set(candidates.filter((candidate) => typeof candidate === 'string' && candidate.trim()))]
}

/**
 * Retry an image candidate with bounded attempts and delay. A 404 is definitive;
 * timeouts, 429s, 5xx and network errors may be transient.
 */
export async function loadImageWithRetry(url, {
  fetchImpl = fetch,
  attempts = 2,
  timeoutMs = 10000,
  retryDelayMs = 350,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (typeof url !== 'string' || (!/^https:\/\//i.test(url) && !url.startsWith('/_card-image/'))) {
    return { status: IMAGE_CHECK_STATUS.INVALID_URL, url: String(url || ''), attempts: 0 }
  }
  let lastStatus = IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
  let lastHttpStatus = 0
  let lastUpstreamStatus = 0
  let lastProxyError = ''
  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, { method: 'GET', signal: controller.signal, mode: 'cors', cache: 'no-cache' })
      const contentType = response.headers?.get?.('content-type') || ''
      lastHttpStatus = response.status
      if (response.ok && /^image\/(png|jpeg|webp|gif|avif)$/i.test(contentType)) {
        return { status: IMAGE_CHECK_STATUS.EXACT_LOADED, url, attempts: attempt, httpStatus: response.status, contentType, upstreamStatus: response.headers?.get?.('x-card-image-upstream-status') || '', proxyError: response.headers?.get?.('x-card-image-error') || '' }
      }
      const upstreamStatus = Number(response.headers?.get?.('x-card-image-upstream-status') || 0)
      const proxyError = response.headers?.get?.('x-card-image-error') || ''
      lastUpstreamStatus = upstreamStatus
      lastProxyError = proxyError
      lastStatus = classifyImageResponse({ status: response.status, upstreamStatus, contentType })
      if ([IMAGE_CHECK_STATUS.MISSING, IMAGE_CHECK_STATUS.INVALID_URL].includes(lastStatus)) {
        return { status: lastStatus, url, attempts: attempt, httpStatus: response.status, upstreamStatus, proxyError, contentType }
      }
    } catch (error) {
      lastStatus = error?.name === 'AbortError' ? IMAGE_CHECK_STATUS.TIMEOUT : IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < attempts) await sleep(retryDelayMs * attempt)
  }
  return { status: lastStatus, url, attempts: Math.max(1, attempts), httpStatus: lastHttpStatus, upstreamStatus: lastUpstreamStatus, proxyError: lastProxyError }
}

/** Run bounded concurrent jobs while retaining input order. */
export async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length)
  let next = 0
  const run = async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(items.length || 1, concurrency || 1)) }, () => run())
  await Promise.all(workers)
  return results
}

/**
 * Audit one catalogue record without conflating absent references with broken
 * URLs. Candidate descriptors are ordered exact -> same-language alternative
 * -> same-language base fallback. The caller must not mix language pools.
 */
export async function auditCatalogueImageRecord(record, {
  language,
  fetchImpl = fetch,
  attempts = 2,
  timeoutMs = 10000,
  retryDelayMs = 350,
  sleep,
} = {}) {
  const recordLanguage = record?.languageCode || record?.language || ''
  if (!['en', 'jp'].includes(language) || recordLanguage !== language) {
    return { ...record, status: IMAGE_CHECK_STATUS.INVALID_URL, diagnostic: 'language-mismatch', checkedAt: new Date().toISOString() }
  }
  const candidates = Array.isArray(record.imageCandidates)
    ? record.imageCandidates
    : [
        ...(record.exactImageUrls || (record.imageUrl ? [{ url: record.imageUrl, kind: 'exact' }] : [])),
        ...(record.alternativeImageUrls || []).map((url) => ({ url, kind: 'alternative' })),
        ...(record.baseFallbackImageUrls || []).map((url) => ({ url, kind: 'base-fallback' })),
      ]
  const validCandidates = candidates.filter((candidate) => candidate?.url)
  if (!validCandidates.length) {
    return { ...record, status: IMAGE_CHECK_STATUS.NO_REFERENCE, checkedUrl: '', checkedAt: new Date().toISOString() }
  }
  let lastResult = null
  for (const candidate of validCandidates) {
    const result = await loadImageWithRetry(candidate.url, { fetchImpl, attempts, timeoutMs, retryDelayMs, ...(sleep ? { sleep } : {}) })
    lastResult = { ...result, candidateKind: candidate.kind || 'exact' }
    if (result.status === IMAGE_CHECK_STATUS.EXACT_LOADED) {
      const status = candidate.kind === 'base-fallback' ? IMAGE_CHECK_STATUS.BASE_FALLBACK_LOADED
        : candidate.kind === 'alternative' ? IMAGE_CHECK_STATUS.ALTERNATIVE_LOADED
          : IMAGE_CHECK_STATUS.EXACT_LOADED
      return { ...record, ...lastResult, status, checkedAt: new Date().toISOString() }
    }
    // Do not turn a transient failure into a missing-image result merely
    // because a later fallback also failed. Preserve the final diagnostic.
    if ([IMAGE_CHECK_STATUS.TEMPORARY_FAILURE, IMAGE_CHECK_STATUS.TIMEOUT].includes(result.status)) continue
  }
  return { ...record, ...lastResult, checkedAt: new Date().toISOString() }
}

/** Stable identity prevents repeated product links from inflating audit totals. */
export function dedupeCatalogueAuditRecords(records = []) {
  const unique = new Map()
  for (const record of records) {
    const key = record.id || [record.printingKey, record.languageCode, record.setCode].join(':')
    if (key && !unique.has(key)) unique.set(key, record)
  }
  return [...unique.values()]
}
