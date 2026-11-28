import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  HISTORICAL_1P_COMMIT,
  PROTECTED,
  SOURCE_COMMIT,
  SOURCE_TREE,
  TESTING_PROJECT_REF,
  classifyUnsupportedSourceFiles,
  getReconciliationAcceptanceIssues,
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

test('reports the exact failed reconciliation status and mapping validation instead of a generic importer error', () => {
  const reports = {
    assignment: { status: 'RECONCILED_7786_OFFICIAL_ASSIGNMENTS_AND_231_PREMIUM_ASSIGNMENTS', validationErrors: [] },
    relationship: { status: 'RECONCILED_395_COMBINED_PRODUCT_JOIN_EXPANSIONS', validationErrors: [] },
    provenance: {
      status: 'IMAGE_EXCEPTIONS_NEED_REVIEW',
      validationErrors: ['Language-scoped image ID identities and Bandai URL candidates must be one-to-one']
    },
    coverage: { status: 'RECONCILED_25_SETS_50_LANGUAGE_SET_ROWS', validationErrors: [] }
  };
  assert.deepEqual(getReconciliationAcceptanceIssues(reports), [
    'provenance status: expected 360_LOCAL_SUPPLEMENT_IMAGE_EXCEPTIONS_CLASSIFIED, got IMAGE_EXCEPTIONS_NEED_REVIEW',
    'provenance validation: Language-scoped image ID identities and Bandai URL candidates must be one-to-one'
  ]);
});

test('classifies actual manifest source types and excludes only out-of-scope languages or entities', () => {
  const files = [
    { path: 'data/products/en.jsonl', type: 'product', sourceRows: 99 },
    { path: 'data/products/jp.jsonl', type: 'product', sourceRows: 92 },
    { path: 'data/products/cn.jsonl', type: 'product', sourceRows: 72 },
    { path: 'data/printing_products/tcgcsv.jsonl', type: 'printing_product', sourceRows: 100 },
    { path: 'data/designs.jsonl', type: 'design', sourceRows: 40 },
    { path: 'data/retired_printings.jsonl', type: 'retired_printing', sourceRows: 9832 }
  ];
  const unsupported = classifyUnsupportedSourceFiles(files);
  assert.deepEqual(unsupported.map(file => file.path), [
    'data/products/cn.jsonl',
    'data/printing_products/tcgcsv.jsonl',
    'data/designs.jsonl',
    'data/retired_printings.jsonl'
  ]);
  assert.equal(unsupported.reduce((sum, file) => sum + file.rows, 0), 10044);
});

test('writes a zero-write diagnostic artifact even when the offline dry-run cannot start', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-importer-r10-'));
  const output = path.join(root, 'diagnostics.json');
  const script = fileURLToPath(new URL('../scripts/catalogue-importer-stage4b1va.mjs', import.meta.url));
  try {
    const result = spawnSync(process.execPath, [
      script, '--dry-run', '--source-dir', path.join(root, 'missing-source'),
      '--historical-1p', path.join(root, 'missing-1p.json'), '--output', output
    ], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(report.status, 'BLOCKED_DRY_RUN');
    assert.match(report.error, /ENOENT/);
    assert.equal(report.writesPerformed, 0);
    assert.equal(report.liveImportCapability, false);
    assert.equal(report.databaseConnectionUsed, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
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
  assert.deepEqual(result.reconciliation.op18Supplement, { en: 159, jp: 159, total: 318 });
  assert.deepEqual(result.reconciliation.eb05Supplement, { en: 96, jp: 96, total: 192 });
  assert.equal(result.reconciliation.premiumProducts, 24);
  assert.equal(result.reconciliation.premiumAssignments, 231);
  assert.equal(result.reconciliation.combinedDistinctPrintingIdentities, 8017);
  assert.equal(result.reconciliation.extraNaiveJoinRelationships, 395);
  assert.deepEqual(result.reconciliation.sourceRelationshipGroups.map(group => [group.productCode, group.productPrintingEdges, group.extraNaiveSetEdges]), [
    ['OP14-EB04', 199, 199],
    ['OP15-EB04', 196, 196]
  ]);
  assert.equal(result.reconciliation.imageExceptions.count, 360);
  assert.equal(result.reconciliation.imageExceptions.uniqueImageIds, 180);
  assert.equal(result.reconciliation.imageExceptions.uniqueLanguageScopedImageIds, 360);
  assert.equal(result.reconciliation.imageExceptions.uniqueBandaiUrlCandidates, 360);
  assert.deepEqual(result.reconciliation.imageExceptions.bySetAndLanguage, {
    'EB-05|en': 61,
    'EB-05|jp': 61,
    'OP-18|en': 119,
    'OP-18|jp': 119
  });
  assert.deepEqual(result.validation, {
    sourceFileHashes: 'PASS',
    sourceManifestRows: 'PASS',
    assignmentIdentities: 'RECONCILED_7786_OFFICIAL_ASSIGNMENTS_AND_231_PREMIUM_ASSIGNMENTS',
    setAndLanguageRows: 'RECONCILED_25_SETS_50_LANGUAGE_SET_ROWS',
    productRelationshipExpansion: 'RECONCILED_395_COMBINED_PRODUCT_JOIN_EXPANSIONS',
    imageExceptionClassification: '360_LOCAL_SUPPLEMENT_IMAGE_EXCEPTIONS_CLASSIFIED',
    premiumAssignments: 'PASS_231_DISTINCT_LANGUAGE_SCOPED_LINKS'
  });
  assert.equal(result.writesPerformed, 0);
  assert.equal(result.liveImportCapability, false);
  assert.equal(result.targetGuard.databaseConnectionUsed, false);
  assert.equal(result.targetGuard.productionAccessed, false);
});
