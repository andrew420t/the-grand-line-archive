import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMPTY_CATALOGUE_TABLES,
  TESTING_PROJECT,
  compareTestingSnapshot
} from '../scripts/compareTestingCatalogueSnapshotStage4b1va5s1r9.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = path.join(root, 'docs/catalogue-coverage/stage4b-1v-a5s-1r-9-testing-read-only-snapshot.json');
const sqlPath = path.join(root, 'supabase/review-only/stage4b-1v-a5s-1r-9-testing-read-only-comparison.sql');

test('compares only the named Testing project read-only snapshot', () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const report = compareTestingSnapshot(snapshot);
  assert.equal(report.status, 'TESTING_READ_ONLY_COMPARISON_PASSED');
  assert.equal(report.project.ref, TESTING_PROJECT.ref);
  assert.equal(report.current.products, 32);
  assert.equal(report.current.sets, 25);
  assert.equal(report.current.product_image_rows, 9);
  assert.equal(report.current.products_with_uploaded_image, 5);
  assert.equal(report.current.legacy_public_cards, 0);
  assert.equal(report.current.catalogue_counts.catalogue_inventory_links, 0);
  assert.equal(Object.values(report.current.catalogue_counts).every(count => count === 0), true);
});

test('preserves both Japanese OP17-119 Loki inventory records as distinct IDs', () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const report = compareTestingSnapshot(snapshot);
  const loki = report.current.loki_records;
  assert.equal(loki.length, 2);
  assert.equal(new Set(loki.map(row => row.product_id)).size, 2);
  assert.deepEqual(loki.map(row => row.set_code).sort(), [null, 'OP-17'].sort());
  assert.equal(report.comparison.lokiRecordsDistinctAndPreserved, true);
});

test('fails closed if project identity, inventory counts or catalogue emptiness drift', () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  snapshot.project.ref = 'production';
  snapshot.snapshot.products = 33;
  snapshot.snapshot.catalogue_counts.catalogue_printings = 1;
  const report = compareTestingSnapshot(snapshot);
  assert.equal(report.status, 'TESTING_READ_ONLY_COMPARISON_FAILED');
  assert.ok(report.errors.some(error => error.includes('project identity')));
  assert.ok(report.errors.some(error => error.includes('products count')));
  assert.equal(report.comparison.catalogueDifferences.catalogue_printings.actual, 1);
});

test('read-only query has no write, DDL, permission or transaction statements', () => {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const executableSql = sql.split(/\r?\n/).filter(line => !line.trim().startsWith('--')).join('\n');
  assert.match(executableSql, /^\s*WITH\b/i);
  assert.equal((executableSql.match(/;/g) || []).length, 1);
  assert.match(executableSql.trim(), /;$/);
  assert.doesNotMatch(executableSql, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|MERGE|CALL|DO|GRANT|REVOKE|COPY|COMMIT|ROLLBACK)\b/i);
  for (const table of EMPTY_CATALOGUE_TABLES) assert.ok(executableSql.includes(`public.${table}`));
});
