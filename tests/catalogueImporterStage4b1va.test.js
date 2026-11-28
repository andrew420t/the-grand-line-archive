import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HISTORICAL_1P_COMMIT,
  PROTECTED,
  SOURCE_COMMIT,
  SOURCE_TREE,
  TESTING_PROJECT_REF,
  plan
} from '../scripts/catalogue-importer-stage4b1va.mjs';

const sourceDir = process.env.CATALOGUE_SOURCE_DIR;
const historicalPath = process.env.CATALOGUE_HISTORICAL_1P;

test('rejects Production or any project ref other than the verified Testing project', () => {
  assert.throws(() => plan('missing', { projectRef: 'production' }), /Only the verified Testing project reference/);
  assert.equal(TESTING_PROJECT_REF, 'ehzqsnfkmwphyllhaqhe');
});

test('rejects an unpinned source commit or tree before reading source files', () => {
  assert.throws(() => plan('missing', { sourceCommit: 'main' }), /pinned upstream source commit/);
  assert.throws(() => plan('missing', { sourceTree: 'other-tree' }), /pinned upstream source tree/);
  assert.equal(SOURCE_COMMIT, '619965ec198047de519dc6eb098c7a56aed9bd58');
  assert.equal(SOURCE_TREE, 'd0059fd77462cf377b9dfd65d87a6afabc76077f');
});

test('requires the retained 1P assignment evidence and rejects mislabelled evidence', () => {
  assert.throws(() => plan('missing'), /Stage 4B-1P official assignment artifact is required/);
  assert.throws(() => plan('missing', { historicalManifest: { stage: '4B-1Q', verifiedCommit: HISTORICAL_1P_COMMIT } }), /not the retained Stage 4B-1P artifact/);
});

test('commercial inventory, uploaded-image and inventory-link tables remain protected', () => {
  for (const table of [
    'public.products', 'public.cards', 'public.sets', 'public.product_images',
    'public.catalogue_inventory_links'
  ]) assert.ok(PROTECTED.includes(table));
});

test('full pinned-source and Stage 1P integration remains an offline zero-write dry run', {
  skip: !sourceDir || !historicalPath
}, () => {
  const historicalManifest = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
  const result = plan(sourceDir, { historicalManifest });
  assert.equal(result.status, 'RECONCILED_DRY_RUN_READY_FOR_SEPARATE_REVIEW');
  assert.equal(result.source.files, 27);
  assert.equal(result.source.rows, 74144);
  assert.equal(result.reconciliation.releaseSets, 25);
  assert.equal(result.reconciliation.languageSetRows, 50);
  assert.equal(result.reconciliation.officialSetPrintingAssignments, 7786);
  assert.equal(result.reconciliation.languageScopedBaseCardNumbers, 5123);
  assert.deepEqual(result.reconciliation.officialAssignmentsByLanguage, { en: 3898, jp: 3888 });
  assert.equal(result.reconciliation.sourceFeedAssignments, 7276);
  assert.equal(result.reconciliation.localOfficialSupplementAssignments, 510);
  assert.equal(result.reconciliation.premiumProducts, 24);
  assert.equal(result.reconciliation.premiumAssignments, 231);
  assert.equal(result.reconciliation.combinedDistinctPrintingIdentities, 8017);
  assert.equal(result.reconciliation.extraNaiveJoinRelationships, 395);
  assert.equal(result.reconciliation.imageExceptions.count, 360);
  assert.equal(result.writesPerformed, 0);
  assert.equal(result.liveImportCapability, false);
  assert.equal(result.targetGuard.databaseConnectionUsed, false);
  assert.equal(result.targetGuard.productionAccessed, false);
});
