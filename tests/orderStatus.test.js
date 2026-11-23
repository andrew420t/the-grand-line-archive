import assert from 'node:assert/strict'
import test from 'node:test'
import { ORDER_STATUSES, isValidOrderStatus } from '../src/orderStatus.js'

test('accepts the supported order lifecycle states', () => {
  for (const status of ORDER_STATUSES) assert.equal(isValidOrderStatus(status), true)
})

test('normalizes valid status input but rejects unknown or blank values', () => {
  assert.equal(isValidOrderStatus(' Completed '), true)
  assert.equal(isValidOrderStatus('ready'), false)
  assert.equal(isValidOrderStatus(''), false)
  assert.equal(isValidOrderStatus(null), false)
})
