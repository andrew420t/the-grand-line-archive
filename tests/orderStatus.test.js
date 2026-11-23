import assert from 'node:assert/strict'
import test from 'node:test'
import { ORDER_STATUSES, isValidOrderStatus, orderStatusUpdateFailure } from '../src/orderStatus.js'

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
