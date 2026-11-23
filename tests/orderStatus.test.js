import assert from 'node:assert/strict'
import test from 'node:test'
import { ORDER_STATUSES, isValidOrderStatus, isAllowedOrderStatusTransition, orderStatusUpdateFailure, orderDeleteFailure } from '../src/orderStatus.js'

test('accepts the supported order lifecycle states', () => {
  for (const status of ORDER_STATUSES) assert.equal(isValidOrderStatus(status), true)
})

test('normalizes valid status input but rejects unknown or blank values', () => {
  assert.equal(isValidOrderStatus(' Completed '), true)
  assert.equal(isValidOrderStatus('ready'), false)
  assert.equal(isValidOrderStatus(''), false)
  assert.equal(isValidOrderStatus(null), false)
})

test('order status updates require a confirmed affected order', () => {
  assert.equal(orderStatusUpdateFailure({ data: { id: 'order-1' }, error: null }), '')
  assert.equal(orderStatusUpdateFailure({ data: null, error: null }), 'Order was not found or the status update was not permitted.')
  assert.equal(orderStatusUpdateFailure({ data: null, error: { message: 'RLS denied' } }), 'RLS denied')
})

test('checkout cleanup requires a confirmed deleted order', () => {
  assert.equal(orderDeleteFailure({ data: { id: 'order-1' }, error: null }), '')
  assert.equal(orderDeleteFailure({ data: null, error: null }), 'The pending order was not found or deletion was not permitted.')
  assert.equal(orderDeleteFailure({ data: null, error: { message: 'RLS denied' } }), 'RLS denied')
})

test('atomic status RPC must return the expected order ID', () => {
  assert.equal(orderStatusUpdateFailure({ data: 'order-1', error: null }, 'order-1'), '')
  assert.equal(orderStatusUpdateFailure({ data: 'another-order', error: null }, 'order-1'), 'Order was not found or the status update was not permitted.')
  assert.equal(orderStatusUpdateFailure({ data: null, error: null }, 'order-1'), 'Order was not found or the status update was not permitted.')
})

test('allows only forward order lifecycle transitions and safe cancellations', () => {
  assert.equal(isAllowedOrderStatusTransition('pending', 'processing'), true)
  assert.equal(isAllowedOrderStatusTransition('pending', 'cancelled'), true)
  assert.equal(isAllowedOrderStatusTransition('processing', 'shipped'), true)
  assert.equal(isAllowedOrderStatusTransition('processing', 'cancelled'), true)
  assert.equal(isAllowedOrderStatusTransition('shipped', 'completed'), true)
  assert.equal(isAllowedOrderStatusTransition('pending', 'pending'), true)
  assert.equal(isAllowedOrderStatusTransition('processing', 'pending'), false)
  assert.equal(isAllowedOrderStatusTransition('shipped', 'cancelled'), false)
  assert.equal(isAllowedOrderStatusTransition('completed', 'cancelled'), false)
  assert.equal(isAllowedOrderStatusTransition('cancelled', 'processing'), false)
})
