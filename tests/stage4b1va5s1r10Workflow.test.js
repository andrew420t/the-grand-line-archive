import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = name => fs.readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');

test('historical reconciliation keeps independent audits and artifact upload after earlier failures', () => {
  const text = workflow('stage4b-1v-a5s-1r-2-evidence-reconciliation.yml');
  const reportStep = text.indexOf('id: reconciliation_reports');
  const imageAuditStep = text.indexOf('id: image_exception_http_reconciliation');
  const premiumAuditStep = text.indexOf('id: premium_image_http_audit');
  const artifactStep = text.indexOf('name: Upload reconciliation evidence');
  const acceptanceStep = text.indexOf('id: final_acceptance');

  assert.ok(reportStep >= 0 && imageAuditStep > reportStep);
  assert.ok(premiumAuditStep > reportStep);
  assert.ok(artifactStep > premiumAuditStep);
  assert.ok(acceptanceStep > artifactStep);
  assert.match(text.slice(imageAuditStep, premiumAuditStep), /if: \$\{\{ always\(\) && steps\.setup_node\.outcome == 'success' \}\}/);
  assert.match(text.slice(premiumAuditStep, artifactStep), /if: \$\{\{ always\(\) && steps\.setup_node\.outcome == 'success' \}\}/);
  assert.match(text.slice(artifactStep, acceptanceStep), /if: always\(\)/);
  assert.match(text, /--run-http/);
  assert.match(text, /360-image-exception-reconciliation=\$IMAGE_EXCEPTIONS/);
  assert.match(text, /231-premium-image-audit=\$PREMIUM_IMAGES/);
});

test('Testing dry-run uploads diagnostics before its explicit final acceptance gate', () => {
  const text = workflow('stage4b-1v-a5s-1r-3-testing-dry-run.yml');
  const dryRunStep = text.indexOf('id: importer_dry_run');
  const snapshotStep = text.indexOf('id: testing_snapshot_comparison');
  const artifactStep = text.indexOf('name: Upload dry-run evidence');
  const acceptanceStep = text.indexOf('id: final_acceptance');

  assert.ok(snapshotStep >= 0 && dryRunStep > snapshotStep);
  assert.ok(artifactStep > dryRunStep);
  assert.ok(acceptanceStep > artifactStep);
  assert.match(text.slice(dryRunStep, artifactStep), /if: \$\{\{ always\(\) && steps\.setup_node\.outcome == 'success' \}\}/);
  assert.match(text.slice(artifactStep, acceptanceStep), /if: always\(\)/);
  assert.match(text, /testing-read-only-snapshot-comparison=\$SNAPSHOT_COMPARISON/);
  assert.match(text, /offline-importer-dry-run=\$IMPORTER_DRY_RUN/);
});
