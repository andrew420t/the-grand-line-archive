import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildReports } from '../scripts/reconcileCatalogueEvidenceStage4b1vA5s1r2.mjs';

function writeLines(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}
function fixture({ duplicate = false, mismatch = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-r2-'));
  writeLines(path.join(root, 'data/product_sets.jsonl'), [
    { key: 'en:569114@OP-14', product_key: 'en:569114', set_key: 'OP-14' },
    { key: 'en:569114@EB-04', product_key: 'en:569114', set_key: 'EB-04' }
  ]);
  writeLines(path.join(root, 'data/products/en.jsonl'), [
    { key: 'en:569114', site: 'en', code: 'OP14-EB04', name: 'Combined test product' }
  ]);
  writeLines(path.join(root, 'data/products/jp.jsonl'), []);
  writeLines(path.join(root, 'data/printing_products/en.jsonl'), [
    { key: 'p1@en:569114', product_key: 'en:569114', printing_key: 'p1' },
    { key: 'p2@en:569114', product_key: 'en:569114', printing_key: 'p2' }
  ]);
  writeLines(path.join(root, 'data/printing_products/jp.jsonl'), []);
  const records = [
    { language: 'en', printingKey: 'p1', productKey: 'en:569114', releaseSet: 'OP-14', cardNumber: 'OP14-001', imageId: 'OP14-001', officialImageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP14-001.png', exactReferenceImageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP14-001.png', applicationImageUrl: '/_card-image/bandai/en/OP14-001.png', source: 'Bandai official English printing image' },
    { language: 'en', printingKey: 'p2', productKey: 'en:569114', releaseSet: 'EB-04', cardNumber: 'EB04-001', imageId: 'EB04-001', officialImageUrl: '', exactReferenceImageUrl: '/_card-image/bandai/en/EB04-001.png', applicationImageUrl: '/_card-image/bandai/en/EB04-001.png', source: 'Bandai official EB-04 Base artwork' }
  ];
  if (duplicate) records.push({ ...records[0] });
  const historicalManifest = {
    stage: '4B-1P', verifiedCommit: 'd0c478adf17767d0fa441c4483ac42a18a4b089a',
    checkedAt: '2026-11-27T19:04:23.118Z',
    importPlan: { referencePrintingRecords: mismatch ? records.slice(0, 1) : records },
    premiumCollections: { english: { namedProductCount: 0, productPrintingLinks: 0, products: [] }, japanese: { namedProductCount: 0, productPrintingLinks: 0, allNamedJapaneseProducts: [] }, totals: { allProductPrintingLinks: 0 } }
  };
  return { root, historicalManifest };
}

test('1. reconciles source product-printing edges to retained 1P manifest', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.assignment.feedEdgeComparison.pinnedSourceProductPrintingEdges, 2);
  assert.equal(r.assignment.feedEdgeComparison.missingFromManifestCount, 0);
  assert.equal(r.assignment.feedEdgeComparison.missingFromSourceCount, 0);
});

test('2. identifies extra set edges created by a multi-set product join', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.relationship.counts.naiveDerivedSetPrintingEdges, 4);
  assert.equal(r.relationship.counts.naiveJoinExpansion, 2);
  assert.equal(r.relationship.status, 'PARTIALLY_RECONCILED');
});

test('3. preserves the manifest release set instead of approving every joined set', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.relationship.duplicateDerivedEdges[0].manifestReleaseSet, 'OP-14');
  assert.equal(r.relationship.approvalPolicy.includes('No relationship is automatically approved'), true);
});

test('4. reports duplicate language-scoped printing identities', () => {
  const f = fixture({ duplicate: true });
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.deepEqual(r.assignment.duplicateLanguagePrintingIdentities, ['en|p1']);
  assert.equal(r.assignment.status, 'PARTIALLY_RECONCILED');
});

test('5. classifies proxy paths separately from official URLs', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.provenance.counts.missingHistoricalOfficialImageUrl, 1);
  assert.equal(r.provenance.counts.exactReferenceImageUrlIsApplicationPath, 1);
  assert.equal(r.provenance.affectedRecords[0].candidateStatus, 'DERIVED_FROM_LANGUAGE_AND_BANDAI_IMAGE_ID_NOT_STORED_AS_HISTORICAL_OFFICIAL_URL');
});

test('6. rejects a different pinned source commit', () => {
  const f = fixture();
  assert.throws(() => buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest, sourceCommit: 'wrong' }), /Pinned source commit mismatch/);
});

test('7. rejects a missing source directory', () => {
  const f = fixture();
  assert.throws(() => buildReports({ sourceDir: path.join(f.root, 'missing'), historicalManifest: f.historicalManifest }), /source directory missing/);
});

test('8. rejects a historical artifact without the assignment manifest', () => {
  const f = fixture();
  assert.throws(() => buildReports({ sourceDir: f.root, historicalManifest: { importPlan: {} } }), /does not contain referencePrintingRecords/);
});

test('9. keeps Stage 1P provenance distinct from Stage 1Q recovery', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.assignment.historicalEvidence.stage, '4B-1P');
  assert.equal(r.oneQ.status, 'ORIGINAL_1Q_ARTIFACT_NOT_RECOVERED_IN_INVESTIGATED_RECORDS');
});

test('10. reports the local supplement boundary without inventing feed product keys', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.assignment.localSupplements.total, 510);
  assert.equal(r.assignment.localSupplements.OP18.total, 318);
  assert.equal(r.assignment.localSupplements.EB05.total, 192);
});

test('11. coverage separates English and Japanese source relationships', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.coverage.productSetEdgesByLanguage.en, 2);
  assert.equal(r.coverage.productSetEdgesByLanguage.jp, 0);
});

test('12. reports per-set assignment counts from the retained manifest', () => {
  const f = fixture();
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.coverage.releaseSetCounts.find(x => x.setCode === 'OP-14').englishAssignments, 1);
  assert.equal(r.coverage.releaseSetCounts.find(x => x.setCode === 'EB-04').englishAssignments, 1);
});

test('13. detects feed edges missing from the historical manifest', () => {
  const f = fixture({ mismatch: true });
  const r = buildReports({ sourceDir: f.root, historicalManifest: f.historicalManifest });
  assert.equal(r.assignment.feedEdgeComparison.missingFromManifestCount, 1);
  assert.equal(r.assignment.status, 'PARTIALLY_RECONCILED');
});
