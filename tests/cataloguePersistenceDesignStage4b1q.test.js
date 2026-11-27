import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const matrix = JSON.parse(await readFile(new URL('../docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json', import.meta.url), 'utf8'))
const design = await readFile(new URL('../docs/catalogue-coverage/stage4b-1q-reference-catalogue-persistence-design.md', import.meta.url), 'utf8')
const sql = await readFile(new URL('../supabase/review-only/catalogue-reference-persistence-stage4b-1q.sql', import.meta.url), 'utf8')

test('Stage 4B-1Q matrix preserves all 50 rows as incomplete until Testing persistence is verified', () => {
  assert.equal(matrix.rows.length, 50)
  assert.equal(matrix.status_summary.COMPLETE, 0)
  assert.equal(matrix.status_summary.INCOMPLETE, 50)
  const stage = matrix.stage4b_1q_reconciliation
  assert.equal(stage.status, 'DESIGN_AND_READ_ONLY_DRY_RUN_COMPLETE; DATABASE_MIGRATION_AND_IMPORT_NOT_AUTHORIZED')
  assert.equal(stage.all_50_rows.official_release_assignment_printings, 7786)
  assert.equal(stage.all_50_rows.persisted_reference_printing_keys, 0)
  assert.equal(stage.all_50_rows.missing_persisted_reference_printing_keys, 7786)
  assert.equal(stage.all_50_rows.complete_rows, 0)
  assert.equal(stage.all_50_rows.incomplete_rows, 50)
})

test('Stage 4B-1Q import plan pins the feed and preserves all expected distinct identities', () => {
  const plan = matrix.stage4b_1q_reconciliation.import_plan
  assert.equal(plan.source_commit, '619965ec198047de519dc6eb098c7a56aed9bd58')
  assert.equal(plan.official_language_set_rows, 50)
  assert.equal(plan.release_sets, 25)
  assert.equal(plan.set_release_assignment_records, 7786)
  assert.equal(plan.distinct_language_scoped_set_printing_keys, 7786)
  assert.equal(plan.distinct_language_scoped_base_card_numbers, 5123)
  assert.equal(plan.local_official_supplements.OP18.total, 318)
  assert.equal(plan.local_official_supplements.EB05.total, 192)
  assert.equal(plan.local_official_supplements.total, 510)
  assert.equal(plan.additional_premium_product_printing_assignments, 231)
  assert.equal(plan.combined_distinct_language_scoped_printing_keys, 8017)
  assert.ok(plan.complete_import_manifest_artifact_url.includes('/artifacts/15225393084'))
})

test('Stage 4B-1Q preserves all English and Japanese Premium Card Collection identities', () => {
  const premium = matrix.stage4b_1q_reconciliation.premium_card_collection
  assert.equal(premium.english.named_products, 9)
  assert.equal(premium.english.product_printing_links, 103)
  assert.equal(premium.japanese.named_products, 15)
  assert.equal(premium.japanese.product_printing_links, 128)
  assert.equal(premium.verified_english_product_counterparts, undefined)
  assert.equal(premium.japanese.verified_english_product_counterparts, 8)
  assert.equal(premium.japanese.counterpart_printing_links, 91)
  assert.equal(premium.exact_runtime_matches, 231)
  assert.equal(premium.missing_or_mismatched, 0)
  assert.equal(premium.japanese_fest_23_24_product, 'NOT_PRESENT_IN_PINNED_JAPANESE_FEED')
})

test('proposed SQL defines normalized language-scoped reference identities and assignments', () => {
  for (const table of [
    'catalogue_release_sets', 'catalogue_release_products', 'catalogue_cards',
    'catalogue_printings', 'catalogue_printing_images', 'catalogue_product_sets',
    'catalogue_product_printings', 'catalogue_set_printings', 'catalogue_inventory_links',
  ]) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), table)
  }
  assert.ok(sql.includes('UNIQUE (language, printing_key)'))
  assert.ok(sql.includes('FOREIGN KEY (card_id, language)'))
  assert.ok(sql.includes('FOREIGN KEY (printing_id, language)'))
  assert.ok(sql.includes('guard_catalogue_inventory_link_language'))
  assert.ok(sql.includes('ON DELETE RESTRICT'))
})

test('proposed SQL is review-only, client read-only, and contains no inventory/catalogue seed writes', () => {
  assert.match(sql, /REVIEW ONLY/i)
  assert.match(sql, /ehzqsnfkmwphyllhaqhe/)
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /GRANT SELECT ON/)
  assert.match(sql, /public\.is_admin\(\)/)
  const executable = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(executable, /INSERT\s+INTO\s+public\.(products|cards|catalogue_)/i)
  assert.doesNotMatch(executable, /UPDATE\s+public\.(products|cards)/i)
  assert.doesNotMatch(executable, /DELETE\s+FROM\s+public\.(products|cards)/i)
  assert.match(design, /No Testing Supabase writes, inserts, updates, deletes, or seeds were executed/)
  assert.match(design, /0 COMPLETE \/ 50 INCOMPLETE/)
})
