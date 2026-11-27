import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'))

const matrix = readJson('../docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json')
const batches = Array.from({ length: 5 }, (_, index) =>
  readJson(`../docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-${String(index + 1).padStart(2, '0')}.json`),
)
const pages = batches.flatMap((batch) => batch.pages)
const bestSelection = readJson('../docs/catalogue-coverage/official-premium-card-collection-best-selection-vol6.json')
const pageFor = (set, language) => pages.find((page) => page.set === set && page.language === language)
const rowFor = (set, language) => matrix.rows.find((row) => row.set === set && row.language === language)

test('Stage 4B-1M coverage matrix retains all 50 independent language/set rows', () => {
  assert.equal(matrix.rows.length, 50)
  assert.equal(new Set(matrix.rows.map((row) => `${row.set}|${row.language}`)).size, 50)
  assert.ok(matrix.rows.every((row) => ['English', 'Japanese'].includes(row.language)))
  for (const row of matrix.rows) {
    assert.equal(row.official_printing_identity_ids.length, row.actual_distinct_printings, `${row.set} ${row.language} printing identities`)
    assert.equal(row.official_printing_identity_ids_verified_count, row.official_printing_identity_ids.length)
    assert.equal(new Set(row.official_printing_identity_ids).size, row.official_printing_identity_ids.length)
  }
})

test('every extracted Bandai page reconciles result rows, parsed entries and official image references', () => {
  const extracted = pages.filter((page) => page.source_status === 'EXTRACTED')
  assert.equal(pages.length, 50)
  assert.equal(extracted.length, 49)
  for (const page of extracted) {
    assert.equal(page.page_result_count, page.extracted_card_entry_count, `${page.set} ${page.language} result rows`)
    assert.equal(page.card_image_url_count, page.extracted_card_entry_count, `${page.set} ${page.language} image references`)
    assert.equal(page.image_alignment, 'ENTRY_ORDER_MATCH')
    assert.equal(page.image_missing_entries, 0)
    assert.equal(page.distinct_printing_identity_count, page.extracted_card_entry_count)
    assert.deepEqual(page.duplicate_printing_identities, [])
    for (const entry of page.entries) {
      assert.ok(entry.card_number)
      assert.ok(entry.name)
      assert.ok(entry.rarity)
      assert.ok(entry.type)
      assert.ok(entry.product)
      assert.ok(entry.image_url)
    }
  }
})

test('English EB-04 is assembled from the official OP14-EB04 and OP15-EB04 pages, not an invented standalone page', () => {
  const op14 = pageFor('OP-14', 'English')
  const op15 = pageFor('OP-15', 'English')
  const op14Eb04 = op14.entries.filter((entry) => entry.card_number.startsWith('EB04-'))
  const op15Eb04 = op15.entries.filter((entry) => entry.card_number.startsWith('EB04-'))
  const combined = [...op14Eb04, ...op15Eb04]
  assert.equal(op14Eb04.length, 40)
  assert.equal(op15Eb04.length, 41)
  assert.equal(new Set(combined.map((entry) => entry.card_number)).size, 61)
  assert.equal(combined.length, 81)
  assert.equal(rowFor('EB-04', 'English').official_expected_base_card_count, 61)
  assert.equal(rowFor('EB-04', 'English').expected_printings, 81)
  assert.equal(rowFor('EB-04', 'English').official_page_result_count, 81)
  assert.equal(rowFor('EB-04', 'English').source_availability, 'AVAILABLE')
  assert.equal(rowFor('EB-04', 'English').official_printing_identity_ids.length, 81)
})

test('EB-04 Japanese retains the four official non-EB04-numbered inclusions', () => {
  const row = rowFor('EB-04', 'Japanese')
  assert.equal(row.official_expected_base_card_count, 61)
  assert.equal(row.official_page_entry_count, 85)
  assert.equal(row.official_distinct_product_card_number_count, 65)
  assert.deepEqual(row.official_reprint_card_numbers, ['EB01-023', 'OP11-106', 'PRB02-006', 'PRB02-014'])
})

test('OP15-EB04 has one English-only cross-prefix printing after Japanese EB-04 reconciliation', () => {
  const englishOp15 = pageFor('OP-15', 'English')
  const japaneseEb04 = pageFor('EB-04', 'Japanese')
  const japaneseOp13 = pageFor('OP-13', 'Japanese')
  const zoroTr = englishOp15.entries.find((entry) => entry.card_number === 'OP13-037')
  assert.equal(zoroTr.rarity, 'TR')
  assert.equal(zoroTr.product, "-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]")
  assert.match(zoroTr.image_url, /OP13-037_p1\.png/)
  assert.equal(japaneseEb04.entries.some((entry) => entry.card_number === 'OP13-037'), false)
  assert.ok(japaneseOp13.entries.some((entry) => entry.card_number === 'OP13-037'))

  for (const cardNumber of ['OP11-106', 'PRB02-014']) {
    const englishEntry = englishOp15.entries.find((entry) => entry.card_number === cardNumber)
    const japaneseEntry = japaneseEb04.entries.find((entry) => entry.card_number === cardNumber)
    assert.ok(englishEntry)
    assert.equal(japaneseEntry.rarity, 'SPカード')
    assert.match(englishEntry.image_url, new RegExp(cardNumber + '_p2\\.png'))
    assert.match(japaneseEntry.image_url, new RegExp(cardNumber + '_p2\\\\.png'))
  }

  const reconciliation = rowFor('OP-15', 'English').language_specific_product_reconciliation
  assert.deepEqual(reconciliation.english_only_non_eb04_card_numbers, ['OP13-037'])
  assert.deepEqual(reconciliation.japanese_eb04_page_non_eb04_card_numbers_present, ['OP11-106', 'PRB02-014'])
})

test('PRB inventories preserve every official reprint product entry and distinct card number', () => {
  const prb1 = pageFor('PRB-01', 'English')
  const prb2 = pageFor('PRB-02', 'English')
  assert.equal(prb1.extracted_card_entry_count, 319)
  assert.equal(prb1.distinct_card_number_count, 111)
  assert.equal(prb1.distinct_base_card_number_count, null)
  assert.equal(prb1.product_prefix_card_number_count, 1)
  assert.deepEqual(prb1.base_card_numbers, [])
  assert.equal(prb2.extracted_card_entry_count, 316)
  assert.equal(prb2.distinct_card_number_count, 173)
  assert.equal(prb2.distinct_base_card_number_count, null)
  assert.equal(prb2.product_prefix_card_number_count, 18)
  assert.deepEqual(prb2.base_card_numbers, [])
})

test('OP-18 and EB-05 supplemental catalogue gaps are measured against official language pages', () => {
  for (const language of ['English', 'Japanese']) {
    assert.equal(pageFor('OP-18', language).extracted_card_entry_count, 159)
    assert.equal(pageFor('EB-05', language).extracted_card_entry_count, 96)
  }
  assert.equal(rowFor('OP-18', 'English').missing_printings.length, 3)
  assert.equal(rowFor('OP-18', 'English').unexpected_printings.length, 3)
  assert.equal(rowFor('OP-18', 'Japanese').missing_printings.length, 0)
  assert.equal(rowFor('EB-05', 'English').missing_printings.length, 0)
  assert.equal(rowFor('EB-05', 'Japanese').missing_printings.length, 0)
  for (const language of ['English', 'Japanese']) {
    assert.equal(rowFor('OP-18', language).official_parallel_variant_count, 33)
    assert.equal(rowFor('OP-18', language).official_special_printing_count, 7)
    assert.equal(rowFor('EB-05', language).official_parallel_variant_count, 27)
    assert.equal(rowFor('EB-05', language).official_special_printing_count, 8)
  }
})

test('Best Selection Vol.6 keeps OP15-075 and OP15-108 as separate product printings', () => {
  assert.equal(bestSelection.cards.length, 12)
  const elThor = bestSelection.cards.find((card) => card.card_number === 'OP15-075')
  const nami = bestSelection.cards.find((card) => card.card_number === 'OP15-108')
  assert.equal(elThor.name, 'El Thor')
  assert.equal(nami.name, 'Nami')
  assert.match(elThor.official_product_image_url, /img_item11\.webp$/)
  assert.match(nami.official_product_image_url, /img_item12\.webp$/)
  assert.equal(elThor.product_printing, 'Premium Card Collection -Best Selection Vol.6-')
  assert.equal(nami.product_printing, 'Premium Card Collection -Best Selection Vol.6-')
  assert.equal(elThor.official_cardlist_base_printing.product, "-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]")
  assert.equal(nami.official_cardlist_base_printing.product, "-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]")
  assert.ok(elThor.printing_identity.includes(elThor.product_printing))
  assert.ok(nami.printing_identity.includes(nami.product_printing))
  assert.notEqual(elThor.product_printing, elThor.official_cardlist_base_printing.product)
  assert.notEqual(nami.product_printing, nami.official_cardlist_base_printing.product)
  assert.equal(rowFor('OP-15', 'English').official_product_collection_printings.length, 12)
  assert.equal(rowFor('OP-15', 'English').additional_upstream_products[0].printing_product_link_count, 12)
})

test('Stage 3 supplemental OP-18 English image identifiers remain explicitly flagged for correction', () => {
  assert.deepEqual(rowFor('OP-18', 'English').missing_printings, [
    'OP18-049_p1',
    'OP13-012_p1',
    'OP17-040_p2',
  ])
  assert.deepEqual(rowFor('OP-18', 'English').unexpected_printings, [
    'OP18-064_p1',
    'OP13-012_p2',
    'OP17-040_p1',
  ])
})

test('upstream product-link counts match every standalone official product page', () => {
  const linkedRows = matrix.rows.filter((row) => row.upstream_product_key)
  assert.equal(linkedRows.length, 45)
  for (const row of linkedRows) {
    assert.equal(row.upstream_product_link_count, row.official_page_entry_count, `${row.set} ${row.language} upstream product links`)
    assert.equal(row.upstream_product_link_count_matches_official_page, true)
    assert.equal(row.upstream_product_link_count_delta, 0)
  }
  for (const set of ['OP-18', 'EB-05']) {
    for (const language of ['English', 'Japanese']) {
      assert.equal(rowFor(set, language).upstream_product_link_count, 0)
      assert.equal(rowFor(set, language).upstream_product_key, null)
    }
  }
})

test('OP-18 audit branch fix records language-specific card numbers and image IDs', () => {
  for (const language of ['English', 'Japanese']) {
    const fix = rowFor('OP-18', language).application_supplemental_comparison.audit_branch_fix
    assert.equal(fix.status, 'IMPLEMENTED; CI AND LIVE IMAGE AUDIT PENDING')
    assert.equal(fix.union_printing_records, 160)
    assert.equal(fix.english_printings, 159)
    assert.equal(fix.japanese_printings, 159)
    assert.ok(fix.changes.some((change) => change.includes('cardNumberEn/cardNumberJp')))
  }
})

test('EB-05 audit branch preserves eight Japanese SP rarity labels', () => {
  for (const language of ['English', 'Japanese']) {
    const fix = rowFor('EB-05', language).application_supplemental_comparison.audit_branch_fix
    assert.equal(fix.status, 'IMPLEMENTED; CI AND LIVE IMAGE AUDIT PENDING')
    assert.equal(fix.english_printings, 96)
    assert.equal(fix.japanese_printings, 96)
    assert.equal(fix.japanese_sp_rarity_labels_corrected, 8)
  }
})

test('PRB product-prefix numbers are not represented as original base-card counts', () => {
  for (const language of ['English', 'Japanese']) {
    const prb1 = rowFor('PRB-01', language)
    assert.equal(prb1.official_expected_base_card_count, null)
    assert.equal(prb1.actual_distinct_base_card_count, null)
    assert.deepEqual(prb1.official_base_card_numbers, [])
    assert.equal(prb1.official_product_prefix_card_number_count, 1)
    assert.deepEqual(prb1.official_product_prefix_card_numbers, ['PRB01-001'])

    const prb2 = rowFor('PRB-02', language)
    assert.equal(prb2.official_expected_base_card_count, null)
    assert.equal(prb2.actual_distinct_base_card_count, null)
    assert.deepEqual(prb2.official_base_card_numbers, [])
    assert.equal(prb2.official_product_prefix_card_number_count, 18)
    assert.deepEqual(
      prb2.official_product_prefix_card_numbers,
      Array.from({ length: 18 }, (_, index) => 'PRB02-' + String(index + 1).padStart(3, '0')),
    )
  }
})
