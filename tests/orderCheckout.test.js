import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCheckoutSnapshot } from '../src/orderCheckout.js'

test('uses fresh active-product prices for checkout total', () => {
  const cart = [
    { product: { id: 'a', name: 'Luffy', price: 2.5, stock: 4 }, quantity: 2 },
    { product: { id: 'b', name: 'Nami', price: 1.25, stock: 3 }, quantity: 1 },
  ]
  const products = [
    { id: 'a', name: 'Luffy', price: 2.5, stock_quantity: 4, status: 'active' },
    { id: 'b', name: 'Nami', price: 1.25, stock_quantity: 3, status: 'active' },
  ]
  const snapshot = buildCheckoutSnapshot(cart, products)
  assert.equal(snapshot.ok, true)
  assert.equal(snapshot.total, 6.25)
  assert.deepEqual(snapshot.issues, [])
})

test('rejects missing or inactive products and refreshes basket stock', () => {
  const cart = [{ product: { id: 'draft', name: 'Draft', price: 3, stock: 5 }, quantity: 1 }]
  const snapshot = buildCheckoutSnapshot(cart, [{ id: 'draft', status: 'draft', price: 3, stock_quantity: 5 }])
  assert.equal(snapshot.ok, false)
  assert.equal(snapshot.items[0].product.stock, 0)
  assert.equal(snapshot.issues[0].reason, 'unavailable')
  assert.equal(buildCheckoutSnapshot(cart, []).issues[0].reason, 'unavailable')
})

test('rejects insufficient stock and price changes before checkout', () => {
  const cart = [{ product: { id: 'x', name: 'Card X', price: 1.5, stock: 5 }, quantity: 3 }]
  const snapshot = buildCheckoutSnapshot(cart, [{ id: 'x', name: 'Card X', status: 'active', price: 2, stock_quantity: 2 }])
  assert.equal(snapshot.ok, false)
  assert.equal(snapshot.items[0].product.stock, 2)
  assert.deepEqual(snapshot.issues.map((issue) => issue.reason), ['insufficient-stock', 'price-changed'])
  assert.equal(snapshot.total, 6)
})

test('rejects invalid quantities and prices', () => {
  const cart = [{ product: { id: 'x', price: 1 }, quantity: 0 }]
  const snapshot = buildCheckoutSnapshot(cart, [{ id: 'x', status: 'active', price: -1, stock_quantity: 4 }])
  assert.equal(snapshot.ok, false)
  assert.deepEqual(snapshot.issues.map((issue) => issue.reason), ['insufficient-stock', 'invalid-price'])
  assert.equal(snapshot.items[0].product.price, 1)
})
