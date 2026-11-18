import assert from 'node:assert/strict'
import test from 'node:test'
import { buildNewProductPayload } from '../src/admin/productSchema.js'

const form = {
  name: 'Monkey D. Luffy',
  description: 'Collector card',
  card_number: 'OP05-119',
  rarity: 'Super Rare',
  category_id: 'category-id',
  price_gbp: '12.5',
  stock_quantity: '2',
  featured: true,
  condition: 'Near Mint',
  color: 'Red',
  power: '5000',
  cost: '5',
  card_type: 'Character',
  effect_text: 'On Play: Draw 1 card.',
  language: 'English',
  classification: 'Character',
  variant_label: '',
}

test('builds inserts from confirmed products columns and links the existing set by ID', () => {
  const payload = buildNewProductPayload(form, 'set-uuid', false)

  assert.equal(payload.price, 12.5)
  assert.equal(payload.stock_quantity, 2)
  assert.equal(payload.set_id, 'set-uuid')
  assert.equal(payload.featured, true)
  assert.equal(payload.status, 'active')
  assert.equal('price_gbp' in payload, false)
  assert.equal('set_code' in payload, false)
  assert.equal('color' in payload, false)
})

test('includes OCR card metadata only when its reviewed columns exist', () => {
  const payload = buildNewProductPayload(form, null, true)

  assert.equal(payload.power, 5000)
  assert.equal(payload.cost, 5)
  assert.equal(payload.effect_text, 'On Play: Draw 1 card.')
  assert.equal(payload.language, 'English')
})
