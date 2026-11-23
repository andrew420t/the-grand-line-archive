import assert from 'node:assert/strict'
import test from 'node:test'
import { getPublicStorefrontProducts } from '../src/publicProducts.js'

test('public storefront only exposes explicitly active products', () => {
  const rows = [
    { id: 'active', raw: { status: 'active' } },
    { id: 'active-case', raw: { status: ' ACTIVE ' } },
    { id: 'draft', raw: { status: 'draft' } },
    { id: 'archived', raw: { status: 'archived' } },
    { id: 'missing', raw: {} },
    { id: 'null', raw: { status: null } },
  ]
  assert.deepEqual(getPublicStorefrontProducts(rows).map((product) => product.id), ['active', 'active-case'])
})

test('handles nullish input and product rows with direct status values', () => {
  assert.deepEqual(getPublicStorefrontProducts(null), [])
  assert.deepEqual(getPublicStorefrontProducts([{ id: 'active', status: 'active' }, { id: 'draft', status: 'draft' }]).map((product) => product.id), ['active'])
})
