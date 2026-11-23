import assert from 'node:assert/strict'
import test from 'node:test'
import { CARD_NUMBER_SCAN_ROTATIONS, calculateAdaptiveContrastBounds, enhanceGrayValue } from '../src/admin/cardNumberRegion.js'

test('rotation-aware number scans include sideways and upside-down orientations', () => {
  assert.deepEqual(CARD_NUMBER_SCAN_ROTATIONS, [90, 180, 270])
  assert.ok(CARD_NUMBER_SCAN_ROTATIONS.includes(180), 'upside-down cards are covered')
  assert.ok(CARD_NUMBER_SCAN_ROTATIONS.includes(90), 'clockwise sideways cards are covered')
  assert.ok(CARD_NUMBER_SCAN_ROTATIONS.includes(270), 'counter-clockwise sideways cards are covered')
})

test('adaptive contrast bounds ignore small highlight and shadow outliers', () => {
  const histogram = new Uint32Array(256)
  histogram[5] = 2
  histogram[80] = 48
  histogram[140] = 48
  histogram[250] = 2
  assert.deepEqual(calculateAdaptiveContrastBounds(histogram, 100), { low: 80, high: 140 })
})

test('adaptive contrast stretches central range and preserves grayscale order', () => {
  const bounds = { low: 60, high: 190 }
  assert.ok(enhanceGrayValue(100, bounds) > enhanceGrayValue(80, bounds))
  assert.equal(enhanceGrayValue(60, bounds), 8)
  assert.equal(enhanceGrayValue(190, bounds), 247)
})

test('flat crops use conservative fallback contrast curve', () => {
  const histogram = new Uint32Array(256)
  histogram[120] = 100
  assert.equal(calculateAdaptiveContrastBounds(histogram, 100), null)
  assert.equal(enhanceGrayValue(112, null), 128)
  assert.equal(enhanceGrayValue(0, null), 0)
  assert.equal(enhanceGrayValue(255, null), 255)
})
