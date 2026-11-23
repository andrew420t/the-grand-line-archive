import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProductEditPayload, parseInventoryStockUpdate } from '../src/admin/productEditPayload.js'

const fields = [
  { key: 'name', column: 'name', required: true },
  { key: 'card_number', column: 'card_number' },
  { key: 'effect_text', column: 'effect_text' },
  { key: 'power', column: 'power', numeric: true },
  { key: 'rarity', column: 'rarity', options: ['Common', 'Rare'] },
  { key: 'set_id', column: 'set_id', select: 'sets' },
  { key: 'featured', column: 'featured', checkbox: true },
]

test('cleared optional text, numeric and select fields are saved as null', () => {
  const payload = buildProductEditPayload(fields, {
    name: 'Luffy',
    card_number: '',
    effect_text: '   ',
    power: '',
    rarity: '',
    set_id: '',
    featured: false,
  }, { updated_at: 'old' }, '2026-11-23T00:00:00.000Z')
  assert.equal(payload.name, 'Luffy')
  assert.equal(payload.card_number, null)
  assert.equal(payload.effect_text, null)
  assert.equal(payload.power, null)
  assert.equal(payload.rarity, null)
  assert.equal(payload.set_id, null)
  assert.equal(payload.featured, false)
  assert.equal(payload.updated_at, '2026-11-23T00:00:00.000Z')
})

test('keeps non-empty values and converts numeric fields', () => {
  const payload = buildProductEditPayload(fields, {
    name: 'Roronoa Zoro',
    card_number: 'OP01-001',
    effect_text: 'Draw one card.',
    power: '5000',
    rarity: 'Leader',
    set_id: 'set-1',
    featured: true,
  }, {})
  assert.equal(payload.card_number, 'OP01-001')
  assert.equal(payload.power, 5000)
  assert.equal(payload.rarity, 'Leader')
  assert.equal(payload.set_id, 'set-1')
  assert.equal(payload.featured, true)
  assert.equal('updated_at' in payload, false)
})

test('editing ordinary card fields does not overwrite exact catalogue printing identity', () => {
  const raw = {
    catalogue_match_id: 'printing-kaido-parallel:en:product-op17',
    catalogue_printing_key: 'printing-kaido-parallel',
    catalogue_reference_image_url: 'https://example.test/kaido-parallel.png',
    catalogue_reference_image_source: 'Bandai official image',
    reference_image_url: 'https://example.test/legacy-reference.png',
    reference_printing_key: 'printing-kaido-parallel',
    updated_at: 'old',
  }
  const payload = buildProductEditPayload(fields, {
    name: 'Kaido',
    card_number: 'OP17-062',
    effect_text: 'Updated effect text',
    power: '12000',
    rarity: 'Secret Rare',
    set_id: 'set-op17',
    featured: false,
  }, raw)

  for (const key of Object.keys(raw).filter((key) => key !== 'updated_at')) {
    assert.equal(key in payload, false, `edit payload must not overwrite ${key}`)
  }
})


test('inventory inline updates accept explicit zero values', () => {
  assert.deepEqual(parseInventoryStockUpdate({ stock: '0', price: '0' }, { stock_quantity: 4, price: 2.5 }), {
    stock_quantity: 0, price: 0,
  })
})

test('inventory inline updates reject blank and invalid values', () => {
  assert.equal(parseInventoryStockUpdate({ stock: '', price: '2' }, { stock_quantity: 4, price: 2 }), null)
  assert.equal(parseInventoryStockUpdate({ stock: '-1', price: '2' }, {}), null)
  assert.equal(parseInventoryStockUpdate({ stock: '1.5', price: '2' }, {}), null)
  assert.equal(parseInventoryStockUpdate({ stock: '1', price: 'NaN' }, {}), null)
})


test('product deletion requires a confirmed deleted row', async () => {
  const { productDeleteFailure } = await import('../src/admin/productEditPayload.js')
  assert.equal(productDeleteFailure({ data: { id: 'product-1' }, error: null }), '')
  assert.equal(productDeleteFailure({ data: null, error: null }), 'Product was not found or deletion was not permitted.')
  assert.equal(productDeleteFailure({ data: null, error: { message: 'RLS denied' } }), 'RLS denied')
})
