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
  const maxAttempts = Math.max(1, Math.min(5, Number.isFinite(Number(attempts)) ? Math.floor(Number(attempts)) : 2))
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, { method: 'GET', signal: controller.signal, mode: 'cors', cache: 'no-cache' })
      const contentType = response.headers?.get?.('content-type') || ''
      lastHttpStatus = response.status
      if (response.ok && /^image\/(png|jpeg|webp|gif|avif)$/i.test(contentType)) {
        return { status: IMAGE_CHECK_STATUS.EXACT_LOADED, url, candidateUrl: url, attempts: attempt, retryCount: attempt - 1, httpStatus: response.status, contentType, upstreamStatus: response.headers?.get?.('x-card-image-upstream-status') || '', proxyError: response.headers?.get?.('x-card-image-error') || '' }
      }
      const upstreamStatus = Number(response.headers?.get?.('x-card-image-upstream-status') || 0)
      const proxyError = response.headers?.get?.('x-card-image-error') || ''
      lastUpstreamStatus = upstreamStatus
      lastProxyError = proxyError
      lastStatus = classifyImageResponse({ status: response.status, upstreamStatus, contentType })
      if ([IMAGE_CHECK_STATUS.MISSING, IMAGE_CHECK_STATUS.INVALID_URL].includes(lastStatus)) {
        return { status: lastStatus, url, candidateUrl: url, attempts: attempt, retryCount: attempt - 1, httpStatus: response.status, upstreamStatus, proxyError, contentType }
      }
    } catch (error) {
      lastStatus = error?.name === 'AbortError' ? IMAGE_CHECK_STATUS.TIMEOUT : IMAGE_CHECK_STATUS.TEMPORARY_FAILURE
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < maxAttempts) await sleep(retryDelayMs * attempt)
  }
  return { status: lastStatus, url, candidateUrl: url, attempts: maxAttempts, retryCount: Math.max(0, maxAttempts - 1), httpStatus: lastHttpStatus, upstreamStatus: lastUpstreamStatus, proxyError: lastProxyError }
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
export function buildCatalogueImageCandidates(record) {
  const language = record?.languageCode || record?.language || ''
  if (!['en', 'jp'].includes(language)) return []
  const candidates = []
  const add = (descriptor) => {
    const url = typeof descriptor === 'string' ? descriptor : descriptor?.url
    const kind = typeof descriptor === 'string' ? '' : descriptor?.kind
    const declaredLanguage = typeof descriptor === 'string' ? '' : descriptor?.language
    const proxyLanguage = String(url || '').match(/^\/_card-image\/(?:bandai|external)\/(en|jp)\//i)?.[1]?.toLowerCase() || ''
    const candidateLanguage = declaredLanguage || proxyLanguage
    if (typeof url !== 'string' || !url.trim()) return
    if (!['exact', 'alternative', 'base-fallback'].includes(kind)) return
    if (candidateLanguage !== language) return
    if (descriptor?.cardKey && record?.cardKey && descriptor.cardKey !== record.cardKey) return
    if (descriptor?.cardNumber && record?.cardNumber && descriptor.cardNumber !== record.cardNumber) return
    if (descriptor?.printingKey && kind === 'exact' && descriptor.printingKey !== record.printingKey) return
    const identity = [url, kind, descriptor?.printingKey || ''].join(':')
    if (candidates.some((item) => item.identity === identity)) return
    candidates.push({
      url,
      kind,
      language: candidateLanguage,
      printingKey: descriptor?.printingKey || '',
      cardKey: descriptor?.cardKey || record?.cardKey || '',
      cardNumber: descriptor?.cardNumber || record?.cardNumber || '',
      setCode: descriptor?.setCode || record?.setCode || '',
      rarity: descriptor?.rarity || record?.rarity || '',
      variant: descriptor?.variant || record?.variant || '',
      originalImageUrl: descriptor?.originalImageUrl || '',
      source: descriptor?.source || record?.source || 'catalogue reference',
      identity,
    })
  }
  for (const descriptor of record?.imageCandidates || []) add(descriptor)
  if (record?.exactImageUrl && !candidates.some((item) => item.kind === 'exact')) {
    add({ url: record.exactImageUrl, kind: 'exact', language, printingKey: record.printingKey, cardKey: record.cardKey, cardNumber: record.cardNumber, source: record.exactImageSource })
  }
  // Explicit legacy fields remain supported for callers and tests, but their
  // language and candidate type must be declared rather than inferred by order.
  for (const candidate of record?.alternativeImageCandidates || []) add({ ...candidate, kind: 'alternative' })
  for (const candidate of record?.baseFallbackCandidates || []) add({ ...candidate, kind: 'base-fallback' })
  if (!candidates.length && record?.imageUrl && record?.languageCode === language &&
      !record.usesBaseImageFallback && !record.usesAlternateOfficialFallback) {
    add({ url: record.imageUrl, kind: 'exact', language, printingKey: record.printingKey, cardKey: record.cardKey, cardNumber: record.cardNumber, source: record.source })
  }
  if (record?.usesBaseImageFallback && record?.imageUrl) {
    const proxyLanguage = String(record.imageUrl).match(/^\/_card-image\/(?:bandai|external)\/(en|jp)\//i)?.[1]?.toLowerCase() || ''
    add({ url: record.imageUrl, kind: 'base-fallback', language: proxyLanguage, cardKey: record.cardKey, cardNumber: record.cardNumber, source: record.source })
  }
  if (record?.usesAlternateOfficialFallback && record?.imageUrl) {
    const proxyLanguage = String(record.imageUrl).match(/^\/_card-image\/(?:bandai|external)\/(en|jp)\//i)?.[1]?.toLowerCase() || ''
    add({ url: record.imageUrl, kind: 'alternative', language: proxyLanguage, cardKey: record.cardKey, cardNumber: record.cardNumber, source: record.source })
  }
  return candidates.map(({ identity, ...candidate }) => candidate)
}

/**
 * Apply an administrator-supplied image reference to one audit record.
 * The corrected URL is deliberately scoped to the record's existing language
 * and printing identity; it does not mutate the upstream catalogue feed.
 */
export function createCorrectedImageAuditRecord(record, correctedUrl, language) {
  const recordLanguage = record?.languageCode || record?.language || ''
  const url = String(correctedUrl || '').trim()
  if (!['en', 'jp'].includes(language) || recordLanguage !== language) {
    throw new Error('The corrected image language must match the audited record.')
  }
  if (!url || (!url.startsWith('https://') && !url.startsWith('/_card-image/')) || url.startsWith('//')) {
    throw new Error('Enter a valid HTTPS image URL or a same-origin card-image proxy path.')
  }
  const candidate = {
    url,
    kind: 'exact',
    language,
    printingKey: record?.printingKey || '',
    cardKey: record?.cardKey || '',
    cardNumber: record?.cardNumber || '',
    setCode: record?.setCode || '',
    rarity: record?.rarity || '',
    variant: record?.variant || '',
    originalImageUrl: url,
    source: 'Administrator-corrected image reference',
  }
  return {
    ...record,
    imageUrl: url,
    imageUrls: [url],
    exactImageUrl: url,
    imageCandidates: [candidate],
    source: candidate.source,
    referenceCorrected: true,
  }
}

export async function auditCatalogueImageRecord(record, {
  language,
  fetchImpl = fetch,
  attempts = 2,
  timeoutMs = 10000,
  retryDelayMs = 350,
  sleep,
} = {}) {
  const recordLanguage = record?.languageCode || record?.language || ''
  const checkedAt = () => new Date().toISOString()
  if (!['en', 'jp'].includes(language) || recordLanguage !== language) {
    return { ...record, status: IMAGE_CHECK_STATUS.INVALID_URL, diagnostic: 'language-mismatch', checkedAt: checkedAt(), candidateResults: [] }
  }
  const candidates = buildCatalogueImageCandidates(record)
  if (!candidates.length) {
    const hasDeclaredCandidates = (record?.imageCandidates || []).length ||
      (record?.alternativeImageCandidates || []).length ||
      (record?.baseFallbackCandidates || []).length ||
      Boolean(record?.exactImageUrl)
    return {
      ...record,
      status: hasDeclaredCandidates ? IMAGE_CHECK_STATUS.INVALID_URL : IMAGE_CHECK_STATUS.NO_REFERENCE,
      diagnostic: hasDeclaredCandidates ? 'candidate-language-or-identity-unverified' : 'no-image-reference',
      checkedUrl: '',
      checkedAt: checkedAt(),
      candidateResults: [],
    }
  }
  const candidateResults = []
  let lastDefinitive = null
  let lastTransient = null
  for (const candidate of candidates) {
    const result = await loadImageWithRetry(candidate.url, { fetchImpl, attempts, timeoutMs, retryDelayMs, ...(sleep ? { sleep } : {}) })
    const candidateResult = { ...result, candidateUrl: candidate.url, candidateKind: candidate.kind, candidateSource: candidate.source, checkedAt: checkedAt() }
    candidateResults.push(candidateResult)
    if (result.status === IMAGE_CHECK_STATUS.EXACT_LOADED) {
      const status = candidate.kind === 'base-fallback' ? IMAGE_CHECK_STATUS.BASE_FALLBACK_LOADED
        : candidate.kind === 'alternative' ? IMAGE_CHECK_STATUS.ALTERNATIVE_LOADED
          : IMAGE_CHECK_STATUS.EXACT_LOADED
      return { ...record, ...candidateResult, status, candidateResults, checkedAt: checkedAt(), retryCount: candidateResults.reduce((sum, item) => sum + (item.retryCount || 0), 0) }
    }
    if ([IMAGE_CHECK_STATUS.TEMPORARY_FAILURE, IMAGE_CHECK_STATUS.TIMEOUT].includes(result.status)) lastTransient = candidateResult
    else lastDefinitive = candidateResult
  }
  // A transient failure must never be hidden by a later definitive response.
  const finalResult = lastTransient || lastDefinitive || {}
  return { ...record, ...finalResult, status: finalResult.status || IMAGE_CHECK_STATUS.UNCHECKED, candidateResults, checkedAt: checkedAt(), retryCount: candidateResults.reduce((sum, item) => sum + (item.retryCount || 0), 0) }
}

/** Stable identity across product-link rows for a single printing/language/set. */
export function catalogueAuditIdentity(record) {
  return [record?.printingKey || record?.id || '', record?.languageCode || record?.language || '', record?.setCode || ''].join(':')
}

/** Stable identity prevents repeated product links from inflating audit totals. */
export function dedupeCatalogueAuditRecords(records = []) {
  const unique = new Map()
  for (const record of records) {
    const key = catalogueAuditIdentity(record)
    if (key.replace(/:/g, '')) {
      const existing = unique.get(key)
      if (!existing || (!existing.imageUrl && record.imageUrl)) unique.set(key, record)
    }
  }
  return [...unique.values()]
}

/** Run a resumable bounded queue; pause is observed between records. */
export async function runResumableCatalogueAudit(records, {
  language,
  concurrency = 4,
  isPaused = () => false,
  onResult = () => {},
  auditRecord = auditCatalogueImageRecord,
  auditOptions = {},
} = {}) {
  const queue = dedupeCatalogueAuditRecords(records).filter((record) => (record.languageCode || record.language) === language)
  const results = new Map()
  let cursor = 0
  let completed = 0
  const worker = async () => {
    while (cursor < queue.length) {
      while (isPaused()) await new Promise((resolve) => setTimeout(resolve, 100))
      const index = cursor++
      const result = await auditRecord(queue[index], { language, ...auditOptions })
      results.set(catalogueAuditIdentity(queue[index]), result)
      completed += 1
      onResult(result, { completed, total: queue.length })
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, worker))
  return { language, total: queue.length, completed, results: [...results.values()] }
}
