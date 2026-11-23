import assert from 'node:assert/strict'
import test from 'node:test'
import { CARD_NUMBER_SCAN_ROTATIONS } from '../src/admin/cardNumberRegion.js'

test('rotation-aware number scans include sideways and upside-down orientations', () => {
  assert.deepEqual(CARD_NUMBER_SCAN_ROTATIONS, [90, 180, 270])
  assert.ok(CARD_NUMBER_SCAN_ROTATIONS.includes(180), 'upside-down cards are covered')
  assert.ok(CARD_NUMBER_SCAN_ROTATIONS.includes(90), 'clockwise sideways cards are covered')
  assert.ok(CARD_NUMBER_SCAN_ROTATIONS.includes(270), 'counter-clockwise sideways cards are covered')
})
