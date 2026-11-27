import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchAllPages } from '../src/admin/storagePagination.js'

test('loads every storage page instead of silently stopping at the first 100 files', async () => {
  const calls = []
  const pages = [
    Array.from({ length: 100 }, (_, index) => ({ name: `photo-${index}` })),
    Array.from({ length: 37 }, (_, index) => ({ name: `photo-${index + 100}` })),
  ]
  const files = await fetchAllPages(async ({ limit, offset }) => {
    calls.push({ limit, offset })
    return { data: pages[offset / limit], error: null }
  })
  assert.equal(files.length, 137)
  assert.deepEqual(calls, [{ limit: 100, offset: 0 }, { limit: 100, offset: 100 }])
})

test('requests an empty final page when the total is an exact page multiple', async () => {
  const offsets = []
  const files = await fetchAllPages(async ({ offset }) => {
    offsets.push(offset)
    return { data: offset === 0 ? Array.from({ length: 2 }, (_, index) => ({ name: String(index) })) : [], error: null }
  }, 2)
  assert.equal(files.length, 2)
  assert.deepEqual(offsets, [0, 2])
})

test('propagates storage errors instead of presenting a partial library as complete', async () => {
  await assert.rejects(
    fetchAllPages(async () => ({ data: [], error: new Error('permission denied') })),
    /permission denied/,
  )
})

test('rejects invalid page sizes', async () => {
  await assert.rejects(fetchAllPages(async () => ({ data: [] }), 0), /positive integer/)
})


test('suppresses overlapping storage pages by stable object ID or name', async () => {
  const calls = []
  const pages = [
    [{ id: 'a', name: 'photo-a' }, { id: 'b', name: 'photo-b' }],
    [{ id: 'b', name: 'photo-b' }, { id: 'c', name: 'photo-c' }],
    [],
  ]
  const files = await fetchAllPages(async ({ limit, offset }) => {
    calls.push(offset)
    return { data: pages[offset / limit], error: null }
  }, 2)

  assert.deepEqual(files.map((file) => file.id), ['a', 'b', 'c'])
  assert.deepEqual(calls, [0, 2, 4])
})

test('uses storage object name when overlapping rows do not expose an ID', async () => {
  const pages = [
    [{ name: 'photo-a' }, { name: 'photo-b' }],
    [{ name: 'photo-b' }, { name: 'photo-c' }],
    [],
  ]
  const files = await fetchAllPages(async ({ limit, offset }) => ({
    data: pages[offset / limit],
    error: null,
  }), 2)

  assert.deepEqual(files.map((file) => file.name), ['photo-a', 'photo-b', 'photo-c'])
})
