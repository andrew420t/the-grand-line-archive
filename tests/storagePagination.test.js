import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchAllStorageFiles } from '../src/admin/storagePagination.js'

test('loads every storage page instead of silently stopping at the first 100 files', async () => {
  const calls = []
  const pages = [
    Array.from({ length: 100 }, (_, index) => ({ name: `photo-${index}` })),
    Array.from({ length: 37 }, (_, index) => ({ name: `photo-${index + 100}` })),
  ]
  const files = await fetchAllStorageFiles(async ({ limit, offset }) => {
    calls.push({ limit, offset })
    return { data: pages[offset / limit], error: null }
  })
  assert.equal(files.length, 137)
  assert.deepEqual(calls, [{ limit: 100, offset: 0 }, { limit: 100, offset: 100 }])
})

test('requests an empty final page when the total is an exact page multiple', async () => {
  const offsets = []
  const files = await fetchAllStorageFiles(async ({ offset }) => {
    offsets.push(offset)
    return { data: offset === 0 ? Array.from({ length: 2 }, (_, index) => ({ name: String(index) })) : [], error: null }
  }, 2)
  assert.equal(files.length, 2)
  assert.deepEqual(offsets, [0, 2])
})

test('propagates storage errors instead of presenting a partial library as complete', async () => {
  await assert.rejects(
    fetchAllStorageFiles(async () => ({ data: [], error: new Error('permission denied') })),
    /permission denied/,
  )
})

test('rejects invalid page sizes', async () => {
  await assert.rejects(fetchAllStorageFiles(async () => ({ data: [] }), 0), /positive integer/)
})
