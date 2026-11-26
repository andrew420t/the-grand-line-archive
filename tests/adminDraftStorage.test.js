import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearQuickAddDraft,
  readAdminWorkspaceDraft,
  readQuickAddDraft,
  saveAdminWorkspaceDraft,
  saveQuickAddDraft,
} from '../src/admin/adminDraftStorage.js'

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(String(key), String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

test('quick-add drafts restore per administrator and can be cleared', () => {
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = new MemoryStorage()
  try {
    const form = { name: 'Test card', card_number: 'OP01-001', price_gbp: '2.50' }
    saveQuickAddDraft('admin-a', { form, partialProductId: 'product-123' })

    assert.deepEqual(readQuickAddDraft('admin-a')?.form, form)
    assert.equal(readQuickAddDraft('admin-a')?.partialProductId, 'product-123')
    assert.equal(readQuickAddDraft('admin-b'), null)

    clearQuickAddDraft('admin-a')
    assert.equal(readQuickAddDraft('admin-a'), null)
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  }
})

test('admin workspace restores the selected section and scanner review data', () => {
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = new MemoryStorage()
  try {
    const scanFields = { card_number: { value: 'OP01-001', confidence: 94, needsReview: true } }
    saveAdminWorkspaceDraft('admin-a', {
      activeSection: 'add-stock',
      scanFields,
      rawText: 'OP01-001',
    })

    assert.deepEqual(readAdminWorkspaceDraft('admin-a'), {
      activeSection: 'add-stock',
      scanFields,
      rawText: 'OP01-001',
    })
    assert.equal(readAdminWorkspaceDraft('admin-b'), null)
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  }
})
