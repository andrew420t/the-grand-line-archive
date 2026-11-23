import assert from 'node:assert/strict'
import test from 'node:test'
import { detectForegroundCardBounds, calculateCardAspectCrop } from '../src/admin/imageTools.js'

function imageData(width, height, background = [230, 230, 230]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = background[0]; data[i + 1] = background[1]; data[i + 2] = background[2]; data[i + 3] = 255
  }
  return { width, height, data }
}
function fillRect(image, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) for (let px = x; px < x + width; px += 1) {
    const i = (py * image.width + px) * 4
    image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2]
  }
}

test('detects an offset card against a uniform photo background', () => {
  const image = imageData(180, 240)
  fillRect(image, 38, 44, 100, 140, [35, 90, 180])
  const bounds = detectForegroundCardBounds(image)
  assert.ok(bounds)
  assert.ok(bounds.confidence >= 0.35)
  assert.ok(bounds.x <= 38 && bounds.y <= 44)
  assert.ok(bounds.x + bounds.width >= 138 && bounds.y + bounds.height >= 184)
})

test('returns null for inconsistent corner backgrounds to avoid unreliable auto-crop', () => {
  const image = imageData(180, 240)
  fillRect(image, 0, 0, 30, 30, [20, 20, 20])
  fillRect(image, 150, 0, 30, 30, [80, 80, 80])
  fillRect(image, 0, 210, 30, 30, [160, 160, 160])
  fillRect(image, 150, 210, 30, 30, [240, 240, 240])
  assert.equal(detectForegroundCardBounds(image), null)
})

test('aspect crop frames the detected card while keeping card aspect ratio', () => {
  const bounds = { x: 38, y: 44, width: 100, height: 140 }
  const crop = calculateCardAspectCrop(180, 240, bounds)
  assert.ok(crop)
  assert.ok(Math.abs(crop.width / crop.height - 0.715) < 0.0001)
  assert.ok(crop.x <= bounds.x && crop.y <= bounds.y)
  assert.ok(crop.x + crop.width >= bounds.x + bounds.width)
  assert.ok(crop.y + crop.height >= bounds.y + bounds.height)
})

test('falls back when a detected object cannot fit inside the image crop', () => {
  assert.equal(calculateCardAspectCrop(100, 100, { x: 0, y: 0, width: 95, height: 95 }), null)
})
