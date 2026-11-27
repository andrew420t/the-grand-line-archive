import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const matrix = JSON.parse(await readFile(new URL('../docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json', import.meta.url), 'utf8'))
const rows = matrix.rows
const stage = matrix.stage4b_1o_reconciliation
const audit = stage.application_runtime_audit

test('Stage 4B-1O verifies all 50 official language/set identity sets against the pinned application runtime', () => {
  assert.equal(audit.status, 'PASSED')
  assert.equal(audit.verified_commit, '162ad1616e2a12ac16bdb2493adc82e01d180cc1')
  assert.equal(audit.upstream_feed_commit, '619965ec198047de519dc6eb098c7a56aed9bd58')
  assert.equal(audit.language_set_rows, 50)
  assert.equal(audit.exact_identity_rows, 50)
  assert.equal(audit.official_release_assignment_printings, 7786)
  assert.equal(audit.application_reference_printings, 7786)
  assert.equal(audit.missing_identity_ids, 0)
  assert.equal(audit.unexpected_identity_ids, 0)
  assert.equal(audit.duplicate_identity_ids, 0)
  assert.equal(audit.field_mismatches, 0)
  assert.equal(audit.accepted_source_variations, 1)
})

test('all reference identities match while persisted Testing inventory linkage remains incomplete', () => {
  assert.equal(rows.length, 50)
  for (const row of rows) {
    assert.equal(row.application_reference_identity_reconciliation.status, 'EXACT_REFERENCE_IDENTITY_AND_METADATA_MATCH', `${row.set} ${row.language}`)
    assert.equal(row.application_reference_identity_reconciliation.missing_identity_ids.length, 0)
    assert.equal(row.application_reference_identity_reconciliation.unexpected_identity_ids.length, 0)
    assert.equal(row.application_reference_identity_reconciliation.duplicate_identity_ids.length, 0)
    assert.equal(row.application_reference_identity_reconciliation.metadata_mismatches, 0)
    assert.equal(row.verification_status, 'INCOMPLETE')
  }
  assert.equal(matrix.status_summary.COMPLETE, 0)
  assert.equal(matrix.status_summary.INCOMPLETE, 50)
  assert.equal(stage.testing_inventory_linkage.status, 'INCOMPLETE_SEPARATE')
})

test('Testing Supabase evidence describes exact stock/inventory linkage gaps without claiming it is the reference catalogue', () => {
  const evidence = stage.testing_inventory_linkage
  assert.equal(evidence.project_id, 'ehzqsnfkmwphyllhaqhe')
  assert.equal(evidence.total_products, 32)
  assert.equal(evidence.products_linked_to_release_set, 2)
  assert.equal(evidence.products_without_release_set, 30)
  assert.equal(evidence.distinct_linked_release_sets, 2)
  assert.equal(evidence.set_definitions, 25)
  assert.equal(evidence.catalogue_printing_keys, 0)
  assert.equal(evidence.catalogue_match_ids, 0)
  assert.equal(evidence.catalogue_reference_image_urls, 0)
  assert.equal(evidence.no_database_writes, true)
})

test('OP14/OP15 combined English source rows are split into distinct release assignments', () => {
  const op14 = rows.find((row) => row.set === 'OP-14' && row.language === 'English')
  const op15 = rows.find((row) => row.set === 'OP-15' && row.language === 'English')
  const eb04 = rows.find((row) => row.set === 'EB-04' && row.language === 'English')
  assert.equal(op14.official_page_entry_count, 159)
  assert.equal(op14.source_page_raw_entry_count, 199)
  assert.equal(op14.source_page_other_release_product_entry_count, 40)
  assert.equal(op15.official_page_entry_count, 155)
  assert.equal(op15.source_page_raw_entry_count, 196)
  assert.equal(op15.source_page_other_release_product_entry_count, 41)
  assert.equal(eb04.official_page_entry_count, 81)
})

test('OP18 and EB05 upstream-feed omissions are preserved separately from complete local application supplements', () => {
  for (const [set, expectedMissing, expectedPrintings] of [['OP-18',119,159],['EB-05',61,96]]) {
    for (const language of ['English','Japanese']) {
      const row = rows.find((item) => item.set === set && item.language === language)
      assert.equal(row.missing_card_numbers.length, expectedMissing)
      assert.equal(row.application_reference_identity_reconciliation.application_reference_printings, expectedPrintings)
    }
  }
})

test('PRB counts remain release-product counts and do not assert a base-card count', () => {
  for (const [set, prefixCount, originalNumbers, printings] of [['PRB-01',1,111,319],['PRB-02',18,173,316]]) {
    for (const language of ['English','Japanese']) {
      const row = rows.find((item) => item.set === set && item.language === language)
      assert.equal(row.actual_distinct_base_card_count, null)
      assert.equal(row.official_expected_base_card_count, null)
      assert.equal(row.official_product_prefix_card_number_count, prefixCount)
      assert.equal(row.official_distinct_product_card_number_count, originalNumbers)
      assert.equal(row.official_page_entry_count, printings)
    }
  }
})

test('Premium Card Collection and OP13-037 cross-prefix printings remain distinct and language-correct', () => {
  const pcc = stage.key_discrepancies.premium_card_collection_best_selection_vol6
  const op13 = stage.key_discrepancies.op13_037_english_tr
  assert.equal(pcc.linked_printing_count, 12)
  assert.equal(pcc.printing_keys.length, 12)
  assert.equal(op13.release_product_code, 'OP15-EB04')
  assert.equal(op13.application_product_code, 'OP15-EB04')
  assert.equal(op13.application_combined_set_code, 'OP15-EB04')
  assert.equal(stage.application_runtime_audit.op13_037.exact_match, true)
})

test('OP10 Japanese EB01-056 keeps the official product-specific spelling variation', () => {
  const row = rows.find((item) => item.set === 'OP-10' && item.language === 'Japanese')
  const variation = row.official_source_name_variations[0]
  assert.equal(variation.card_number, 'EB01-056')
  assert.equal(variation.printing_identity_id, 'EB01-056_p2')
  assert.equal(variation.original_eb01_official_name, 'シャーロット・フランぺ')
  assert.equal(variation.official_op10_printing_name, 'シャーロット・フランペ')
})

test('official image HTTP audit remains complete and application fallback tests are recorded', () => {
  const image = stage.image_http_audit_reference
  assert.equal(image.status, 'COMPLETE')
  assert.equal(image.unique_official_image_urls, 7798)
  assert.equal(image.status_counts.LOADED, 7798)
  assert.equal(image.status_counts.MISSING, 0)
  assert.equal(image.status_counts.INVALID_URL, 0)
  assert.equal(image.status_counts.TIMEOUT, 0)
  assert.equal(image.status_counts.TEMPORARY_FAILURE, 0)
  assert.match(image.alternate_image_fallback, /unit-tested/i)
})
