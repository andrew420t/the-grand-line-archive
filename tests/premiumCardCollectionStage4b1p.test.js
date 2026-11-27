import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const premium = JSON.parse(await readFile(new URL('../docs/catalogue-coverage/official-premium-card-collection-stage4b-1p.json', import.meta.url), 'utf8'))
const testing = JSON.parse(await readFile(new URL('../docs/catalogue-coverage/testing-inventory-snapshot-stage4b-1p.json', import.meta.url), 'utf8'))

test('English Premium Card Collection inventory preserves all nine named products and 103 linked printings', () => {
  assert.equal(premium.english.product_count, 9)
  assert.equal(premium.english.product_link_rows, 103)
  assert.equal(premium.english.requested_eight_product_printings, 91)
  assert.equal(premium.english.previously_verified_vol6_printings, 12)
  assert.equal(premium.english.products.length, 9)
  assert.deepEqual(premium.english.products.map((product) => product.linked_printing_count), [9,12,12,12,12,12,10,12,12])
  const keys = premium.english.products.flatMap((product) => product.cards.map((card) => card.printing_key))
  assert.equal(new Set(keys).size, 103)
  for (const product of premium.english.products) {
    assert.equal(product.cards.length, product.linked_printing_count)
    assert.equal(product.distinct_printing_keys, product.linked_printing_count)
    assert.equal(product.locator_count, product.linked_printing_count)
    for (const card of product.cards) {
      assert.equal(card.language, 'en')
      assert.equal(card.product_key, product.product_key)
      assert.ok(card.printing_key.startsWith('prt_'))
      assert.ok(card.image_id)
      assert.ok(card.card_number)
      assert.ok(card.image_id.startsWith(card.card_number))
    }
  }
})

test('Japanese Premium Card Collection inventory is separate and contains only pinned Japanese product records', () => {
  assert.equal(premium.japanese.named_product_count, 15)
  assert.equal(premium.japanese.product_link_rows, 128)
  assert.equal(premium.japanese.distinct_printing_keys, 128)
  assert.equal(premium.japanese.products.length, 15)
  const keys = premium.japanese.products.flatMap((product) => product.cards.map((card) => card.printing_key))
  assert.equal(new Set(keys).size, 128)
  for (const product of premium.japanese.products) {
    assert.equal(product.cards.length, product.linked_printing_count)
    assert.equal(product.distinct_printing_keys, product.linked_printing_count)
    assert.equal(product.locator_count, product.linked_printing_count)
    for (const card of product.cards) {
      assert.equal(card.language, 'jp')
      assert.equal(card.product_key, product.product_key)
      assert.ok(card.printing_key.startsWith('prt_'))
      assert.ok(card.image_id)
      assert.ok(card.card_number)
      assert.ok(card.image_id.startsWith(card.card_number))
    }
  }
})

test('eight English Premium products have eight verified Japanese Bandai-listed counterparts, while Fest 23-24 is not invented', () => {
  const mappings = premium.japanese_counterpart_audit.verified_bandai_page_mappings
  assert.equal(mappings.length, 8)
  assert.equal(mappings.reduce((sum, product) => sum + product.linked_printing_count, 0), 91)
  assert.deepEqual(mappings.map((product) => product.linked_printing_count), [9,12,12,12,12,12,10,12])
  const fest = premium.japanese_counterpart_audit.BANDAI_CARD_GAMES_Fest_23_24
  assert.equal(fest.status, 'NO_MATCHING_NAMED_JAPANESE_PRODUCT_IN_PINNED_JAPANESE_PRODUCT_FEED')
  assert.equal(fest.product_key, null)
  assert.equal(fest.official_product_page_url, null)
})

test('Testing Supabase snapshot proves the catalogue persistence gap without writing or merging inventory rows', () => {
  assert.equal(testing.read_only, true)
  assert.equal(testing.no_database_writes, true)
  assert.equal(testing.project_id, 'ehzqsnfkmwphyllhaqhe')
  assert.equal(testing.counts.products, 32)
  assert.equal(testing.counts.sets, 25)
  assert.equal(testing.counts.cards, 0)
  assert.equal(testing.counts.linked_products, 2)
  assert.equal(testing.counts.unassigned_products, 30)
  assert.equal(testing.counts.linked_sets, 2)
  assert.equal(testing.counts.match_ids, 0)
  assert.equal(testing.counts.printing_keys, 0)
  assert.equal(testing.counts.reference_images, 0)
  assert.equal(testing.counts.product_images, 9)
  assert.equal(testing.counts.with_uploaded_image, 5)
  assert.equal(testing.products.length, 32)
  assert.equal(testing.schema_assessment.dedicated_reference_catalogue_table_present, false)
  assert.equal(testing.schema_assessment.public_cards.usable_for_full_catalogue, false)
  assert.equal(testing.schema_assessment.public_products.is_inventory_table, true)
})

test('Repeated OP17-119 Japanese stock rows remain reported and are not deduplicated', () => {
  assert.deepEqual(testing.duplicate_card_number_groups, [{
    language: 'Japanese',
    card_number: 'OP17-119',
    rows: 2,
    product_names: ['Loki', 'Loki'],
  }])
  assert.equal(testing.products.filter((product) => product.card_number === 'OP17-119').length, 2)
})
