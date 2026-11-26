import assert from 'node:assert/strict'
import test from 'node:test'
import { clearPersistentDraft, readPersistentDraft, savePersistentDraft } from '../src/admin/persistentDraftStorage.js'

function withLocalStorage(callback) {
  const original = globalThis.localStorage
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
  try { callback(values) }
  finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
}

test('persists and restores a draft for the same user and screen', () => {
  withLocalStorage(() => {
    const draft = { name: 'GLA test card', description: 'Unsaved note' }
    assert.equal(savePersistentDraft('user-1', 'product-edit:123', draft), true)
    assert.deepEqual(readPersistentDraft('user-1', 'product-edit:123'), draft)
    assert.equal(readPersistentDraft('user-2', 'product-edit:123'), null)
  })
})

test('clears a completed or discarded draft', () => {
  withLocalStorage(() => {
    savePersistentDraft('user-1', 'bulk-import', { rows: [{ name: 'Test' }] })
    clearPersistentDraft('user-1', 'bulk-import')
    assert.equal(readPersistentDraft('user-1', 'bulk-import'), null)
  })
})

test('expires old drafts and rejects malformed storage', () => {
  withLocalStorage((values) => {
    const key = 'gla:resume:v1:user-1:expired'
    values.set(key, JSON.stringify({ savedAt: Date.now() - (31 * 24 * 60 * 60 * 1000), value: { text: 'old' } }))
    assert.equal(readPersistentDraft('user-1', 'expired', 'fallback'), 'fallback')
    values.set('gla:resume:v1:user-1:broken', '{')
    assert.equal(readPersistentDraft('user-1', 'broken', 'fallback'), 'fallback')
  })
})
