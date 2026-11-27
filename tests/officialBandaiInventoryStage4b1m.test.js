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
  assert.equal(rowFor('EB-04', 'English').official_page_result_count, null)
  assert.equal(rowFor('EB-04', 'English').source_availability, 'AVAILABLE VIA OP14-EB04 + OP15-EB04')
})

test('EB-04 Japanese retains the four official non-EB04-numbered inclusions', () => {
  const row = rowFor('EB-04', 'Japanese')
  assert.equal(row.official_expected_base_card_count, 61)
  assert.equal(row.official_page_entry_count, 85)
  assert.equal(row.official_distinct_product_card_number_count, 65)
  assert.deepEqual(row.official_reprint_card_numbers, ['EB01-023', 'OP11-106', 'PRB02-006', 'PRB02-014'])
})

test('PRB inventories preserve every official reprint product entry and distinct card number', () => {
  const prb1 = pageFor('PRB-01', 'English')
  const prb2 = pageFor('PRB-02', 'English')
  assert.equal(prb1.extracted_card_entry_count, 319)
  assert.equal(prb1.distinct_card_number_count, 111)
  assert.equal(prb1.distinct_base_card_number_count, 1)
  assert.equal(prb2.extracted_card_entry_count, 316)
  assert.equal(prb2.distinct_card_number_count, 173)
  assert.equal(prb2.distinct_base_card_number_count, 18)
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
})

test('Best Selection Vol.6 keeps OP15-075 and OP15-108 as separate product printings', () => {
  assert.equal(bestSelection.cards.length, 12)
  const elThor = bestSelection.cards.find((card) => card.card_number === 'OP15-075')
  const nami = bestSelection.cards.find((card) => card.card_number === 'OP15-108')
  assert.equal(elThor.name, 'El Thor')
  assert.equal(nami.name, 'Nami')
  assert.match(elThor.official_product_image_url, /img_item11\\.webp$/)
  assert.match(nami.official_product_image_url, /img_item12\\.webp$/)
  assert.equal(elThor.product_printing, 'Premium Card Collection -Best Selection Vol.6-')
  assert.equal(nami.product_printing, 'Premium Card Collection -Best Selection Vol.6-')
  assert.equal(elThor.official_cardlist_base_printing.product, "-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]")
  assert.equal(nami.official_cardlist_base_printing.product, "-ADVENTURE ON KAMI'S ISLAND- [OP15-EB04]")
  assert.notEqual(elThor.printing_identity, elThor.official_cardlist_base_printing.image_url)
  assert.notEqual(nami.printing_identity, nami.official_cardlist_base_printing.image_url)
})
