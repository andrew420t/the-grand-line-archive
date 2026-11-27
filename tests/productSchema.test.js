import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCatalogueScannerFields, buildNewProductPayload, buildReferenceLibraryScanFields, classifyPrintingDuplicate, mergeCatalogueScannerFields } from '../src/admin/productSchema.js'

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
  counter: '1000',
  trigger_text: 'Draw 1 card.',
  attributes: 'Slash',
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
  assert.equal(payload.counter, 1000)
  assert.equal(payload.trigger_text, 'Draw 1 card.')
  assert.equal(payload.attributes, 'Slash')
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

test('catalogue scanner handoff copies all printing identity and card-detail fields', () => {
  const values = {
    name: 'Trafalgar Law', card_number: 'EB04-005', set_code: 'EB-04',
    rarity: 'Rare', language: 'Japanese', variant_label: 'Parallel',
    counter: '1000', trigger_text: 'Draw 1 card.', attributes: 'Slash',
    catalogue_match_id: 'printing-jp:jp:product-eb04',
    catalogue_printing_key: 'printing-jp',
    catalogue_reference_image_url: 'https://example.test/jp-card.png',
    catalogue_reference_image_source: 'Official catalogue',
    reference_image_url: 'https://example.test/jp-card.png',
    reference_printing_key: 'printing-jp',
    reference_match_id: 'printing-jp:jp:product-eb04',
    reference_image_source: 'Official catalogue',
  }
  const scannerFields = buildCatalogueScannerFields(values)
  for (const [key, value] of Object.entries(values)) assert.equal(scannerFields[key], value)
  assert.equal(scannerFields.effect_text, '')
})


test('normalizes set-code punctuation and resolves the matching set ID', async () => {
  const { normalizeSetCode, resolveSetIdForCode } = await import('../src/admin/productSchema.js')
  const sets = [{ id: 'op17-id', code: 'OP17' }, { id: 'eb04-id', code: 'EB-04' }]
  assert.equal(normalizeSetCode(' op-17 '), 'OP17')
  assert.equal(resolveSetIdForCode(sets, 'OP-17'), 'op17-id')
  assert.equal(resolveSetIdForCode(sets, 'EB04'), 'eb04-id')
  assert.equal(resolveSetIdForCode(sets, 'OP99'), '')
  assert.equal(resolveSetIdForCode([
    { id: 'first', code: 'OP17' },
    { id: 'second', code: 'OP-17' },
  ], 'OP17'), '')
})


test('editing card number, set, language or variant clears stale catalogue identity', async () => {
  const { buildQuickAddFieldUpdate } = await import('../src/admin/productSchema.js')
  const current = {
    card_number: 'OP17-062', set_code: 'OP17', set_id: 'op17-id',
    language: 'English', variant_label: 'Normal',
    catalogue_match_id: 'old-match', catalogue_printing_key: 'old-printing',
    catalogue_reference_image_url: 'https://example.test/old.png',
    catalogue_reference_image_source: 'Bandai',
    reference_image_url: 'https://example.test/old.png',
    reference_printing_key: 'old-printing', reference_match_id: 'old-match',
    reference_image_source: 'Bandai',
  }
  for (const [field, value] of [
    ['card_number', 'OP17-063'], ['set_code', 'EB04'],
    ['language', 'Japanese'], ['variant_label', 'Parallel'],
  ]) {
    const updated = buildQuickAddFieldUpdate(current, field, value, [
      { id: 'op17-id', code: 'OP17' }, { id: 'eb04-id', code: 'EB-04' },
    ])
    assert.equal(updated[field], value)
    for (const key of ['catalogue_match_id', 'catalogue_printing_key', 'catalogue_reference_image_url', 'catalogue_reference_image_source', 'reference_image_url', 'reference_printing_key', 'reference_match_id', 'reference_image_source']) {
      assert.equal(updated[key], '')
    }
    if (field === 'set_code') assert.equal(updated.set_id, 'eb04-id')
  }
})



test('bulk catalogue printing identity is retained by product payload creation', () => {
  const catalogueForm = {
    ...form,
    card_number: 'EB04-005',
    language: 'Japanese',
    variant_label: 'Parallel',
    catalogue_match_id: 'law-parallel:jp:product-eb04',
    catalogue_printing_key: 'law-parallel',
    catalogue_reference_image_url: 'https://example.test/law-parallel.png',
    catalogue_reference_image_source: 'Bandai official image',
  }
  const payload = buildNewProductPayload(catalogueForm, 'set-eb04', true)
  assert.equal(payload.catalogue_match_id, catalogueForm.catalogue_match_id)
  assert.equal(payload.catalogue_printing_key, catalogueForm.catalogue_printing_key)
  assert.equal(payload.catalogue_reference_image_url, catalogueForm.catalogue_reference_image_url)
  assert.equal(payload.catalogue_reference_image_source, catalogueForm.catalogue_reference_image_source)
  assert.equal(payload.language, 'Japanese')
  assert.equal(payload.variant_label, 'Parallel')
})


test('finds normalized set-code collisions before a new set is created', async () => {
  const { findSetCodeMatches } = await import('../src/admin/productSchema.js')
  const sets = [{ id: 'op17', code: 'OP17' }, { id: 'eb04', code: 'EB-04' }]
  assert.deepEqual(findSetCodeMatches(sets, 'OP-17').map((set) => set.id), ['op17'])
  assert.deepEqual(findSetCodeMatches(sets, 'EB04').map((set) => set.id), ['eb04'])
  assert.deepEqual(findSetCodeMatches(sets, 'OP99'), [])
})


test('catalogue confirmation preserves OCR text when the catalogue field is blank', () => {
  const current = {
    name: { value: 'Trafalgar Law OCR', confidence: 72, needsReview: true },
    effect_text: { value: 'On Your Opponent Turn: ...', confidence: 68, needsReview: true },
    rarity: { value: 'C', confidence: 55, needsReview: true },
    catalogue_match_id: { value: 'old-match', confidence: 95, needsReview: true },
    catalogue_printing_key: { value: 'old-printing', confidence: 95, needsReview: true },
    catalogue_reference_image_url: { value: 'https://example.test/old.png', confidence: 95, needsReview: true },
  }
  const merged = mergeCatalogueScannerFields(current, {
    name: 'Trafalgar Law',
    effect_text: '',
    rarity: 'Rare',
    catalogue_match_id: 'law-jp:jp:eb04',
    catalogue_printing_key: 'law-jp',
    catalogue_reference_image_url: 'https://example.test/law-jp.png',
  })

  assert.equal(merged.name.value, 'Trafalgar Law')
  assert.equal(merged.name.confidence, 95)
  assert.equal(merged.effect_text.value, 'On Your Opponent Turn: ...')
  assert.equal(merged.effect_text.confidence, 68)
  assert.equal(merged.rarity.value, 'Rare')
  assert.equal(merged.catalogue_match_id.value, 'law-jp:jp:eb04')
  assert.equal(merged.catalogue_printing_key.value, 'law-jp')
  assert.equal(merged.catalogue_reference_image_url.value, 'https://example.test/law-jp.png')
})

test('catalogue confirmation clears stale identity when the selected match has no reference identity', () => {
  const current = {
    catalogue_match_id: { value: 'old-match', confidence: 95 },
    catalogue_printing_key: { value: 'old-printing', confidence: 95 },
    catalogue_reference_image_url: { value: 'https://example.test/old.png', confidence: 95 },
    effect_text: { value: 'OCR effect', confidence: 60 },
  }
  const merged = mergeCatalogueScannerFields(current, { name: 'Custom card', effect_text: '' })

  assert.equal(merged.catalogue_match_id.value, '')
  assert.equal(merged.catalogue_printing_key.value, '')
  assert.equal(merged.catalogue_reference_image_url.value, '')
  assert.equal(merged.effect_text.value, 'OCR effect')
})

test('hands a reference-library printing into Add New Stock with release set and image identity intact', () => {
  const fields = buildReferenceLibraryScanFields({
    id: 'op18:OP13-012:en:OP18',
    printingKey: 'op18:OP13-012',
    cardNumber: 'OP13-012',
    name: 'Nefeltari Vivi',
    language: 'English',
    category: 'character',
    colors: 'Red',
    cost: 4,
    power: 5000,
    counter: 1000,
    attributes: 'Wisdom',
    traits: 'Alabasta',
    effect: 'On Play: Draw 1 card.',
    trigger: '',
    rarity: 'SP CARD',
    variant: 'SP CARD',
    variantLabel: 'SP CARD',
    setCode: 'OP-18',
    imageUrl: 'https://ehzqsnfkmwphyllhaqhe.supabase.co/functions/v1/bandai-card-image?language=en&id=OP13-012',
    source: 'Bandai official English OP-18 SP CARD image',
  })

  assert.equal(fields.name.value, 'Nefeltari Vivi')
  assert.equal(fields.card_number.value, 'OP13-012')
  assert.equal(fields.set_code.value, 'OP-18')
  assert.equal(fields.card_type.value, 'Character')
  assert.equal(fields.language.value, 'English')
  assert.equal(fields.variant_label.value, 'SP CARD')
  assert.equal(fields.catalogue_match_id.value, 'op18:OP13-012:en:OP18')
  assert.equal(fields.catalogue_printing_key.value, 'op18:OP13-012')
  assert.equal(fields.catalogue_reference_image_url.value, 'https://ehzqsnfkmwphyllhaqhe.supabase.co/functions/v1/bandai-card-image?language=en&id=OP13-012')
  assert.equal(fields.effect_text.value, 'On Play: Draw 1 card.')
  assert.equal(fields.counter.value, '1000')
  assert.equal(fields.attributes.value, 'Wisdom')
  assert.equal(fields.classification.value, 'Alabasta')
  assert.equal(fields.catalogue_match_id.needsReview, true)
})

test('adds a product to Bulk only when explicitly selected', () => {
  const regularPayload = buildNewProductPayload({ ...form, is_bulk: false }, 'set-uuid', true)
  const bulkPayload = buildNewProductPayload({ ...form, is_bulk: true }, 'set-uuid', true)

  assert.equal('is_bulk' in regularPayload, false)
  assert.equal(bulkPayload.is_bulk, true)
})
