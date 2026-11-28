#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkImageReference } from './auditOfficialBandaiImages.mjs';

const hostFor = language => language === 'en' ? 'en.onepiece-cardgame.com'
  : language === 'jp' ? 'www.onepiece-cardgame.com' : null;

export function verifyImageExceptionAudit({ provenanceReport, auditReport, expectedCount = 360 }) {
  const records = provenanceReport?.affectedRecords;
  const auditRows = auditReport?.results;
  const errors = [];
  if (!Array.isArray(records)) throw new Error('Image provenance report has no affectedRecords array');
  if (!Array.isArray(auditRows)) throw new Error('Official image audit has no results array');
  if (records.length !== expectedCount) errors.push(`Expected ${expectedCount} historical image exceptions, got ${records.length}`);

  const byUrl = new Map();
  for (const result of auditRows) {
    if (!byUrl.has(result.url)) byUrl.set(result.url, []);
    byUrl.get(result.url).push(result);
  }

  const reconciled = records.map(record => {
    const expectedHost = hostFor(record.language);
    let candidate;
    try { candidate = new URL(record.constructedOfficialUrlCandidate); }
    catch { candidate = null; }
    const candidates = byUrl.get(record.constructedOfficialUrlCandidate) || [];
    const result = candidates.length === 1 ? candidates[0] : null;
    const expectedLanguageName = record.language === 'en' ? 'English' : 'Japanese';
    const matchingAssociation = result?.associations?.some(association =>
      association.language === expectedLanguageName
      && association.image_id === record.imageId
      && association.set === record.releaseSet
    ) === true;
    const redirected = Boolean(result?.final_url && result.final_url !== record.constructedOfficialUrlCandidate);
    let finalUrl;
    try { finalUrl = result?.final_url ? new URL(result.final_url) : null; }
    catch { finalUrl = null; }
    const finalUrlIsOfficial = !redirected || (finalUrl?.protocol === 'https:' && finalUrl?.hostname === expectedHost);
    const loaded = result?.status === 'LOADED'
      && (result.status_code === 200 || result.status_code === 206)
      && /^image\//i.test(result.content_type || '')
      && candidate?.protocol === 'https:'
      && candidate?.hostname === expectedHost
      && finalUrlIsOfficial;
    const missing = result?.status === 'MISSING' || result?.status_code === 404 || result?.status_code === 410;
    const ambiguous = candidates.length !== 1 || (result !== null && !matchingAssociation);
    const failed = !loaded && !missing && !ambiguous;
    const outcome = ambiguous ? 'AMBIGUOUS'
      : missing ? 'MISSING'
        : redirected ? (loaded ? 'REDIRECTED_LOADED' : 'REDIRECTED_FAILED')
          : loaded ? 'VERIFIED' : 'FAILED';
    const error = [];
    if (!expectedHost || !candidate || candidate.hostname !== expectedHost || candidate.protocol !== 'https:') error.push('candidate URL host or scheme does not match language');
    if (candidates.length !== 1) error.push(`expected one HTTP audit row for candidate; found ${candidates.length}`);
    if (result && !matchingAssociation) error.push('HTTP result does not carry the matching language, image ID and set association');
    if (redirected && !finalUrlIsOfficial) error.push('redirect target is not an HTTPS URL on the same language-specific official host');
    if (!loaded) error.push(`image did not load as an image (status ${result?.status ?? 'not audited'})`);
    if (record.historicalOfficialImageUrl) error.push('historical exception record unexpectedly contains a saved official URL');

    return {
      language: record.language,
      releaseSet: record.releaseSet,
      cardNumber: record.cardNumber,
      printingKey: record.printingKey,
      imageId: record.imageId,
      historicalOfficialImageUrl: null,
      applicationImagePath: record.historicalApplicationImageUrl,
      bandaiUrlCandidate: record.constructedOfficialUrlCandidate,
      candidateHttpVerified: loaded,
      httpStatus: result?.status_code ?? null,
      httpClassification: result?.status ?? 'NOT_AUDITED',
      contentType: result?.content_type ?? null,
      finalUrl: result?.final_url ?? null,
      outcome,
      loaded,
      redirected,
      missing,
      failed,
      ambiguous,
      matchingSourceAssociation: matchingAssociation,
      errors: error
    };
  });

  const countsBySetLanguage = {};
  for (const record of reconciled) {
    const key = `${record.releaseSet}|${record.language}`;
    countsBySetLanguage[key] ??= { rows: 0, loaded: 0 };
    countsBySetLanguage[key].rows += 1;
    if (record.loaded) countsBySetLanguage[key].loaded += 1;
  }
  const errorsByRecord = reconciled.filter(record => record.errors.length);
  if (new Set(reconciled.map(record => record.bandaiUrlCandidate)).size !== expectedCount) {
    errors.push('Exception records do not have one unique official URL candidate each');
  }

  return {
    stage: '4B-1V-A5S-1R-9',
    status: errors.length || errorsByRecord.length ? 'BLOCKED_IMAGE_EXCEPTION_RECONCILIATION' : `VERIFIED_${expectedCount}_IMAGE_EXCEPTION_CANDIDATES`,
    historicalEvidenceStage: '4B-1P',
    historicalOfficialUrlsRewritten: 0,
    source: {
      imageAuditUniqueUrls: auditReport.unique_official_image_urls,
      imageAuditCommit: auditReport.commit,
      imageAuditBranch: auditReport.branch,
      imageAuditRetrievedAt: auditReport.retrieved_at
    },
    summary: {
      historicalImageExceptions: records.length,
      uniqueCandidates: new Set(reconciled.map(record => record.bandaiUrlCandidate)).size,
      verifiedLoaded: reconciled.filter(record => record.loaded).length,
      verifiedHttp200: reconciled.filter(record => record.loaded && record.httpStatus === 200).length,
      failed: reconciled.filter(record => record.failed).length,
      redirected: reconciled.filter(record => record.redirected).length,
      missing: reconciled.filter(record => record.missing).length,
      ambiguous: reconciled.filter(record => record.ambiguous).length,
      outcomes: Object.fromEntries(['VERIFIED', 'REDIRECTED_LOADED', 'REDIRECTED_FAILED', 'MISSING', 'FAILED', 'AMBIGUOUS']
        .map(outcome => [outcome, reconciled.filter(record => record.outcome === outcome).length])),
      failedOrUnmatched: errorsByRecord.length,
      countsBySetLanguage
    },
    errors,
    records: reconciled
  };
}

export async function runImageExceptionHttpAudit(provenanceReport, { expectedCount = 360, concurrency = 8, check = checkImageReference } = {}) {
  const records = provenanceReport?.affectedRecords;
  if (!Array.isArray(records)) throw new Error('Image provenance report has no affectedRecords array');
  const items = records.map(record => ({
    url: record.constructedOfficialUrlCandidate,
    associations: [{
      set: record.releaseSet,
      language: record.language === 'en' ? 'English' : record.language === 'jp' ? 'Japanese' : record.language,
      image_id: record.imageId
    }]
  }));
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await check(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, worker));
  const counts = Object.fromEntries(['LOADED', 'MISSING', 'INVALID_URL', 'TIMEOUT', 'TEMPORARY_FAILURE']
    .map(status => [status, results.filter(result => result?.status === status).length]));
  const auditReport = {
    retrieved_at: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || null,
    branch: process.env.GITHUB_REF_NAME || null,
    unique_official_image_urls: new Set(items.map(item => item.url)).size,
    summary: counts,
    results
  };
  const reconciliation = verifyImageExceptionAudit({ provenanceReport, auditReport, expectedCount });
  return {
    ...reconciliation,
    httpAudit: {
      requestedRecordCount: items.length,
      uniqueUrlCount: auditReport.unique_official_image_urls,
      retrievedAt: auditReport.retrieved_at,
      statusCounts: counts
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const get = name => {
      const index = args.indexOf(name);
      return index < 0 ? null : args[index + 1];
    };
    const provenancePath = get('--provenance');
    const auditPath = get('--image-audit');
    if (!provenancePath || (!auditPath && !args.includes('--run-http'))) throw new Error('--provenance and either --image-audit or --run-http are required');
    const provenanceReport = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    const report = args.includes('--run-http')
      ? await runImageExceptionHttpAudit(provenanceReport)
      : verifyImageExceptionAudit({ provenanceReport, auditReport: JSON.parse(fs.readFileSync(auditPath, 'utf8')) });
    const outputPath = get('--output');
    if (outputPath) {
      fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify({ status: report.status, summary: report.summary, errors: report.errors }, null, 2));
    if (report.status !== 'VERIFIED_360_IMAGE_EXCEPTION_CANDIDATES') process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
