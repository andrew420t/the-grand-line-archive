import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteLibraryPhoto, uploadProductPhotos } from '../src/admin/productStorage.js'

function makeClient({ metadataError = null, productUpdateError = null, uploadError = null, removeError = null } = {}) {
  const calls = { uploads: [], removals: [], metadata: [], productUpdates: [] }
  let productMaybeSingleCalls = 0
  const storageBucket = {
    upload: async (path, file, options) => {
      calls.uploads.push({ path, file, options })
      return { error: uploadError }
    },
    getPublicUrl: (path) => ({ data: { publicUrl: 'https://storage.example/' + path } }),
    remove: async (paths) => {
      calls.removals.push(paths)
      return { error: removeError }
    },
  }
  const client = {
    storage: { from: (bucket) => {
      assert.equal(bucket, 'product-card-images')
      return storageBucket
    } },
    from: (table) => {
      if (table === 'product_images') {
        return {
          insert: async (records) => {
            calls.metadata.push(records)
            return { error: metadataError }
          },
          delete: () => ({
            in: async (_column, paths) => {
              calls.metadata.push({ deletedPaths: paths })
              return { error: null }
            },
          }),
        }
      }
      if (table === 'products') {
        return {
          select() { return this },
          update(payload) {
            calls.productUpdates.push(payload)
            return this
          },
          eq() { return this },
          maybeSingle: async () => {
            productMaybeSingleCalls += 1
            if (productMaybeSingleCalls === 1) {
              return { data: { id: 'product-1', image_url: 'https://old.example/front.jpg' }, error: null }
            }
            return { data: productUpdateError ? null : { id: 'product-1' }, error: productUpdateError }
          },
        }
      }
      throw new Error('Unexpected table: ' + table)
    },
  }
  return { client, calls }
}

const imageDependencies = {
  prepareImage: async () => new Blob(['compressed image']),
  makeFile: (_blob, name) => ({ name, type: 'image/jpeg' }),
}

test('uploads product photographs, inserts metadata and verifies the front image update', async () => {
  const { client, calls } = makeClient()
  const saved = await uploadProductPhotos({
    productId: 'product-1',
    userId: 'admin-1',
    photos: [{ file: {}, name: 'front.png', role: 'front', rotation: 0, cropToCard: false }],
    supabaseClient: client,
    ...imageDependencies,
  })

  assert.equal(saved.length, 1)
  assert.equal(saved[0].role, 'front')
  assert.match(saved[0].storage_path, /^product-1\/front\/.+\.jpg$/)
  assert.equal(calls.uploads.length, 1)
  assert.equal(calls.metadata[0][0].uploaded_by, 'admin-1')
  assert.equal(calls.productUpdates.length, 1)
  assert.equal(calls.productUpdates[0].image_url, saved[0].image_url)
  assert.deepEqual(calls.removals, [])
})

test('rolls back uploaded Storage objects when product-image metadata insertion fails', async () => {
  const { client, calls } = makeClient({ metadataError: { message: 'metadata insert denied' } })

  await assert.rejects(
    uploadProductPhotos({
      productId: 'product-1',
      userId: 'admin-1',
      photos: [{ file: {}, name: 'front.png', role: 'front', rotation: 0, cropToCard: false }],
      supabaseClient: client,
      ...imageDependencies,
    }),
    /Photographs uploaded but could not be linked to the product: metadata insert denied/,
  )

  assert.equal(calls.uploads.length, 1)
  assert.equal(calls.productUpdates.length, 0)
  assert.equal(calls.removals.length, 1)
  assert.deepEqual(calls.removals[0], [calls.uploads[0].path])
})

test('reports failed product-photo deletion instead of silently succeeding', async () => {
  const { client, calls } = makeClient({ removeError: { message: 'storage delete denied' } })
  await assert.rejects(deleteLibraryPhoto('admin-1/library/photo.jpg', client), /Could not delete image: storage delete denied/)
  assert.deepEqual(calls.removals, [['admin-1/library/photo.jpg']])
})

test('deletes a library photo from the configured product image bucket', async () => {
  const { client, calls } = makeClient()
  await deleteLibraryPhoto('admin-1/library/photo.jpg', client)
  assert.deepEqual(calls.removals, [['admin-1/library/photo.jpg']])
})
