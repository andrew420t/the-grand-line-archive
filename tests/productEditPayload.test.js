import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProductEditPayload } from '../src/admin/productEditPayload.js'

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
