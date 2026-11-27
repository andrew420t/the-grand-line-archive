import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOrderConfirmation, formatOrderReference } from '../src/orderConfirmation.js'

test('formats a short readable order reference', () => {
  assert.equal(formatOrderReference('12345678-1234-1234-1234-abcdef123456'), 'CDEF123456'.slice(-8))
})

test('builds a safe confirmation snapshot from the validated checkout', () => {
  const snapshot = buildOrderConfirmation('11111111-2222-3333-4444-abcdef123456', [
    { product: { id: 'product-1', name: 'Loki', price: 7.48 }, quantity: 1 },
    { product: { id: 'product-2', name: 'Luffy', price: 2.5 }, quantity: 2 },
  ], 12.48)

  assert.equal(snapshot.reference, 'ABCDEF123456'.slice(-8))
  assert.equal(snapshot.total, 12.48)
  assert.equal(snapshot.pickupMethod, 'local_pickup')
  assert.equal(snapshot.items.length, 2)
  assert.equal(snapshot.items[1].quantity, 2)
})

test('rejects incomplete or invalid confirmation snapshots', () => {
  assert.equal(buildOrderConfirmation('', [{ product: { id: 'a', name: 'Card', price: 1 }, quantity: 1 }], 1), null)
  assert.equal(buildOrderConfirmation('order-1', [], 0), null)
  assert.equal(buildOrderConfirmation('order-1', [{ product: { id: 'a', price: 1 }, quantity: 0 }], 0), null)
})
