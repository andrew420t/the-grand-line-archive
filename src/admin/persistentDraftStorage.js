const DRAFT_PREFIX = 'gla:resume:v1:'
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000

const draftKey = (userId, scope) =>
  DRAFT_PREFIX + encodeURIComponent(String(userId || '')) + ':' + encodeURIComponent(String(scope || ''))

export function readPersistentDraft(userId, scope, fallback = null) {
  if (!userId || !scope || typeof localStorage === 'undefined') return fallback
  const key = draftKey(userId, scope)
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null')
    if (!parsed || !Number.isFinite(Number(parsed.savedAt)) ||
        Date.now() - Number(parsed.savedAt) > DRAFT_TTL_MS || !('value' in parsed)) {
      localStorage.removeItem(key)
      return fallback
    }
    return parsed.value
  } catch {
    try { localStorage.removeItem(key) } catch { /* Storage may be unavailable. */ }
    return fallback
  }
}

export function savePersistentDraft(userId, scope, value) {
  if (!userId || !scope || typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(draftKey(userId, scope), JSON.stringify({
      savedAt: Date.now(),
      value,
    }))
    return true
  } catch {
    // Draft recovery is best-effort; never interrupt the current task.
    return false
  }
}

export function clearPersistentDraft(userId, scope) {
  if (!userId || !scope || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(draftKey(userId, scope))
  } catch {
    // Ignore unavailable browser storage.
  }
}
