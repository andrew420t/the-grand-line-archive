#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkImageReference } from './auditOfficialBandaiImages.mjs';

export const PREMIUM_IMAGE_COUNT = 231;

export function collectPremiumImageItems(historicalManifest, { expectedCount = PREMIUM_IMAGE_COUNT } = {}) {
  const cards = historicalManifest?.premiumCollections?.cards;
  if (!Array.isArray(cards)) throw new Error('Stage 4B-1P artifact is missing the complete Premium card identity list');
  if (cards.length !== expectedCount) throw new Error(`Expected ${expectedCount} Premium card identities, got ${cards.length}`);

  const items = cards.map(card => {
    const expectedLanguage = card.language === 'en' ? 'English' : card.language === 'jp' ? 'Japanese' : null;
    if (!expectedLanguage || !card.productKey || !card.printingKey || !card.imageId || !card.officialImageUrl) {
      throw new Error('Premium image identity is missing a language, product, printing, image ID or official URL');
    }
    if (card.exactIdentityMatch !== true) throw new Error(`Premium identity is not exactly reconciled: ${card.productKey}|${card.printingKey}`);
    return {
      url: card.officialImageUrl,
      associations: [{
        set: 'Premium Card Collection',
        language: expectedLanguage,
        image_id: card.imageId,
        product_key: card.productKey,
        printing_key: card.printingKey
      }]
    };
  });
  if (new Set(items.map(item => item.url)).size !== expectedCount) {
    throw new Error('Premium image URLs are not one-to-one with the language-scoped assignment identities');
  }
  return items;
}

export function reconcilePremiumImageAudit(historicalManifest, results, { expectedCount = PREMIUM_IMAGE_COUNT } = {}) {
  const cards = historicalManifest?.premiumCollections?.cards;
  if (!Array.isArray(cards)) throw new Error('Stage 4B-1P artifact is missing the complete Premium card identity list');
  const byUrl = new Map();
  for (const result of results || []) {
    if (!byUrl.has(result.url)) byUrl.set(result.url, []);
    byUrl.get(result.url).push(result);
  }
  const errors = [];
  if (cards.length !== expectedCount) errors.push(`Expected ${expectedCount} Premium identities, got ${cards.length}`);

  const rows = cards.map(card => {
    const languageName = card.language === 'en' ? 'English' : card.language === 'jp' ? 'Japanese' : null;
    const expectedHost = card.language === 'en' ? 'en.onepiece-cardgame.com' : card.language === 'jp' ? 'www.onepiece-cardgame.com' : null;
    const candidates = byUrl.get(card.officialImageUrl) || [];
    const result = candidates.length === 1 ? candidates[0] : null;
    const matchingAssociation = result?.associations?.some(association =>
      association.language === languageName
      && association.image_id === card.imageId
      && association.product_key === card.productKey
      && association.printing_key === card.printingKey
    ) === true;
    let requestedUrl;
    let finalUrl;
    try { requestedUrl = card.officialImageUrl ? new URL(card.officialImageUrl) : null; }
    catch { requestedUrl = null; }
    try { finalUrl = result?.final_url ? new URL(result.final_url) : null; }
    catch { finalUrl = null; }
    const redirected = Boolean(requestedUrl && finalUrl && finalUrl.href !== requestedUrl.href);
    const finalUrlIsOfficial = finalUrl?.protocol === 'https:' && finalUrl?.hostname === expectedHost;
    const loaded = result?.status === 'LOADED'
      && (result.status_code === 200 || result.status_code === 206)
      && /^image\//i.test(result.content_type || '')
      && requestedUrl?.protocol === 'https:'
      && requestedUrl?.hostname === expectedHost
      && finalUrlIsOfficial;
    const verified = loaded && !redirected && matchingAssociation;
    const missing = result?.status === 'MISSING' || result?.status_code === 404 || result?.status_code === 410;
    const ambiguous = candidates.length > 1 || (result !== null && !matchingAssociation);
    const failed = (!loaded && !missing && !ambiguous) || (redirected && !loaded);
    const outcome = ambiguous ? 'AMBIGUOUS'
      : redirected ? (loaded ? 'REDIRECTED_LOADED' : 'REDIRECTED_FAILED')
        : missing ? 'MISSING'
          : verified ? 'VERIFIED' : 'FAILED';
    const rowErrors = [];
    if (!languageName) rowErrors.push('invalid Premium language');
    if (candidates.length !== 1) rowErrors.push(`expected one HTTP audit result; found ${candidates.length}`);
    if (result && !matchingAssociation) rowErrors.push('HTTP result does not match the Premium product, language, printing and image identity');
    if (redirected) rowErrors.push('official URL redirected; final URL is reported separately and is not treated as an exact URL verification');
    if (redirected && !finalUrlIsOfficial) rowErrors.push('redirect target is not an HTTPS URL on the same language-specific official host');
    if (!loaded) rowErrors.push(`Premium image did not load (status ${result?.status ?? 'not audited'})`);
    if (card.exactIdentityMatch !== true) rowErrors.push('source artifact does not mark this runtime identity exact');
    return {
      language: card.language,
      productKey: card.productKey,
      productName: card.productName,
      printingKey: card.printingKey,
      cardNumber: card.cardNumber,
      imageId: card.imageId,
      officialImageUrl: card.officialImageUrl,
      httpClassification: result?.status ?? 'NOT_AUDITED',
      httpStatus: result?.status_code ?? null,
      contentType: result?.content_type ?? null,
      finalUrl: result?.final_url ?? null,
      outcome,
      loaded,
      verified,
      redirected,
      missing,
      failed,
      ambiguous,
      errors: rowErrors
    };
  });

  const byLanguage = {};
  const byProduct = {};
  for (const row of rows) {
    byLanguage[row.language] ??= { assignments: 0, loaded: 0, verified: 0 };
    byLanguage[row.language].assignments += 1;
    if (row.loaded) byLanguage[row.language].loaded += 1;
    if (row.verified) byLanguage[row.language].verified += 1;
    byProduct[row.productKey] ??= { productName: row.productName, assignments: 0, loaded: 0, verified: 0 };
    byProduct[row.productKey].assignments += 1;
    if (row.loaded) byProduct[row.productKey].loaded += 1;
    if (row.verified) byProduct[row.productKey].verified += 1;
  }
  const failedRows = rows.filter(row => row.errors.length);
  if (new Set(rows.map(row => row.officialImageUrl)).size !== expectedCount) errors.push('Premium official image URLs are not unique');
  const uniqueLoaded = rows.filter(row => row.loaded).length;
  return {
    stage: '4B-1V-A5S-1R-9',
    status: errors.length || failedRows.length ? 'BLOCKED_PREMIUM_IMAGE_RECONCILIATION' : `VERIFIED_${expectedCount}_PREMIUM_IMAGES`,
    historicalEvidenceStage: '4B-1P',
    historicalImageHttpResult: historicalManifest.premiumCollections?.imageHttp?.summary ?? null,
    summary: {
      assignmentRows: cards.length,
      uniqueOfficialUrls: new Set(rows.map(row => row.officialImageUrl)).size,
      loaded: uniqueLoaded,
      verified: rows.filter(row => row.verified).length,
      unverified: rows.filter(row => !row.verified).length,
      failedOrUnmatched: failedRows.length,
      failed: rows.filter(row => row.failed).length,
      redirected: rows.filter(row => row.redirected).length,
      missing: rows.filter(row => row.missing).length,
      ambiguous: rows.filter(row => row.ambiguous).length,
      outcomes: Object.fromEntries(['VERIFIED', 'REDIRECTED_LOADED', 'REDIRECTED_FAILED', 'MISSING', 'FAILED', 'AMBIGUOUS']
        .map(outcome => [outcome, rows.filter(row => row.outcome === outcome).length])),
      byLanguage,
      byProduct
    },
    errors,
    results: rows
  };
}

export async function runPremiumImageAudit(historicalManifest, { concurrency = 8 } = {}) {
  const items = collectPremiumImageItems(historicalManifest);
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await checkImageReference(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return reconcilePremiumImageAudit(historicalManifest, results);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const get = name => {
      const index = args.indexOf(name);
      return index < 0 ? null : args[index + 1];
    };
    const historicalPath = get('--historical-1p');
    const outputPath = get('--output');
    if (!historicalPath) throw new Error('--historical-1p is required');
    const historicalManifest = JSON.parse(fs.readFileSync(historicalPath, 'utf8'));
    const report = await runPremiumImageAudit(historicalManifest);
    if (outputPath) {
      fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify({ status: report.status, summary: report.summary, errors: report.errors }, null, 2));
    if (report.status !== `VERIFIED_${PREMIUM_IMAGE_COUNT}_PREMIUM_IMAGES`) process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
