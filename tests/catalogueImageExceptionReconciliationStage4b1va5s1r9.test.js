import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyImageExceptionAudit } from '../scripts/verifyCatalogueImageExceptionsStage4b1va5s1r9.mjs';

function fixture() {
  const provenanceReport = {
    affectedRecords: [
      {
        language: 'en', releaseSet: 'OP-18', cardNumber: 'OP18-001', printingKey: 'en|op18|1', imageId: 'OP18-001',
        historicalOfficialImageUrl: null, historicalApplicationImageUrl: '/_card-image/bandai/en/OP18-001.png',
        constructedOfficialUrlCandidate: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png'
      },
      {
        language: 'jp', releaseSet: 'EB-05', cardNumber: 'EB05-001', printingKey: 'jp|eb05|1', imageId: 'EB05-001',
        historicalOfficialImageUrl: null, historicalApplicationImageUrl: '/_card-image/bandai/jp/EB05-001.png',
        constructedOfficialUrlCandidate: 'https://www.onepiece-cardgame.com/images/cardlist/card/EB05-001.png'
      }
    ]
  };
  const auditReport = {
    unique_official_image_urls: 7798,
    commit: 'test-commit',
    branch: 'audit/test',
    retrieved_at: '2026-11-28T10:00:00Z',
    results: [
      {
        url: provenanceReport.affectedRecords[0].constructedOfficialUrlCandidate,
        associations: [{ language: 'English', set: 'OP-18', image_id: 'OP18-001' }],
        status: 'LOADED', status_code: 200, content_type: 'image/png', final_url: provenanceReport.affectedRecords[0].constructedOfficialUrlCandidate
      },
      {
        url: provenanceReport.affectedRecords[1].constructedOfficialUrlCandidate,
        associations: [{ language: 'Japanese', set: 'EB-05', image_id: 'EB05-001' }],
        status: 'LOADED', status_code: 200, content_type: 'image/png', final_url: provenanceReport.affectedRecords[1].constructedOfficialUrlCandidate
      }
    ]
  };
  return { provenanceReport, auditReport };
}

test('reconciles each missing historical URL to a language and set-matched successful image audit row', () => {
  const result = verifyImageExceptionAudit({ ...fixture(), expectedCount: 2 });
  assert.equal(result.status, 'VERIFIED_2_IMAGE_EXCEPTION_URLS');
  assert.equal(result.summary.historicalImageExceptions, 2);
  assert.equal(result.summary.verifiedLoaded, 2);
  assert.equal(result.summary.failedOrUnmatched, 0);
  assert.equal(result.historicalOfficialUrlsRewritten, 0);
});

test('rejects a proxy or cross-language candidate presented as the Bandai URL', () => {
  const input = fixture();
  input.provenanceReport.affectedRecords[0].constructedOfficialUrlCandidate = '/_card-image/bandai/en/OP18-001.png';
  const result = verifyImageExceptionAudit({ ...input, expectedCount: 2 });
  assert.equal(result.status, 'BLOCKED_IMAGE_EXCEPTION_RECONCILIATION');
  assert.ok(result.records[0].errors.some(error => error.includes('host or scheme')));
});

test('rejects an HTTP result with the wrong language or image identity association', () => {
  const input = fixture();
  input.auditReport.results[0].associations[0].language = 'Japanese';
  const result = verifyImageExceptionAudit({ ...input, expectedCount: 2 });
  assert.ok(result.records[0].errors.some(error => error.includes('matching language, image ID and set')));
});

test('rejects failed responses and duplicate audit rows', () => {
  const failed = fixture();
  failed.auditReport.results[0].status = 'MISSING';
  failed.auditReport.results[0].status_code = 404;
  const failedResult = verifyImageExceptionAudit({ ...failed, expectedCount: 2 });
  assert.ok(failedResult.records[0].errors.some(error => error.includes('did not load')));

  const duplicate = fixture();
  duplicate.auditReport.results.push({ ...duplicate.auditReport.results[0] });
  const duplicateResult = verifyImageExceptionAudit({ ...duplicate, expectedCount: 2 });
  assert.ok(duplicateResult.records[0].errors.some(error => error.includes('expected one HTTP audit row')));
});

test('rejects an input that claims the exception had a historical official URL', () => {
  const input = fixture();
  input.provenanceReport.affectedRecords[0].historicalOfficialImageUrl = input.provenanceReport.affectedRecords[0].constructedOfficialUrlCandidate;
  const result = verifyImageExceptionAudit({ ...input, expectedCount: 2 });
  assert.ok(result.records[0].errors.some(error => error.includes('unexpectedly contains a saved official URL')));
});
