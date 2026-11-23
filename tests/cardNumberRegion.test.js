import assert from 'node:assert/strict'
import test from 'node:test'
import { CARD_NUMBER_SCAN_ROTATIONS, calculateAdaptiveContrastBounds, enhanceGrayValue, sharpenGrayPixels, validateManualCardCrop, requireConfirmedManualCardCrop } from '../src/admin/cardNumberRegion.js'

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


test('mild unsharp mask strengthens a printed edge without changing flat areas', () => {
  const pixels = new Uint8Array(5 * 5).fill(180)
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 2; x += 1) pixels[y * 5 + x] = 70
  const sharpened = sharpenGrayPixels(pixels, 5, 5)
  assert.equal(sharpened[2 * 5 + 0], 70)
  assert.ok(sharpened[2 * 5 + 1] < pixels[2 * 5 + 1])
  assert.equal(sharpened[2 * 5 + 3], 180)
})

test('unsharp mask leaves low-contrast noise below its threshold unchanged', () => {
  const pixels = new Uint8Array([100, 102, 100, 102, 100, 102, 100, 102, 100])
  assert.deepEqual([...sharpenGrayPixels(pixels, 3, 3)], [...pixels])
})


test('manual crop rounding never extends source bounds by a pixel', () => {
  const crop = validateManualCardCrop({ x: 0.25, y: 0.25, width: 0.75, height: 0.75 }, 100, 100)
  assert.deepEqual(crop, { x: 25, y: 25, width: 75, height: 75 })
  assert.ok(crop.x + crop.width <= 10)
  assert.ok(crop.y + crop.height <= 10)
  const tiny = validateManualCardCrop({ x: 0, y: 0, width: 1, height: 1 }, 1, 1)
  assert.equal(tiny, null)
  assert.equal(validateManualCardCrop({ x: 0, y: 0, width: 1, height: 1 }, 63, 80), null)
  assert.ok(validateManualCardCrop({ x: 0, y: 0, width: 1, height: 1 }, 64, 64))
})

test('manual crop validation maps normalized coordinates to pixels', () => {
  assert.deepEqual(validateManualCardCrop({ x: 0.1, y: 0.2, width: 0.6, height: 0.5 }, 1000, 2000), {
    x: 100, y: 400, width: 600, height: 1000,
  })
})

test('manual crop validation rejects out-of-frame, tiny, and invalid selections', () => {
  assert.equal(validateManualCardCrop({ x: -0.1, y: 0, width: 0.5, height: 0.5 }, 100, 100), null)
  assert.equal(validateManualCardCrop({ x: 0.8, y: 0.8, width: 0.3, height: 0.3 }, 100, 100), null)
  assert.equal(validateManualCardCrop({ x: 0, y: 0, width: 0.05, height: 0.5 }, 100, 100), null)
  assert.equal(validateManualCardCrop({ x: 0, y: 0, width: NaN, height: 0.5 }, 100, 100), null)
})

test('manual crop accepts the minimum 12 percent dimensions and rejects smaller edges', () => {
  assert.deepEqual(validateManualCardCrop({ x: 0, y: 0, width: 0.12, height: 0.12 }, 1000, 1000), {
    x: 0, y: 0, width: 120, height: 120,
  })
  assert.equal(validateManualCardCrop({ x: 0, y: 0, width: 0.119, height: 0.12 }, 100, 100), null)
  assert.equal(validateManualCardCrop({ x: 0, y: 0, width: 0.12, height: 0.119 }, 100, 100), null)
})


test('confirmed crop guard rejects unconfirmed and invalid crop geometry', () => {
  const crop = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
  assert.throws(() => requireConfirmedManualCardCrop(crop, 1000, 1000, false), /Confirm/)
  assert.throws(() => requireConfirmedManualCardCrop({ x: 0, y: 0, width: 0.05, height: 0.5 }, 1000, 1000, true), /invalid or too small/)
  assert.deepEqual(requireConfirmedManualCardCrop(crop, 1000, 1000, true), {
    x: 100, y: 100, width: 800, height: 800,
  })
})
