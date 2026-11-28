import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runImageExceptionHttpAudit,
  verifyImageExceptionAudit
} from '../scripts/verifyCatalogueImageExceptionsStage4b1va5s1r9.mjs';

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
  assert.equal(result.status, 'VERIFIED_2_IMAGE_EXCEPTION_CANDIDATES');
  assert.equal(result.summary.historicalImageExceptions, 2);
  assert.equal(result.summary.verifiedLoaded, 2);
  assert.equal(result.summary.failedOrUnmatched, 0);
  assert.equal(result.summary.ambiguous, 0);
  assert.equal(result.summary.missing, 0);
  assert.equal(result.summary.redirected, 0);
  assert.equal(result.summary.outcomes.VERIFIED, 2);
  assert.equal(result.records[0].historicalOfficialImageUrl, null);
  assert.equal(result.records[0].bandaiUrlCandidate, fixture().provenanceReport.affectedRecords[0].constructedOfficialUrlCandidate);
  assert.equal(result.records[0].candidateHttpVerified, true);
  assert.equal('officialImageUrl' in result.records[0], false);
  assert.equal(result.historicalOfficialUrlsRewritten, 0);
});

test('records redirects separately while rejecting redirects away from the language-specific official host', () => {
  const input = fixture();
  input.auditReport.results[0].final_url = 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.webp';
  const sameHost = verifyImageExceptionAudit({ ...input, expectedCount: 2 });
  assert.equal(sameHost.records[0].outcome, 'REDIRECTED_LOADED');
  assert.equal(sameHost.records[0].loaded, true);
  assert.equal(sameHost.summary.redirected, 1);

  const offHost = fixture();
  offHost.auditReport.results[0].final_url = 'https://example.com/OP18-001.png';
  const blocked = verifyImageExceptionAudit({ ...offHost, expectedCount: 2 });
  assert.equal(blocked.records[0].outcome, 'REDIRECTED_FAILED');
  assert.equal(blocked.records[0].loaded, false);
  assert.ok(blocked.records[0].errors.some(error => error.includes('redirect target')));
});

test('runs fresh GET checks for each exception identity and returns their individual HTTP outcomes', async () => {
  const { provenanceReport } = fixture();
  const seen = [];
  const report = await runImageExceptionHttpAudit(provenanceReport, {
    expectedCount: 2,
    concurrency: 2,
    check: async item => {
      seen.push(item.url);
      return {
        ...item,
        status: 'LOADED',
        status_code: 200,
        content_type: 'image/png',
        final_url: item.url
      };
    }
  });
  assert.equal(seen.length, 2);
  assert.equal(new Set(seen).size, 2);
  assert.equal(report.status, 'VERIFIED_2_IMAGE_EXCEPTION_CANDIDATES');
  assert.equal(report.httpAudit.requestedRecordCount, 2);
  assert.deepEqual(report.httpAudit.statusCounts, {
    LOADED: 2, MISSING: 0, INVALID_URL: 0, TIMEOUT: 0, TEMPORARY_FAILURE: 0
  });
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
  assert.equal(duplicateResult.summary.ambiguous, 1);
  assert.equal(duplicateResult.summary.missing, 0);
  assert.equal(duplicateResult.summary.failed, 0);

  // Exercise the missing classification independently of a generic transport failure.
  const missing = fixture();
  missing.auditReport.results[0].status = 'MISSING';
  missing.auditReport.results[0].status_code = 404;
  const classifiedMissing = verifyImageExceptionAudit({ ...missing, expectedCount: 2 });
  assert.equal(classifiedMissing.records[0].outcome, 'MISSING');
  assert.equal(classifiedMissing.summary.missing, 1);
  assert.equal(classifiedMissing.summary.failed, 0);
});

test('rejects an input that claims the exception had a historical official URL', () => {
  const input = fixture();
  input.provenanceReport.affectedRecords[0].historicalOfficialImageUrl = input.provenanceReport.affectedRecords[0].constructedOfficialUrlCandidate;
  const result = verifyImageExceptionAudit({ ...input, expectedCount: 2 });
  assert.ok(result.records[0].errors.some(error => error.includes('unexpectedly contains a saved official URL')));
});
