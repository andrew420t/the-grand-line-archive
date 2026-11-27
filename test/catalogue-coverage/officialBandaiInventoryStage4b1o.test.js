import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const matrix = JSON.parse(await readFile(new URL("../../docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json", import.meta.url), "utf8"));
const rows = matrix.rows;
const rowFor = (set, language) => rows.find((row) => row.set === set && row.language === language);

test("Stage 4B-1O matches all 50 official rows to the pinned reference-feed identity snapshot", () => {
  assert.equal(rows.length, 50);
  assert.equal(matrix.stage4b_1o_reconciliation.application_feed_reconciliation.exact_identity_set_matches, 50);
  assert.equal(matrix.stage4b_1o_reconciliation.application_feed_reconciliation.mismatched_rows, 0);
  assert.equal(matrix.application_comparison_evidence.reference_feed_reconciliation.exact_identity_set_matches, 50);
  assert.equal(matrix.application_comparison_evidence.reference_feed_reconciliation.mismatched_rows, 0);
  for (const row of rows) {
    const feed = row.application_feed_reconciliation;
    assert.equal(feed.status, "EXACT_IDENTITY_AND_METADATA_MATCH", `${row.set} ${row.language}`);
    assert.equal(feed.official_printing_identity_count, row.official_printing_identity_count);
    assert.equal(feed.application_reference_identity_count, row.official_printing_identity_count);
    assert.equal(feed.matched_identity_count, row.official_printing_identity_count);
    assert.deepEqual(feed.missing_printing_identity_ids, []);
    assert.deepEqual(feed.unexpected_printing_identity_ids, []);
    assert.match(feed.testing_database_persistence, /INCOMPLETE_SEPARATE/);
  }
});

test("combined English OP14-EB04 and OP15-EB04 release products remain separate", () => {
  assert.equal(rowFor("OP-14", "English").application_feed_reconciliation.linked_release_products[0].product_code, "OP14-EB04");
  assert.equal(rowFor("OP-15", "English").application_feed_reconciliation.linked_release_products[0].product_code, "OP15-EB04");
  const eb04 = rowFor("EB-04", "English").application_feed_reconciliation;
  assert.deepEqual(eb04.linked_release_products.map((p) => p.product_code).sort(), ["OP14-EB04", "OP15-EB04"]);
  assert.equal(eb04.application_reference_identity_count, 81);
});

test("OP18 and EB05 supplements do not invent upstream product or printing keys", () => {
  for (const set of ["OP-18", "EB-05"]) for (const language of ["English", "Japanese"]) {
    const feed = rowFor(set, language).application_feed_reconciliation;
    assert.equal(feed.local_official_supplement, true);
    assert.equal(feed.printing_key_count, feed.application_reference_identity_count);
    assert.equal(feed.upstream_printing_key_count, 0);
    assert.equal(feed.product_assignment_status, "LOCAL_OFFICIAL_SUPPLEMENT_SET_ASSIGNMENT");
    assert.ok(feed.printing_key_source.includes(set === "OP-18" ? "op18:" : "eb05:"));
    assert.deepEqual(feed.linked_release_products, []);
    assert.equal(feed.local_supplement_release_assignment.set_code, set);
  }
});

test("OP13-037 English TR and Japanese original retain distinct release assignments", () => {
  const d = matrix.stage4b_1o_reconciliation.key_discrepancies;
  assert.equal(d.op13_037_english_tr.printing_identity_id, "OP13-037_p1");
  assert.equal(d.op13_037_english_tr.release_product_code, "OP15-EB04");
  assert.equal(d.op13_037_japanese_original.printing_identity_id, "OP13-037");
  assert.equal(d.op13_037_japanese_original.release_product_code, "OP-13");
  assert.match(d.op13_037_japanese_original.result, /do not synthesize/i);
});

test("PRB reprints and Best Selection Vol.6 product printings remain separate", () => {
  const d = matrix.stage4b_1o_reconciliation.key_discrepancies;
  assert.deepEqual([d.prb_reprints.PRB01.English, d.prb_reprints.PRB01.Japanese], [319, 319]);
  assert.deepEqual([d.prb_reprints.PRB02.English, d.prb_reprints.PRB02.Japanese], [316, 316]);
  assert.equal(d.premium_card_collection_best_selection_vol6.linked_printing_count, 12);
  assert.equal(new Set(d.premium_card_collection_best_selection_vol6.printing_keys).size, 12);
  assert.equal(new Set(d.premium_card_collection_best_selection_vol6.image_ids).size, 12);
});

test("all 50 rows remain INCOMPLETE until persisted Testing data and local supplement keys are verified", () => {
  assert.equal(matrix.status_summary.COMPLETE, 0);
  assert.equal(matrix.status_summary.INCOMPLETE, 50);
  assert.equal(rows.filter((row) => row.verification_status === "COMPLETE").length, 0);
});
