import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  EXPECTED,
  HISTORICAL_1P_COMMIT,
  buildReports,
  validateHistoricalManifest
} from '../scripts/reconcileCatalogueEvidenceStage4b1vA5s1r2.mjs';

const sets = Object.keys(EXPECTED.assignmentsBySet);
const sourceSetCodes = sets.filter(code => !['OP-18', 'EB-05'].includes(code));

function distribute(total, count) {
  return Array.from({ length: count }, (_, index) => Math.floor(total / count) + (index < total % count ? 1 : 0));
}

function buildFixture({ mutateManifest, mutateSource } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-evidence-r9-'));
  const data = path.join(root, 'data');
  fs.mkdirSync(path.join(data, 'products'), { recursive: true });
  fs.mkdirSync(path.join(data, 'printing_products'), { recursive: true });
  const sourceProducts = { en: [], jp: [] };
  const productSetEdges = [];
  const productFor = new Map();

  for (const language of ['en', 'jp']) {
    for (const code of sourceSetCodes) {
      if (language === 'en' && ['OP-14', 'OP-15', 'EB-04'].includes(code)) continue;
      const product = `${language}:feed:${code}`;
      const productCode = code.replace('-', '');
      sourceProducts[language].push({ key: product, site: language, code: productCode, name: `${code} ${language}` });
      productSetEdges.push({ product_key: product, set_key: code });
      productFor.set(`${language}|${code}`, product);
    }
  }

  for (const [product, linkedSets, code] of [
    ['en:569114', ['OP-14', 'EB-04'], 'OP14-EB04'],
    ['en:569115', ['OP-15', 'EB-04'], 'OP15-EB04']
  ]) {
    sourceProducts.en.push({ key: product, site: 'en', code, name: code });
    for (const linkedSet of linkedSets) productSetEdges.push({ product_key: product, set_key: linkedSet });
  }

  for (const [index, code] of ['OP-01', 'OP-02'].entries()) {
    const product = `en:extra:${index}`;
    sourceProducts.en.push({ key: product, site: 'en', code: `EXTRA-${index}`, name: `Extra ${index}` });
    productSetEdges.push({ product_key: product, set_key: code });
  }

  const assignments = [];
  const printingLinks = { en: [], jp: [] };
  const missingImageIds = new Set();
  const cardNumberIndex = { en: 0, jp: 0 };
  for (const code of sets) {
    for (const [language, count] of [['en', EXPECTED.assignmentsBySet[code][0]], ['jp', EXPECTED.assignmentsBySet[code][1]]]) {
      for (let index = 0; index < count; index += 1) {
        const local = ['OP-18', 'EB-05'].includes(code);
        const imageId = `${code.replace('-', '')}-${language}-${String(index).padStart(3, '0')}`;
        const cardNumber = `CARD-${language}-${cardNumberIndex[language]++ % (language === 'en' ? 2562 : 2561)}`;
        let productKey = null;
        if (!local) {
          if (language === 'en' && code === 'OP-14') productKey = 'en:569114';
          else if (language === 'en' && code === 'OP-15') productKey = 'en:569115';
          else if (language === 'en' && code === 'EB-04' && index < 40) productKey = 'en:569114';
          else if (language === 'en' && code === 'EB-04') productKey = 'en:569115';
          else productKey = productFor.get(`${language}|${code}`);
          const printingKey = `${productKey}:printing:${imageId}`;
          printingLinks[language].push({ product_key: productKey, printing_key: printingKey });
          assignments.push({ language, printingKey, productKey, releaseSet: code, cardNumber, imageId, officialImageUrl: `https://${language === 'en' ? 'en' : 'www'}.onepiece-cardgame.com/images/cardlist/card/${imageId}.png`, exactReferenceImageUrl: `https://${language === 'en' ? 'en' : 'www'}.onepiece-cardgame.com/images/cardlist/card/${imageId}.png`, applicationImageUrl: `/_card-image/bandai/${language}/${imageId}.png`, source: 'pinned feed fixture' });
          continue;
        }

        const exceptionLimit = code === 'OP-18' ? 119 : 61;
        const hasException = index < exceptionLimit;
        const printingKey = `${code}:${language}:${imageId}`;
        const applicationPath = `/_card-image/bandai/${language}/${imageId}.png`;
        if (hasException) missingImageIds.add(printingKey);
        assignments.push({
          language,
          printingKey,
          productKey: null,
          releaseSet: code,
          cardNumber,
          imageId,
          officialImageUrl: hasException ? null : `https://${language === 'en' ? 'en' : 'www'}.onepiece-cardgame.com/images/cardlist/card/${imageId}.png`,
          exactReferenceImageUrl: hasException ? applicationPath : `https://${language === 'en' ? 'en' : 'www'}.onepiece-cardgame.com/images/cardlist/card/${imageId}.png`,
          applicationImageUrl: applicationPath,
          source: 'official local supplement fixture'
        });
      }
    }
  }

  const premiumProductList = (language, productCount, linkCount) => {
    const distribution = distribute(linkCount, productCount);
    return distribution.map((count, productIndex) => ({
      productKey: `${language}:premium:${productIndex}`,
      productName: `Premium ${language} ${productIndex}`,
      cards: Array.from({ length: count }, (_, cardIndex) => ({
        printingKey: `premium-${language}-${productIndex}-${cardIndex}`,
        cardNumber: `P-${productIndex}-${cardIndex}`,
        imageId: `P-${productIndex}-${cardIndex}`
      }))
    }));
  };
  const englishPremium = premiumProductList('en', 9, 103);
  const japanesePremium = premiumProductList('jp', 15, 128);
  const premiumCards = [
    ...englishPremium.flatMap(product => product.cards.map(card => ({
      language: 'en', productKey: product.productKey, productName: product.productName,
      ...card, officialImageUrl: `https://en.onepiece-cardgame.com/images/cardlist/card/${card.imageId}.png`, exactIdentityMatch: true
    }))),
    ...japanesePremium.flatMap(product => product.cards.map(card => ({
      language: 'jp', productKey: product.productKey, productName: product.productName,
      ...card, officialImageUrl: `https://www.onepiece-cardgame.com/images/cardlist/card/${card.imageId}.png`, exactIdentityMatch: true
    })))
  ];
  const historicalManifest = {
    stage: '4B-1P',
    checkedAt: '2026-11-27T19:04:23.118Z',
    verifiedCommit: HISTORICAL_1P_COMMIT,
    importPlan: { expectedSetPrintingRecords: EXPECTED.officialAssignments, referencePrintingRecords: assignments },
    premiumCollections: {
      english: { namedProductCount: 9, productPrintingLinks: 103, products: englishPremium },
      japanese: {
        namedProductCount: 15,
        productPrintingLinks: 128,
        allNamedJapaneseProducts: japanesePremium,
        BANDAI_CARD_GAMES_Fest_23_24: { status: 'NO_JAPANESE_PRODUCT_LISTED', feedProductFound: false }
      },
      totals: { allProductPrintingLinks: 231 },
      cards: premiumCards,
      imageHttp: {
        summary: { uniqueUrlsChecked: 231, loaded: 231, failed: 0, statusCodeCounts: { '200': 231 }, contentTypeCounts: { 'image/png': 231 } },
        results: premiumCards.map(card => ({ url: card.officialImageUrl, status: 200, contentType: 'image/png', loaded: true }))
      }
    }
  };
  mutateManifest?.(historicalManifest);

  const writeLines = (file, rows) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
  };
  writeLines(path.join(data, 'product_sets.jsonl'), productSetEdges);
  writeLines(path.join(data, 'products', 'en.jsonl'), sourceProducts.en);
  writeLines(path.join(data, 'products', 'jp.jsonl'), sourceProducts.jp);
  writeLines(path.join(data, 'printing_products', 'en.jsonl'), printingLinks.en);
  writeLines(path.join(data, 'printing_products', 'jp.jsonl'), printingLinks.jp);
  mutateSource?.({ data, printingLinks, assignments });
  return { root, data, historicalManifest, assignments, printingLinks, missingImageIds };
}

test('validates all 7,786 official assignments across the 25-set bilingual matrix', () => {
  const fixture = buildFixture();
  const result = validateHistoricalManifest(fixture.historicalManifest);
  assert.equal(result.assignmentCounts.total, 7786);
  assert.equal(result.assignmentCounts.languageScopedBaseCardNumbers, 5123);
  assert.equal(result.assignmentCounts.byLanguage.en, 3898);
  assert.equal(result.assignmentCounts.byLanguage.jp, 3888);
  assert.equal(result.assignmentCounts.feedBacked, 7276);
  assert.equal(result.assignmentCounts.localSupplement, 510);
  assert.equal(Object.keys(result.assignmentCounts.bySet).length, 25);
  assert.equal(result.premiumSummary.totalProducts, 24);
  assert.equal(result.premiumSummary.totalAssignments, 231);
  assert.equal(result.premiumSummary.japaneseBcgFestProductSynthesized, false);
});

test('reconciles all source edges and classifies the 395 combined-product join expansions', () => {
  const fixture = buildFixture();
  const reports = buildReports({ sourceDir: fixture.root, historicalManifest: fixture.historicalManifest });
  assert.equal(reports.assignment.status, 'RECONCILED_7786_OFFICIAL_ASSIGNMENTS_AND_231_PREMIUM_ASSIGNMENTS');
  assert.equal(reports.assignment.feedEdgeComparison.pinnedSourceProductPrintingEdges, 7276);
  assert.equal(reports.assignment.feedEdgeComparison.missingFromManifestCount, 0);
  assert.equal(reports.assignment.feedEdgeComparison.missingFromSourceCount, 0);
  assert.equal(reports.relationship.status, 'RECONCILED_395_COMBINED_PRODUCT_JOIN_EXPANSIONS');
  assert.equal(reports.relationship.counts.englishJapaneseProductSetEdges, 49);
  assert.equal(reports.relationship.counts.naiveDerivedSetPrintingEdges, 7671);
  assert.equal(reports.relationship.counts.naiveJoinExpansion, 395);
  assert.deepEqual(reports.relationship.expansionGroups.map(group => group.extraNaiveSetEdges).sort((a, b) => a - b), [196, 199]);
});

test('classifies all 360 image URL exceptions without promoting app proxy paths to official URLs', () => {
  const fixture = buildFixture();
  const reports = buildReports({ sourceDir: fixture.root, historicalManifest: fixture.historicalManifest });
  assert.equal(reports.provenance.status, '360_LOCAL_SUPPLEMENT_IMAGE_EXCEPTIONS_CLASSIFIED');
  assert.equal(reports.provenance.counts.missingHistoricalOfficialImageUrl, 360);
  assert.equal(reports.provenance.counts.uniqueOfficialUrlCandidates, 360);
  assert.deepEqual(reports.provenance.counts.bySetAndLanguage, {
    'OP-18|en': 119, 'OP-18|jp': 119, 'EB-05|en': 61, 'EB-05|jp': 61
  });
  assert.equal(reports.provenance.affectedRecords.every(record => record.historicalOfficialImageUrl === null), true);
  assert.equal(reports.provenance.affectedRecords.every(record => record.constructedOfficialUrlCandidate.startsWith(`https://${record.language === 'en' ? 'en' : 'www'}.onepiece-cardgame.com/`)), true);
  assert.equal(reports.provenance.validationErrors.length, 0);
});

test('rejects a missing historical assignment row even if the source feed remains intact', () => {
  const fixture = buildFixture({ mutateManifest: manifest => manifest.importPlan.referencePrintingRecords.pop() });
  assert.throws(() => validateHistoricalManifest(fixture.historicalManifest), /Expected 7786 official release assignments/);
});

test('rejects a duplicate language-scoped printing identity', () => {
  const fixture = buildFixture({ mutateManifest: manifest => {
    manifest.importPlan.referencePrintingRecords[1].printingKey = manifest.importPlan.referencePrintingRecords[0].printingKey;
  } });
  assert.throws(() => validateHistoricalManifest(fixture.historicalManifest), /duplicate language-scoped printing keys/);
});

test('rejects a wrong official count in one of the 50 set/language cells', () => {
  const fixture = buildFixture({ mutateManifest: manifest => {
    manifest.importPlan.referencePrintingRecords[0].releaseSet = 'OP-02';
  } });
  assert.throws(() => validateHistoricalManifest(fixture.historicalManifest), /assignment count mismatch for OP-01|assignment count mismatch for OP-02/);
});

test('rejects missing Premium assignments and Japanese product fabrication', () => {
  const missingLink = buildFixture({ mutateManifest: manifest => {
    manifest.premiumCollections.english.products[0].cards.pop();
  } });
  assert.throws(() => validateHistoricalManifest(missingLink.historicalManifest), /Premium product assignment count mismatch/);

  const fabricatedJapaneseProduct = buildFixture({ mutateManifest: manifest => {
    manifest.premiumCollections.japanese.namedProductCount += 1;
  } });
  assert.throws(() => validateHistoricalManifest(fabricatedJapaneseProduct.historicalManifest), /24 named products and 231 distinct assignments/);
});

test('does not pass image exceptions that lose their language-scoped proxy or image ID', () => {
  const fixture = buildFixture({ mutateManifest: manifest => {
    const firstException = manifest.importPlan.referencePrintingRecords.find(record => !record.officialImageUrl);
    firstException.imageId = null;
  } });
  const reports = buildReports({ sourceDir: fixture.root, historicalManifest: fixture.historicalManifest });
  assert.equal(reports.provenance.status, 'IMAGE_EXCEPTIONS_NEED_REVIEW');
  assert.ok(reports.provenance.validationErrors.length > 0);
});

test('detects pinned source product-printing edges missing from the assignment manifest', () => {
  const fixture = buildFixture({ mutateManifest: manifest => {
    const record = manifest.importPlan.referencePrintingRecords.find(row => row.productKey);
    record.productKey = 'en:unknown-product';
  } });
  const reports = buildReports({ sourceDir: fixture.root, historicalManifest: fixture.historicalManifest });
  assert.equal(reports.assignment.feedEdgeComparison.missingFromManifestCount, 1);
  assert.equal(reports.assignment.validationErrors.length > 0, true);
});

test('rejects a source artifact from any commit other than the pinned feed', () => {
  const fixture = buildFixture();
  assert.throws(() => buildReports({ sourceDir: fixture.root, historicalManifest: fixture.historicalManifest, sourceCommit: 'main' }), /Pinned source commit mismatch/);
});

test('reports the original 1Q artifact as unrecovered without mislabelling the 1P artifact', () => {
  const fixture = buildFixture();
  const reports = buildReports({ sourceDir: fixture.root, historicalManifest: fixture.historicalManifest });
  assert.equal(reports.oneQ.status, 'ORIGINAL_1Q_ARTIFACT_NOT_RECOVERED_IN_INVESTIGATED_RUNS');
  assert.equal(reports.assignment.historicalEvidence.stage, '4B-1P');
  assert.equal(reports.oneQ.investigatedRuns.length, 4);
});
