import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCheckoutSnapshot, buildAtomicCheckoutItems } from '../src/orderCheckout.js'

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

test('aggregates duplicate product lines when validating available stock', () => {
  const cart = [
    { product: { id: 'same', name: 'Duplicate card', price: 2 }, quantity: 2 },
    { product: { id: 'same', name: 'Duplicate card', price: 2 }, quantity: 2 },
  ]
  const snapshot = buildCheckoutSnapshot(cart, [{ id: 'same', name: 'Duplicate card', status: 'active', price: 2, stock_quantity: 3 }])
  assert.equal(snapshot.ok, false)
  assert.equal(snapshot.total, 8)
  assert.equal(snapshot.issues.length, 1)
  assert.equal(snapshot.issues[0].reason, 'insufficient-stock')
  assert.equal(snapshot.issues[0].requested, 4)
  assert.equal(snapshot.issues[0].stock, 3)
})

test('atomic checkout payload combines duplicate lines and sorts IDs', () => {
  const payload = buildAtomicCheckoutItems([
    { product: { id: 'b', price: 999 }, quantity: 1 },
    { product: { id: 'a', price: 0 }, quantity: 2 },
    { product: { id: 'b', price: 999 }, quantity: 3 },
  ])
  assert.deepEqual(payload, [
    { product_id: 'a', quantity: 2, expected_unit_price: 0 },
    { product_id: 'b', quantity: 4, expected_unit_price: 999 },
  ])
})

test('atomic checkout payload rejects empty, missing IDs and invalid quantities', () => {
  assert.equal(buildAtomicCheckoutItems([]), null)
  assert.equal(buildAtomicCheckoutItems([{ product: {}, quantity: 1 }]), null)
  assert.equal(buildAtomicCheckoutItems([{ product: { id: 'x' }, quantity: 0 }]), null)
  assert.equal(buildAtomicCheckoutItems([{ product: { id: 'x' }, quantity: 1.5 }]), null)
  assert.equal(buildAtomicCheckoutItems([{ product: { id: 'x', price: -1 }, quantity: 1 }]), null)
  assert.equal(buildAtomicCheckoutItems([{ product: { id: 'x', price: NaN }, quantity: 1 }]), null)
  assert.equal(buildAtomicCheckoutItems([
    { product: { id: 'x', price: 2 }, quantity: 1 },
    { product: { id: 'x', price: 2.5 }, quantity: 1 },
  ]), null)
})


test('rejects quantities outside the database integer range', () => {
  const tooLarge = 2147483648
  const cart = [{ product: { id: 'x', price: 1 }, quantity: tooLarge }]
  const snapshot = buildCheckoutSnapshot(cart, [
    { id: 'x', status: 'active', price: 1, stock_quantity: 2147483647 },
  ])
  assert.equal(snapshot.ok, false)
  assert.equal(snapshot.issues[0].reason, 'insufficient-stock')

  assert.equal(buildAtomicCheckoutItems([
    { product: { id: 'x', price: 1 }, quantity: tooLarge },
  ]), null)
})

test('rejects duplicate checkout lines whose combined quantity exceeds the database integer range', () => {
  assert.equal(buildAtomicCheckoutItems([
    { product: { id: 'x', price: 1 }, quantity: 2147483647 },
    { product: { id: 'x', price: 1 }, quantity: 1 },
  ]), null)
})

test('rejects unsafe integer quantities before constructing an RPC payload', () => {
  assert.equal(buildAtomicCheckoutItems([
    { product: { id: 'x', price: 1 }, quantity: Number.MAX_SAFE_INTEGER + 1 },
  ]), null)
})
