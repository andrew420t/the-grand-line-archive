import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const matrix = JSON.parse(
  await readFile(
    new URL("../../docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json", import.meta.url),
    "utf8",
  ),
);
const rows = matrix.rows;
const rowFor = (set, language) => rows.find((row) => row.set === set && row.language === language);

test("official Bandai audit matrix contains all 25 sets in both languages", () => {
  assert.equal(rows.length, 50);
  const sets = new Set(rows.map((row) => row.set));
  assert.equal(sets.size, 25);
  for (const set of sets) {
    assert.deepEqual(
      rows.filter((row) => row.set === set).map((row) => row.language).sort(),
      ["English", "Japanese"],
    );
  }
});

test("all official result rows have parsed entries, printing identities and image references", () => {
  for (const row of rows) {
    assert.equal(row.parsed_official_printing_entries, row.official_page_entry_count, `${row.set} ${row.language} parsed count`);
    assert.equal(row.unparsed_result_rows, 0, `${row.set} ${row.language} unparsed rows`);
    assert.equal(row.source_image_url_extraction_shortfall, 0, `${row.set} ${row.language} image URL shortfall`);
    assert.equal(row.official_source_image_url_count, row.official_page_entry_count, `${row.set} ${row.language} image references`);
    assert.equal(row.official_printing_identity_count, row.official_page_entry_count, `${row.set} ${row.language} printing identities`);
    assert.equal(row.official_printing_identity_ids_verified_count, row.official_page_entry_count, `${row.set} ${row.language} verified identity IDs`);
    assert.equal(row.official_printing_identity_source_alignment, "ENTRY_ORDER_MATCH");
    assert.deepEqual(row.duplicate_printing_identities, []);
  }
});

test("all recorded official image HTTP requests loaded without false missing classifications", () => {
  for (const row of rows) {
    const audit = row.image_http_audit;
    assert.equal(audit.status, "ALL_LOADED", `${row.set} ${row.language} image audit`);
    assert.equal(audit.loaded, row.official_source_image_url_count);
    assert.equal(audit.missing, 0);
    assert.equal(audit.invalid_url, 0);
    assert.equal(audit.timeout, 0);
    assert.equal(audit.temporary_failure, 0);
    assert.equal(row.image_reference_verification, "HTTP_VERIFIED_LOADED");
    assert.deepEqual(row.missing_image_references, []);
  }
});

test("PRB product-prefix numbers are not misreported as base-card counts", () => {
  for (const [set, expectedPrefixCount, expectedDistinctNumbers, expectedPrintings] of [
    ["PRB-01", 1, 111, 319],
    ["PRB-02", 18, 173, 316],
  ]) {
    for (const language of ["English", "Japanese"]) {
      const row = rowFor(set, language);
      assert.ok(row);
      assert.equal(row.official_expected_base_card_count, null);
      assert.equal(row.actual_distinct_base_card_count, null);
      assert.deepEqual(row.official_base_card_numbers, []);
      assert.equal(row.official_product_prefix_card_number_count, expectedPrefixCount);
      assert.equal(row.official_product_prefix_card_numbers.length, expectedPrefixCount);
      assert.equal(row.official_distinct_product_card_number_count, expectedDistinctNumbers);
      assert.equal(row.official_page_entry_count, expectedPrintings);
    }
  }
});

test("English EB-04 is reconciled from the two official combined-product pages", () => {
  const row = rowFor("EB-04", "English");
  assert.equal(row.source_status, "EXTRACTED VIA COMBINED OFFICIAL PAGES");
  assert.equal(row.official_page_entry_count, 81);
  assert.equal(row.actual_distinct_base_card_count, 61);
  assert.equal(row.official_source_urls.length, 2);
  assert.deepEqual(
    row.source_result_counts.map((source) => source.matching_entries),
    [40, 41],
  );
});

test("OP-18 language-specific Treasure Rare identities remain distinct", () => {
  const english = rowFor("OP-18", "English").official_printing_identity_ids;
  const japanese = rowFor("OP-18", "Japanese").official_printing_identity_ids;
  assert.ok(english.includes("OP18-049_p1"));
  assert.ok(japanese.includes("OP18-064_p1"));
  assert.ok(!english.includes("OP18-064_p1"));
  assert.ok(!japanese.includes("OP18-049_p1"));
});

test("keeps overall rows INCOMPLETE while persisted Testing inventory linkage remains unverified", () => {
  assert.equal(matrix.application_comparison_evidence.project_id, "ehzqsnfkmwphyllhaqhe");
  assert.equal(matrix.application_comparison_evidence.products, 32);
  assert.equal(matrix.application_comparison_evidence.products_with_catalogue_printing_key, 0);
  assert.equal(matrix.stage4b_1o_reconciliation.application_runtime_audit.status, "PASSED");
  assert.equal(matrix.stage4b_1o_reconciliation.application_runtime_audit.exact_identity_rows, 50);
  assert.equal(matrix.stage4b_1o_reconciliation.application_runtime_audit.application_reference_printings, 7786);
  assert.equal(matrix.stage4b_1o_reconciliation.application_runtime_audit.field_mismatches, 0);
  assert.equal(matrix.rows.filter((row) => row.verification_status === "COMPLETE").length, 0);
  assert.equal(matrix.status_summary.COMPLETE, 0);
  assert.equal(matrix.status_summary.INCOMPLETE, 50);
});

test("OP-15 English OP13-037 is retained as a language-specific cross-prefix reprint", () => {
  const englishOp15 = rowFor("OP-15", "English");
  const japaneseEb04 = rowFor("EB-04", "Japanese");
  assert.ok(englishOp15.official_reprint_card_numbers.includes("OP13-037"));
  assert.ok(englishOp15.official_printing_identity_ids.includes("OP13-037_p1"));
  assert.ok(japaneseEb04.official_product_card_numbers.includes("OP11-106"));
  assert.ok(japaneseEb04.official_product_card_numbers.includes("PRB02-014"));
  assert.ok(!japaneseEb04.official_product_card_numbers.includes("OP13-037"));
  assert.equal(
    englishOp15.cross_language_product_number_discrepancies[0].classification,
    "ENGLISH_SOURCE_ONLY_CROSS_PREFIX_REPRINT",
  );
});


test("OP-10 Japanese EB01-056 records the official product-specific name variation", () => {
  const row = rowFor("OP-10", "Japanese");
  const variation = row.official_source_name_variations[0];
  assert.equal(variation.card_number, "EB01-056");
  assert.equal(variation.printing_identity_id, "EB01-056_p2");
  assert.equal(variation.original_eb01_official_name, "シャーロット・フランぺ");
  assert.equal(variation.official_op10_printing_name, "シャーロット・フランペ");
  assert.equal(variation.classification, "BANDAI_RELEASE_PAGE_SPELLING_VARIATION");
});
