#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PINNED_SOURCE_COMMIT = '619965ec198047de519dc6eb098c7a56aed9bd58';
export const HISTORICAL_1P_COMMIT = 'd0c478adf17767d0fa441c4483ac42a18a4b089a';
export const EXPECTED = Object.freeze({
  releaseSets: 25,
  languageSetRows: 50,
  officialAssignments: 7786,
  languageScopedBaseCardNumbers: 5123,
  englishAssignments: 3898,
  japaneseAssignments: 3888,
  feedAssignments: 7276,
  localSupplementAssignments: 510,
  premiumProducts: 24,
  premiumAssignments: 231,
  relationshipExpansion: 395,
  imageExceptions: 360,
  assignmentsBySet: Object.freeze({
    'OP-01': [154, 154], 'OP-02': [154, 154], 'OP-03': [154, 154], 'OP-04': [149, 149],
    'OP-05': [154, 154], 'OP-06': [151, 150], 'OP-07': [151, 150], 'OP-08': [151, 150],
    'OP-09': [159, 158], 'OP-10': [151, 150], 'OP-11': [156, 155], 'OP-12': [155, 154],
    'OP-13': [175, 174], 'OP-14': [159, 156], 'OP-15': [155, 152], 'OP-16': [155, 155],
    'OP-17': [169, 169], 'OP-18': [159, 159], 'EB-01': [80, 80], 'EB-02': [105, 105],
    'EB-03': [90, 90], 'EB-04': [81, 85], 'EB-05': [96, 96], 'PRB-01': [319, 319], 'PRB-02': [316, 316]
  }),
  imageExceptionsBySetLanguage: Object.freeze({ 'OP-18|en': 119, 'OP-18|jp': 119, 'EB-05|en': 61, 'EB-05|jp': 61 })
});

const TARGET_SET = /^(?:OP-(?:0[1-9]|1[0-8])|EB-0[1-5]|PRB-0[12])$/;
const TARGET_SETS = Object.freeze([
  ...Array.from({ length: 18 }, (_, i) => `OP-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, i) => `EB-${String(i + 1).padStart(2, '0')}`),
  'PRB-01', 'PRB-02'
]);

const readLines = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, i) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error(`${file}:${i + 1}: ${error.message}`); }
});
const sorted = values => [...values].sort();
const productPrintingKey = (language, productKey, printingKey) => `${language}|${productKey}|${printingKey}`;
const printingKey = (language, key) => `${language}|${key}`;
const imageHost = language => language === 'jp' ? 'www.onepiece-cardgame.com' : 'en.onepiece-cardgame.com';
const directImageUrl = (language, id) => `https://${imageHost(language)}/images/cardlist/card/${encodeURIComponent(id)}.png`;

function premiumAssignmentRows(premiumCollections) {
  const englishProducts = premiumCollections?.english?.products;
  const japaneseProducts = premiumCollections?.japanese?.allNamedJapaneseProducts;
  const cards = premiumCollections?.cards;
  if (!Array.isArray(englishProducts) || !Array.isArray(japaneseProducts) || !Array.isArray(cards)) {
    throw new Error('Historical 1P artifact is missing the English or Japanese Premium product inventory');
  }
  const productKeys = new Map([
    ...englishProducts.map(product => [product.productKey, { language: 'en', product }]),
    ...japaneseProducts.map(product => [product.productKey, { language: 'jp', product }])
  ]);
  return cards.map(card => ({
    language: card.language,
    productKey: card.productKey,
    printingKey: card.printingKey,
    productName: card.productName,
    cardNumber: card.cardNumber,
    imageId: card.imageId,
    officialImageUrl: card.officialImageUrl,
    exactIdentityMatch: card.exactIdentityMatch,
    productMetadata: productKeys.get(card.productKey) ?? null
  }));
}

function summarizeSetAssignments(records) {
  const bySet = Object.fromEntries(TARGET_SETS.map(code => [code, { en: 0, jp: 0, total: 0 }]));
  const byLanguage = { en: 0, jp: 0 };
  let feedBacked = 0;
  let localSupplement = 0;
  const seen = new Set();
  const duplicates = [];
  const invalid = [];

  for (const record of records) {
    if (!['en', 'jp'].includes(record.language) || !record.printingKey || !record.cardNumber || !TARGET_SET.test(record.releaseSet || '')) {
      invalid.push({ language: record.language ?? null, releaseSet: record.releaseSet ?? null, printingKey: record.printingKey ?? null });
      continue;
    }
    const key = printingKey(record.language, record.printingKey);
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
    byLanguage[record.language] += 1;
    bySet[record.releaseSet][record.language] += 1;
    bySet[record.releaseSet].total += 1;
    if (record.productKey) feedBacked += 1;
    else localSupplement += 1;
  }

  return {
    total: records.length,
    byLanguage,
    bySet,
    feedBacked,
    localSupplement,
    distinctLanguagePrintingKeys: seen.size,
    duplicateLanguagePrintingKeys: sorted(new Set(duplicates)),
    invalidRecords: invalid
  };
}

function validateHistoricalManifest(historicalManifest) {
  if (historicalManifest?.stage !== '4B-1P') throw new Error('Expected the retained Stage 4B-1P evidence artifact');
  if (historicalManifest.verifiedCommit !== HISTORICAL_1P_COMMIT) throw new Error('Historical Stage 4B-1P commit does not match the retained evidence');
  const rows = historicalManifest.importPlan?.referencePrintingRecords;
  if (!Array.isArray(rows)) throw new Error('Historical 1P artifact does not contain referencePrintingRecords');
  if (historicalManifest.importPlan.expectedSetPrintingRecords !== EXPECTED.officialAssignments || rows.length !== EXPECTED.officialAssignments) {
    throw new Error(`Expected ${EXPECTED.officialAssignments} official release assignments; found ${rows.length}`);
  }

  const assignmentCounts = summarizeSetAssignments(rows);
  assignmentCounts.languageScopedBaseCardNumbers = new Set(rows.map(record => `${record.language}|${record.cardNumber}`)).size;
  if (assignmentCounts.invalidRecords.length) throw new Error(`Historical assignment manifest contains ${assignmentCounts.invalidRecords.length} invalid records`);
  if (assignmentCounts.duplicateLanguagePrintingKeys.length) throw new Error(`Historical assignment manifest contains ${assignmentCounts.duplicateLanguagePrintingKeys.length} duplicate language-scoped printing keys`);
  if (assignmentCounts.languageScopedBaseCardNumbers !== EXPECTED.languageScopedBaseCardNumbers) {
    throw new Error(`Expected ${EXPECTED.languageScopedBaseCardNumbers} language-scoped base card numbers, got ${assignmentCounts.languageScopedBaseCardNumbers}`);
  }
  if (assignmentCounts.byLanguage.en !== EXPECTED.englishAssignments || assignmentCounts.byLanguage.jp !== EXPECTED.japaneseAssignments) {
    throw new Error(`Expected ${EXPECTED.englishAssignments} English and ${EXPECTED.japaneseAssignments} Japanese assignments`);
  }
  for (const setCode of TARGET_SETS) {
    const [expectedEn, expectedJp] = EXPECTED.assignmentsBySet[setCode];
    const actual = assignmentCounts.bySet[setCode];
    if (actual.en !== expectedEn || actual.jp !== expectedJp) {
      throw new Error(`Official assignment count mismatch for ${setCode}: expected ${expectedEn}/${expectedJp}, got ${actual.en}/${actual.jp}`);
    }
  }
  if (assignmentCounts.feedBacked !== EXPECTED.feedAssignments || assignmentCounts.localSupplement !== EXPECTED.localSupplementAssignments) {
    throw new Error(`Expected ${EXPECTED.feedAssignments} feed-backed and ${EXPECTED.localSupplementAssignments} local supplement assignments`);
  }

  const premiumRows = premiumAssignmentRows(historicalManifest.premiumCollections);
  const premiumKeySet = new Set(premiumRows.map(row => printingKey(row.language, row.printingKey)));
  const premiumProducts = historicalManifest.premiumCollections.english.namedProductCount
    + historicalManifest.premiumCollections.japanese.namedProductCount;
  const premiumDuplicates = premiumRows.length - premiumKeySet.size;
  if (premiumProducts !== EXPECTED.premiumProducts || premiumRows.length !== EXPECTED.premiumAssignments
    || premiumRows.length !== historicalManifest.premiumCollections.totals.allProductPrintingLinks || premiumDuplicates !== 0) {
    throw new Error('Premium assignment manifest does not reconcile to 24 named products and 231 distinct assignments');
  }
  if (premiumRows.some(row => !['en', 'jp'].includes(row.language) || !row.productMetadata
    || row.productMetadata.language !== row.language || !row.officialImageUrl || row.exactIdentityMatch !== true)) {
    throw new Error('Premium assignments contain a missing product, language, official image URL or exact runtime identity match');
  }
  const premiumByProduct = new Map();
  for (const row of premiumRows) premiumByProduct.set(row.productKey, (premiumByProduct.get(row.productKey) || 0) + 1);
  for (const group of [historicalManifest.premiumCollections.english.products, historicalManifest.premiumCollections.japanese.allNamedJapaneseProducts]) {
    for (const product of group) {
      const expectedLinks = product.feedLinkedPrintingCount ?? product.cards?.length;
      if (premiumByProduct.get(product.productKey) !== expectedLinks) {
        throw new Error(`Premium product assignment count mismatch for ${product.productKey}`);
      }
    }
  }
  const premiumImageHttp = historicalManifest.premiumCollections.imageHttp;
  const premiumHttpRows = premiumImageHttp?.results;
  const premiumHttpUrls = new Map((premiumHttpRows || []).map(row => [row.url, row]));
  if (premiumImageHttp?.summary?.uniqueUrlsChecked !== EXPECTED.premiumAssignments
    || premiumImageHttp.summary.loaded !== EXPECTED.premiumAssignments
    || premiumImageHttp.summary.failed !== 0
    || premiumImageHttp.summary.statusCodeCounts?.['200'] !== EXPECTED.premiumAssignments
    || premiumHttpRows?.length !== EXPECTED.premiumAssignments
    || premiumRows.some(row => {
      const result = premiumHttpUrls.get(row.officialImageUrl);
      return !result || result.status !== 200 || result.loaded !== true || result.contentType !== 'image/png';
    })) {
    throw new Error('Historical Premium image audit does not prove 231/231 HTTP 200 image/png results');
  }
  const japaneseFestEvidence = historicalManifest.premiumCollections.japanese.BANDAI_CARD_GAMES_Fest_23_24;
  const japaneseFestWasNotInvented = japaneseFestEvidence?.feedProductFound === false
    && japaneseFestEvidence?.status === 'NO_JAPANESE_PRODUCT_LISTED'
    && !historicalManifest.premiumCollections.japanese.allNamedJapaneseProducts.some(product => /BANDAI CARD GAMES Fest\. 23-24/i.test(product.productName || ''));
  if (!japaneseFestWasNotInvented) throw new Error('Japanese BANDAI CARD GAMES Fest. 23-24 counterpart evidence is missing or was synthesized');
  const setPrintingKeys = new Set(rows.map(row => printingKey(row.language, row.printingKey)));
  const premiumSetOverlap = premiumRows.filter(row => setPrintingKeys.has(printingKey(row.language, row.printingKey))).length;
  if (premiumSetOverlap !== 0) throw new Error('Premium assignments overlap the official set-printing identity manifest');

  return {
    rows,
    assignmentCounts,
    premiumRows,
    premiumSummary: {
      englishProducts: historicalManifest.premiumCollections.english.namedProductCount,
      englishAssignments: historicalManifest.premiumCollections.english.productPrintingLinks,
      japaneseProducts: historicalManifest.premiumCollections.japanese.namedProductCount,
      japaneseAssignments: historicalManifest.premiumCollections.japanese.productPrintingLinks,
      totalProducts: premiumProducts,
      totalAssignments: premiumRows.length,
      distinctLanguagePrintingKeys: premiumKeySet.size,
      overlapWithSetPrintingKeys: premiumSetOverlap,
      historicalHttpLoaded: premiumImageHttp.summary.loaded,
      historicalHttpStatusCounts: premiumImageHttp.summary.statusCodeCounts,
      historicalHttpContentTypes: premiumImageHttp.summary.contentTypeCounts,
      japaneseBcgFestProductSynthesized: false
    }
  };
}

function buildReports({ sourceDir, historicalManifest, sourceCommit = PINNED_SOURCE_COMMIT }) {
  if (sourceCommit !== PINNED_SOURCE_COMMIT) throw new Error(`Pinned source commit mismatch: ${sourceCommit}`);
  if (!sourceDir || !fs.existsSync(sourceDir)) throw new Error(`Pinned source directory missing: ${sourceDir}`);
  const { rows, assignmentCounts, premiumRows, premiumSummary } = validateHistoricalManifest(historicalManifest);

  const productSets = readLines(path.join(sourceDir, 'data/product_sets.jsonl'));
  const products = [
    ...readLines(path.join(sourceDir, 'data/products/en.jsonl')),
    ...readLines(path.join(sourceDir, 'data/products/jp.jsonl'))
  ];
  const productLanguage = new Map(products.map(product => [product.key, product.site]));
  const wantedProductSets = productSets.filter(edge => TARGET_SET.test(edge.set_key) && productLanguage.has(edge.product_key));
  const setsByProduct = new Map();
  for (const edge of wantedProductSets) {
    if (!setsByProduct.has(edge.product_key)) setsByProduct.set(edge.product_key, []);
    setsByProduct.get(edge.product_key).push(edge.set_key);
  }
  const printingProducts = [
    ...readLines(path.join(sourceDir, 'data/printing_products/en.jsonl')),
    ...readLines(path.join(sourceDir, 'data/printing_products/jp.jsonl'))
  ].filter(edge => setsByProduct.has(edge.product_key));

  const rawSourcePairs = printingProducts.map(edge => productPrintingKey(productLanguage.get(edge.product_key), edge.product_key, edge.printing_key));
  const sourcePairs = new Set(rawSourcePairs);
  const duplicateSourcePairs = rawSourcePairs.filter((key, index) => rawSourcePairs.indexOf(key) !== index);
  const manifestFeedRows = rows.filter(record => record.productKey);
  const manifestPairs = new Set(manifestFeedRows.map(record => productPrintingKey(record.language, record.productKey, record.printingKey)));
  const missingFromManifest = sorted([...sourcePairs].filter(key => !manifestPairs.has(key)));
  const missingFromSource = sorted([...manifestPairs].filter(key => !sourcePairs.has(key)));

  const assignedByPair = new Map(manifestFeedRows.map(record => [
    productPrintingKey(record.language, record.productKey, record.printingKey), record
  ]));
  const naiveEdges = [];
  const duplicateDerivedEdges = [];
  for (const edge of printingProducts) {
    const language = productLanguage.get(edge.product_key);
    const key = productPrintingKey(language, edge.product_key, edge.printing_key);
    const assigned = assignedByPair.get(key);
    for (const setCode of setsByProduct.get(edge.product_key) || []) {
      const derived = { language, productKey: edge.product_key, printingKey: edge.printing_key, derivedSet: setCode };
      naiveEdges.push(derived);
      if (assigned && assigned.releaseSet !== setCode) {
        duplicateDerivedEdges.push({ ...derived, manifestReleaseSet: assigned.releaseSet });
      }
    }
  }

  const productPrintingCounts = new Map();
  for (const edge of printingProducts) productPrintingCounts.set(edge.product_key, (productPrintingCounts.get(edge.product_key) || 0) + 1);
  const namedFeedProducts = [...setsByProduct].map(([key, linkedSets]) => {
    const product = products.find(item => item.key === key);
    return {
      productKey: key,
      language: product.site,
      productCode: product.code,
      productName: product.name,
      releaseSets: sorted(new Set(linkedSets)),
      printingProductLinks: productPrintingCounts.get(key) || 0
    };
  }).sort((a, b) => a.language.localeCompare(b.language) || String(a.productCode).localeCompare(String(b.productCode)));

  const expansionGroups = namedFeedProducts.filter(product => product.releaseSets.length > 1).map(product => ({
    productKey: product.productKey,
    productCode: product.productCode,
    linkedSets: product.releaseSets,
    productPrintingEdges: product.printingProductLinks,
    extraNaiveSetEdges: duplicateDerivedEdges.filter(edge => edge.productKey === product.productKey).length
  }));

  const missingOfficial = rows.filter(record => !record.officialImageUrl);
  const imageExceptionsBySetLanguage = {};
  const imageExceptions = missingOfficial.map(record => {
    const key = `${record.releaseSet}|${record.language}`;
    imageExceptionsBySetLanguage[key] = (imageExceptionsBySetLanguage[key] || 0) + 1;
    const expectedPath = `/_card-image/bandai/${record.language}/`;
    const exactIsApplicationPath = typeof record.exactReferenceImageUrl === 'string'
      && record.exactReferenceImageUrl.startsWith(expectedPath);
    const appPathMatchesLanguage = typeof record.applicationImageUrl === 'string'
      && record.applicationImageUrl.startsWith(expectedPath);
    const supportedSupplement = ['OP-18', 'EB-05'].includes(record.releaseSet);
    const hasImageId = typeof record.imageId === 'string' && record.imageId.trim().length > 0;
    return {
      language: record.language,
      releaseSet: record.releaseSet,
      cardNumber: record.cardNumber,
      printingKey: record.printingKey,
      imageId: record.imageId || null,
      historicalOfficialImageUrl: null,
      historicalExactReferenceImageUrl: record.exactReferenceImageUrl || null,
      historicalApplicationImageUrl: record.applicationImageUrl || null,
      exactReferenceIsLanguageScopedApplicationPath: exactIsApplicationPath,
      applicationImagePathIsLanguageScoped: appPathMatchesLanguage,
      localOfficialSupplement: supportedSupplement,
      constructedOfficialUrlCandidate: hasImageId ? directImageUrl(record.language, record.imageId) : null,
      sourceDescription: record.source || null,
      historicalHttpStatus: 'NOT_RECORDED_IN_STAGE_4B-1P_ARTIFACT'
    };
  });

  const imageExceptionCounts = {};
  for (const record of imageExceptions) {
    const key = `${record.releaseSet}|${record.language}`;
    imageExceptionCounts[key] = (imageExceptionCounts[key] || 0) + 1;
  }

  const setCoverage = TARGET_SETS.map(setCode => ({
    setCode,
    englishAssignments: assignmentCounts.bySet[setCode].en,
    japaneseAssignments: assignmentCounts.bySet[setCode].jp,
    totalAssignments: assignmentCounts.bySet[setCode].total,
    sourceFeedProductLinks: namedFeedProducts
      .filter(product => product.releaseSets.includes(setCode))
      .reduce((sum, product) => sum + product.printingProductLinks, 0)
  }));

  const assignmentErrors = [];
  if (rows.length !== EXPECTED.officialAssignments) assignmentErrors.push(`Expected ${EXPECTED.officialAssignments} official assignments, got ${rows.length}`);
  if (assignmentCounts.bySet && Object.keys(assignmentCounts.bySet).length !== EXPECTED.releaseSets) assignmentErrors.push('Official assignment manifest does not cover all 25 release sets');
  if (sourcePairs.size !== EXPECTED.feedAssignments || manifestPairs.size !== EXPECTED.feedAssignments) assignmentErrors.push('Feed-backed product-printing edges do not match the expected 7,276 rows');
  if (missingFromManifest.length || missingFromSource.length || duplicateSourcePairs.length) assignmentErrors.push('Pinned feed and retained official assignment manifest have edge or duplicate differences');
  if (premiumRows.length !== EXPECTED.premiumAssignments || premiumSummary.totalProducts !== EXPECTED.premiumProducts) assignmentErrors.push('Premium assignments do not match the expected 24 products / 231 links');
  const assignment = {
    stage: '4B-1V-A5S-1R-2',
    status: assignmentErrors.length ? 'PARTIALLY_RECONCILED' : 'RECONCILED_7786_OFFICIAL_ASSIGNMENTS_AND_231_PREMIUM_ASSIGNMENTS',
    sourceCommit,
    historicalEvidence: {
      stage: historicalManifest.stage,
      verifiedCommit: historicalManifest.verifiedCommit,
      checkedAt: historicalManifest.checkedAt,
      artifactRun: 46053970318,
      artifactId: 15225393084,
      artifactName: 'stage4b-1p-premium-card-collection-persistence'
    },
    expectedOfficialSetAssignments: EXPECTED.officialAssignments,
    reconstructedHistoricalAssignments: rows.length,
    assignmentCounts,
    feedEdgeComparison: {
      pinnedSourceProductPrintingEdges: sourcePairs.size,
      manifestFeedBackedEdges: manifestPairs.size,
      missingFromManifestCount: missingFromManifest.length,
      missingFromSourceCount: missingFromSource.length,
      duplicateSourceEdges: sorted(new Set(duplicateSourcePairs)),
      missingFromManifest,
      missingFromSource
    },
    localSupplements: {
      OP18: { en: 159, jp: 159, total: 318 },
      EB05: { en: 96, jp: 96, total: 192 },
      total: EXPECTED.localSupplementAssignments,
      includedInOfficialAssignmentTotal: true,
      note: 'OP-18 and EB-05 are local official supplement identities; no upstream printing keys are fabricated.'
    },
    premiumCollection: { ...premiumSummary, sourceArtifactStage: '4B-1P' },
    validationErrors: assignmentErrors,
    safeguards: [
      'English and Japanese printing keys remain language-scoped.',
      'Original card numbers remain distinct from release assignment.',
      'Premium product-printing links remain separate from release-set assignments.',
      'The Japanese BANDAI CARD GAMES Fest. 23-24 Premium counterpart is not synthesized.',
      'No inventory link or database write is included.'
    ]
  };

  const expectedGroupCounts = new Map([['OP14-EB04', 199], ['OP15-EB04', 196]]);
  const relationshipErrors = [];
  if (wantedProductSets.length !== 49) relationshipErrors.push(`Expected 49 pinned product-set edges, got ${wantedProductSets.length}`);
  if (sourcePairs.size !== EXPECTED.feedAssignments) relationshipErrors.push(`Expected ${EXPECTED.feedAssignments} source printing-product edges, got ${sourcePairs.size}`);
  if (duplicateDerivedEdges.length !== EXPECTED.relationshipExpansion) relationshipErrors.push(`Expected ${EXPECTED.relationshipExpansion} extra naive-join edges, got ${duplicateDerivedEdges.length}`);
  for (const group of expansionGroups) {
    if (expectedGroupCounts.get(group.productCode) !== group.extraNaiveSetEdges) {
      relationshipErrors.push(`Unexpected set-join expansion for ${group.productCode}: ${group.extraNaiveSetEdges}`);
    }
  }
  const relationship = {
    stage: '4B-1V-A5S-1R-2',
    status: relationshipErrors.length ? 'PARTIALLY_RECONCILED' : 'RECONCILED_395_COMBINED_PRODUCT_JOIN_EXPANSIONS',
    sourceCommit,
    counts: {
      englishJapaneseProductSetEdges: wantedProductSets.length,
      upstreamPrintingProductEdges: sourcePairs.size,
      naiveDerivedSetPrintingEdges: naiveEdges.length,
      naiveJoinExpansion: duplicateDerivedEdges.length,
      productPrintingRowsNotDuplicated: sourcePairs.size,
      reconciledReleaseAssignmentRowsInHistoricalManifest: rows.length
    },
    expansionGroups,
    duplicateDerivedEdges,
    validationErrors: relationshipErrors,
    interpretation: 'The 395 cases are excess edges created by joining each printing-product edge to every set attached to the combined English products OP14-EB04 and OP15-EB04. They are not missing cards or approved additional assignments.',
    approvalPolicy: 'No relationship is automatically approved by this reconciliation.'
  };

  const coverage = {
    stage: '4B-1V-A5S-1R-2',
    status: TARGET_SETS.length === EXPECTED.releaseSets && setCoverage.length * 2 === EXPECTED.languageSetRows
      && assignmentCounts.total === EXPECTED.officialAssignments
      ? 'RECONCILED_25_SETS_50_LANGUAGE_SET_ROWS'
      : 'PARTIALLY_RECONCILED',
    sourceCommit,
    expectedReleaseSets: EXPECTED.releaseSets,
    sourceFeedReleaseSets: sorted(new Set(wantedProductSets.map(edge => edge.set_key))),
    releaseSetsInHistoricalOfficialManifest: TARGET_SETS,
    expectedLanguageSetRows: EXPECTED.languageSetRows,
    releaseSetCounts: setCoverage,
    namedFeedProducts,
    premiumProducts: {
      englishProductCount: premiumSummary.englishProducts,
      japaneseProductCount: premiumSummary.japaneseProducts,
      englishAssignments: premiumSummary.englishAssignments,
      japaneseAssignments: premiumSummary.japaneseAssignments,
      totalAssignments: premiumSummary.totalAssignments
    },
    assignmentTotalsByLanguage: assignmentCounts.byLanguage,
    sourceLimitations: [
      'The pinned upstream feed contains 23 of the 25 release-set identities; OP-18 and EB-05 are represented by local official supplements.',
      'The 510 local official supplement assignments are included in the 7,786 assignment total.'
    ]
  };

  const imageErrors = [];
  if (imageExceptions.length !== EXPECTED.imageExceptions) imageErrors.push(`Expected ${EXPECTED.imageExceptions} image exception records, got ${imageExceptions.length}`);
  for (const [key, expectedCount] of Object.entries(EXPECTED.imageExceptionsBySetLanguage)) {
    if (imageExceptionCounts[key] !== expectedCount) imageErrors.push(`Expected ${expectedCount} image exceptions for ${key}, got ${imageExceptionCounts[key] || 0}`);
  }
  if (imageExceptions.some(record => !record.imageId || !record.localOfficialSupplement
    || !record.exactReferenceIsLanguageScopedApplicationPath || !record.applicationImagePathIsLanguageScoped
    || !record.constructedOfficialUrlCandidate)) {
    imageErrors.push('One or more image exceptions lack a scoped Bandai image ID, official supplement identity or language-scoped proxy path');
  }
  const languageScopedImageIds = imageExceptions.map(record => `${record.language}|${record.imageId}`);
  const candidatePairs = imageExceptions.map(record => `${record.language}|${record.imageId}|${record.constructedOfficialUrlCandidate}`);
  const imageIdToCandidates = new Map();
  const candidateToImageIds = new Map();
  for (const record of imageExceptions) {
    const identity = `${record.language}|${record.imageId}`;
    if (!imageIdToCandidates.has(identity)) imageIdToCandidates.set(identity, new Set());
    imageIdToCandidates.get(identity).add(record.constructedOfficialUrlCandidate);
    if (!candidateToImageIds.has(record.constructedOfficialUrlCandidate)) candidateToImageIds.set(record.constructedOfficialUrlCandidate, new Set());
    candidateToImageIds.get(record.constructedOfficialUrlCandidate).add(identity);
  }
  const hasOneToOneLanguageScopedImageMapping = new Set(languageScopedImageIds).size === EXPECTED.imageExceptions
    && new Set(candidatePairs).size === EXPECTED.imageExceptions
    && new Set(imageExceptions.map(record => record.constructedOfficialUrlCandidate)).size === EXPECTED.imageExceptions
    && [...imageIdToCandidates.values()].every(candidates => candidates.size === 1)
    && [...candidateToImageIds.values()].every(identities => identities.size === 1);
  if (!hasOneToOneLanguageScopedImageMapping) {
    imageErrors.push('Language-scoped image ID identities and Bandai URL candidates must be one-to-one');
  }
  const provenance = {
    stage: '4B-1V-A5S-1R-2',
    status: imageErrors.length ? 'IMAGE_EXCEPTIONS_NEED_REVIEW' : '360_LOCAL_SUPPLEMENT_IMAGE_EXCEPTIONS_CLASSIFIED',
    sourceArtifact: assignment.historicalEvidence,
    counts: {
      assignmentRecords: rows.length,
      missingHistoricalOfficialImageUrl: imageExceptions.length,
      uniqueImageIds: new Set(imageExceptions.map(record => record.imageId)).size,
      uniqueLanguageScopedImageIds: new Set(languageScopedImageIds).size,
      uniqueOfficialUrlCandidates: new Set(imageExceptions.map(record => record.constructedOfficialUrlCandidate)).size,
      bySetAndLanguage: imageExceptionsBySetLanguage,
      exactReferenceImageUrlIsLanguageScopedApplicationPath: imageExceptions.filter(record => record.exactReferenceIsLanguageScopedApplicationPath).length,
      applicationImagePathIsLanguageScoped: imageExceptions.filter(record => record.applicationImagePathIsLanguageScoped).length,
      localOfficialSupplementRecords: imageExceptions.filter(record => record.localOfficialSupplement).length
    },
    classification: {
      historicalOfficialUrl: 'The Stage 4B-1P artifact has no officialImageUrl value for these rows.',
      applicationReference: 'The saved exactReferenceImageUrl and applicationImageUrl values are language-scoped application proxy paths, not official source URLs.',
      candidateUrl: 'A Bandai-hosted URL candidate is derived from the local official supplement image ID and its language. It is not written back into historical evidence or presented as the value originally stored there.',
      httpVerification: 'A separate per-record HTTP audit is required to establish current image availability.'
    },
    affectedRecords: imageExceptions,
    validationErrors: imageErrors,
    safeguards: ['Proxy paths are not classified as official source URLs.', 'Uploaded inventory images are not modified.', 'English and Japanese image hosts remain separate.']
  };

  const oneQ = {
    stage: '4B-1Q',
    status: 'ORIGINAL_1Q_ARTIFACT_NOT_RECOVERED_IN_INVESTIGATED_RUNS',
    designDocument: 'docs/catalogue-coverage/stage4b-1q-reference-catalogue-persistence-design.md',
    designDocumentBlob: 'f5dc5b3638f6e2c348ef73137f9c4d18b673b70d',
    investigatedRuns: [
      { id: 46057201628, number: 1231 },
      { id: 46057108237, number: 1229 },
      { id: 46056988108, number: 1227 },
      { id: 46053970318, number: 1226 }
    ],
    finding: 'The design document link and retained artifact metadata identify artifact 15225393084 as Stage 4B-1P. The retained 1P manifest is used explicitly as historical assignment evidence; no Stage 4B-1Q artifact is claimed.',
    limitation: 'This report does not prove that a Stage 4B-1Q artifact never existed elsewhere or was later expired or deleted.'
  };

  return { assignment, relationship, coverage, provenance, oneQ };
}

export { buildReports, premiumAssignmentRows, summarizeSetAssignments, validateHistoricalManifest };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const get = name => {
    const index = args.indexOf(name);
    return index < 0 ? null : args[index + 1];
  };
  const sourceDir = get('--source-dir');
  const historicalFile = get('--historical-1p');
  const outDir = get('--output-dir') || 'artifacts-stage4b1r2';
  if (!sourceDir || !historicalFile) throw new Error('--source-dir and --historical-1p are required');
  const historicalManifest = JSON.parse(fs.readFileSync(historicalFile, 'utf8'));
  const reports = buildReports({ sourceDir, historicalManifest, sourceCommit: get('--source-commit') || PINNED_SOURCE_COMMIT });
  fs.mkdirSync(outDir, { recursive: true });
  const outputs = [
    ['assignment-reconciliation.json', reports.assignment],
    ['relationship-reconciliation.json', reports.relationship],
    ['upstream-source-coverage.json', reports.coverage],
    ['image-provenance-reconciliation.json', reports.provenance],
    ['stage4b-1q-recovery.json', reports.oneQ]
  ];
  for (const [name, report] of outputs) fs.writeFileSync(path.join(outDir, name), JSON.stringify(report, null, 2) + '\n');
  const summary = {
    assignment: reports.assignment.status,
    officialAssignments: reports.assignment.reconstructedHistoricalAssignments,
    premiumAssignments: reports.assignment.premiumCollection.totalAssignments,
    relationships: reports.relationship.status,
    relationshipExpansion: reports.relationship.counts.naiveJoinExpansion,
    imageExceptions: reports.provenance.counts.missingHistoricalOfficialImageUrl,
    imageExceptionsStatus: reports.provenance.status,
    reportFiles: outputs.length
  };
  console.log(JSON.stringify(summary, null, 2));
  if (reports.assignment.validationErrors.length || reports.relationship.validationErrors.length
    || reports.provenance.validationErrors.length || reports.coverage.status !== 'RECONCILED_25_SETS_50_LANGUAGE_SET_ROWS') process.exitCode = 1;
}
