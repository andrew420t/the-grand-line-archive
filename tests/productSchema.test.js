import assert from 'node:assert/strict'
import test from 'node:test'
import { buildNewProductPayload, classifyPrintingDuplicate } from '../src/admin/productSchema.js'

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
  catalogue_match_id: 'printing-variant-42:en:product-op17',
  catalogue_printing_key: 'printing-variant-42',
  catalogue_reference_image_url: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-062.png',
  catalogue_reference_image_source: 'Bandai official image',
}

test('builds inserts from confirmed products columns and links the existing set by ID', () => {
  const payload = buildNewProductPayload(form, 'set-uuid', false)

  assert.equal(payload.price, 12.5)
  assert.equal(payload.stock_quantity, 2)
  assert.equal(payload.set_id, 'set-uuid')
  assert.equal(payload.featured, true)
  assert.equal(payload.status, 'draft')
  assert.equal('price_gbp' in payload, false)
  assert.equal('set_code' in payload, false)
  assert.equal('color' in payload, false)
  assert.equal('catalogue_match_id' in payload, false)
})

test('includes OCR card metadata only when its reviewed columns exist', () => {
  const payload = buildNewProductPayload(form, null, true)

  assert.equal(payload.power, 5000)
  assert.equal(payload.cost, 5)
  assert.equal(payload.effect_text, 'On Play: Draw 1 card.')
  assert.equal(payload.language, 'English')
  assert.equal(payload.catalogue_match_id, form.catalogue_match_id)
  assert.equal(payload.catalogue_printing_key, form.catalogue_printing_key)
  assert.equal(payload.catalogue_reference_image_url, form.catalogue_reference_image_url)
  assert.equal(payload.catalogue_reference_image_source, form.catalogue_reference_image_source)
})

test('keeps normal and parallel catalogue printings distinct through inventory payload creation', () => {
  const normal = buildNewProductPayload({
    ...form,
    card_number: 'OP17-062',
    variant_label: 'Normal',
    catalogue_match_id: 'printing-kaido-normal:en:product-op17',
    catalogue_printing_key: 'printing-kaido-normal',
    catalogue_reference_image_url: 'https://example.test/kaido-normal.png',
  }, 'set-op17', true)
  const parallel = buildNewProductPayload({
    ...form,
    card_number: 'OP17-062',
    variant_label: 'Parallel',
    catalogue_match_id: 'printing-kaido-parallel:en:product-op17',
    catalogue_printing_key: 'printing-kaido-parallel',
    catalogue_reference_image_url: 'https://example.test/kaido-parallel.png',
  }, 'set-op17', true)

  assert.equal(normal.card_number, parallel.card_number)
  assert.notEqual(normal.catalogue_match_id, parallel.catalogue_match_id)
  assert.notEqual(normal.catalogue_printing_key, parallel.catalogue_printing_key)
  assert.notEqual(normal.catalogue_reference_image_url, parallel.catalogue_reference_image_url)
  assert.equal(normal.variant_label, 'Normal')
  assert.equal(parallel.variant_label, 'Parallel')
})


test('blocks the same exact catalogue printing', () => {
  assert.equal(classifyPrintingDuplicate(
    { catalogue_match_id: 'kaido:en:op17', catalogue_printing_key: 'kaido', language: 'English' },
    { catalogue_match_id: 'kaido:en:op17', catalogue_printing_key: 'kaido', language: 'English' },
  ), 'exact')
})

test('allows a Normal and Parallel printing sharing a card number', () => {
  assert.equal(classifyPrintingDuplicate(
    { catalogue_match_id: 'kaido-normal:en:op17', catalogue_printing_key: 'kaido-normal', variant_label: 'Normal', language: 'English' },
    { catalogue_match_id: 'kaido-parallel:en:op17', catalogue_printing_key: 'kaido-parallel', variant_label: 'Parallel', language: 'English' },
  ), 'distinct')
})

test('treats different language printings as distinct', () => {
  assert.equal(classifyPrintingDuplicate(
    { catalogue_printing_key: 'kaido', language: 'English' },
    { catalogue_printing_key: 'kaido', language: 'Japanese' },
  ), 'distinct')
})

test('normalizes common language aliases before duplicate comparison', () => {
  assert.equal(classifyPrintingDuplicate(
    { catalogue_printing_key: 'kaido', language: 'EN' },
    { catalogue_printing_key: 'kaido', language: 'English' },
  ), 'exact')
  assert.equal(classifyPrintingDuplicate(
    { catalogue_printing_key: 'kaido', language: 'JP' },
    { catalogue_printing_key: 'kaido', language: 'Japanese' },
  ), 'exact')
})

test('does not block a shared printing key when either language is unknown', () => {
  assert.equal(classifyPrintingDuplicate(
    { catalogue_printing_key: 'kaido', language: '' },
    { catalogue_printing_key: 'kaido', language: 'English' },
  ), 'possible')
  assert.equal(classifyPrintingDuplicate(
    { catalogue_printing_key: 'kaido', language: null },
    { catalogue_printing_key: 'kaido', language: undefined },
  ), 'possible')
})

test('flags legacy entries without enough identity as possible duplicates', () => {
  assert.equal(classifyPrintingDuplicate(
    { variant_label: '', language: '' },
    { catalogue_match_id: 'kaido-parallel:en:op17', catalogue_printing_key: 'kaido-parallel', variant_label: 'Parallel', language: 'English' },
  ), 'possible')
})

test('uses stable printing key when catalogue match IDs differ', () => {
  assert.equal(classifyPrintingDuplicate(
    { catalogue_match_id: 'source-a:en:op17', catalogue_printing_key: 'kaido-normal', language: 'English' },
    { catalogue_match_id: 'source-b:en:op17', catalogue_printing_key: 'kaido-normal', language: 'English' },
  ), 'exact')
})
