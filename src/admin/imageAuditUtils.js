export const IMAGE_CHECK_STATUS = Object.freeze({
  UNCHECKED: 'unchecked',
  EXACT_LOADED: 'exact-loaded',
  FALLBACK_LOADED: 'fallback-loaded',
  MISSING: 'missing',
  TEMPORARY_FAILURE: 'temporary-failure',
  TIMEOUT: 'timeout',
  INVALID_URL: 'invalid-url',
})

export function classifyImageResponse({ status = 0, contentType = '', timedOut = false, invalidUrl = false } = {}) {
  if (invalidUrl) return IMAGE_CHECK_STATUS.INVALID_URL
  if (timedOut) return IMAGE_CHECK_STATUS.TIMEOUT
  if (status === 404 || status === 410) return IMAGE_CHECK_STATUS.MISSING
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
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    return { status: IMAGE_CHECK_STATUS.INVALID_URL, url: String(url || ''), attempts: 0 }
  }
  let lastStatus = IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
  let lastHttpStatus = 0
  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, { method: 'GET', signal: controller.signal, mode: 'cors', cache: 'no-cache' })
      const contentType = response.headers?.get?.('content-type') || ''
      lastHttpStatus = response.status
      if (response.ok && /^image\/(png|jpeg|webp|gif|avif)$/i.test(contentType)) {
        return { status: IMAGE_CHECK_STATUS.EXACT_LOADED, url, attempts: attempt, httpStatus: response.status, contentType }
      }
      lastStatus = classifyImageResponse({ status: response.status, contentType })
      if ([IMAGE_CHECK_STATUS.MISSING, IMAGE_CHECK_STATUS.INVALID_URL].includes(lastStatus)) {
        return { status: lastStatus, url, attempts: attempt, httpStatus: response.status, contentType }
      }
    } catch (error) {
      lastStatus = error?.name === 'AbortError' ? IMAGE_CHECK_STATUS.TIMEOUT : IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < attempts) await sleep(retryDelayMs * attempt)
  }
  return { status: lastStatus, url, attempts: Math.max(1, attempts), httpStatus: lastHttpStatus }
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
