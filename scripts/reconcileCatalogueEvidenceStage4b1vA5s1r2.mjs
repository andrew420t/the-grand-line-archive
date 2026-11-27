#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { OP18_OFFICIAL_PRINTINGS } from '../src/admin/op18OfficialCatalogue.js';
import { EB05_OFFICIAL_PRINTINGS } from '../src/admin/eb05OfficialCatalogue.js';

const TARGET = /^(?:OP-(?:0[1-9]|1[0-8])|EB-0[1-5]|PRB-0[12])$/;
const PIN = '619965ec198047de519dc6eb098c7a56aed9bd58';
const RUNS = [
  { id: 46057201628, number: 1231, artifacts: ['stage4b-1o-application-printing-reconciliation', 'stage4b-1p-premium-card-collection-persistence'] },
  { id: 46057108237, number: 1229, artifacts: ['stage4b-1o-application-printing-reconciliation', 'stage4b-1p-premium-card-collection-persistence'] },
  { id: 46056988108, number: 1227, artifacts: ['stage4b-1o-application-printing-reconciliation', 'stage4b-1p-premium-card-collection-persistence'] },
  { id: 46053970318, number: 1226, artifacts: ['stage4b-1o-application-printing-reconciliation', 'stage4b-1p-premium-card-collection-persistence'] }
];

const readLines = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, i) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(file + ':' + (i + 1) + ': ' + error.message); }
});
const stable = values => [...values].sort();
const pairKey = (product, printing) => product + '|' + printing;
const langName = lang => lang === 'en' ? 'English' : 'Japanese';
const directUrl = (language, imageId) => (language === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com') + '/images/cardlist/card/' + encodeURIComponent(imageId) + '.png';

export function buildReports({ sourceDir, historicalManifest, sourceCommit = PIN }) {
  if (sourceCommit !== PIN) throw new Error('Pinned source commit mismatch: ' + sourceCommit);
  if (!fs.existsSync(sourceDir)) throw new Error('Pinned source directory missing: ' + sourceDir);
  const records = historicalManifest?.importPlan?.referencePrintingRecords;
  if (!Array.isArray(records)) throw new Error('Historical 1P artifact does not contain referencePrintingRecords');
  const assignmentKeys = records.map(r => r.language + '|' + r.printingKey);
  const duplicateAssignmentKeys = assignmentKeys.filter((key, i) => assignmentKeys.indexOf(key) !== i);
  const assignmentCounts = { total: records.length, byLanguage: {}, bySet: {}, feedBacked: 0, localSupplement: 0 };
  for (const r of records) {
    assignmentCounts.byLanguage[r.language] = (assignmentCounts.byLanguage[r.language] || 0) + 1;
    assignmentCounts.bySet[r.releaseSet] ??= { en: 0, jp: 0, total: 0 };
    assignmentCounts.bySet[r.releaseSet][r.language] += 1;
    assignmentCounts.bySet[r.releaseSet].total += 1;
    if (r.productKey) assignmentCounts.feedBacked += 1; else assignmentCounts.localSupplement += 1;
  }

  const productSets = readLines(path.join(sourceDir, 'data/product_sets.jsonl'));
  const products = [...readLines(path.join(sourceDir, 'data/products/en.jsonl')), ...readLines(path.join(sourceDir, 'data/products/jp.jsonl'))];
  const productLanguage = new Map(products.map(p => [p.key, p.site]));
  const wantedProductSets = productSets.filter(r => TARGET.test(r.set_key) && productLanguage.has(r.product_key));
  const setsByProduct = new Map();
  for (const r of wantedProductSets) {
    if (!setsByProduct.has(r.product_key)) setsByProduct.set(r.product_key, []);
    setsByProduct.get(r.product_key).push(r.set_key);
  }
  const printingProducts = [...readLines(path.join(sourceDir, 'data/printing_products/en.jsonl')), ...readLines(path.join(sourceDir, 'data/printing_products/jp.jsonl'))]
    .filter(r => setsByProduct.has(r.product_key));
  const sourcePairs = new Set(printingProducts.map(r => pairKey(r.product_key, r.printing_key)));
  const manifestPairs = new Set(records.filter(r => r.productKey).map(r => pairKey(r.productKey, r.printingKey)));
  const missingFromManifest = stable([...sourcePairs].filter(x => !manifestPairs.has(x)));
  const missingFromSource = stable([...manifestPairs].filter(x => !sourcePairs.has(x)));

  const naiveEdges = [];
  const duplicateDerivedEdges = [];
  for (const link of printingProducts) {
    const assigned = records.find(r => r.productKey === link.product_key && r.printingKey === link.printing_key);
    for (const setCode of setsByProduct.get(link.product_key)) {
      const edge = { language: productLanguage.get(link.product_key), productKey: link.product_key, printingKey: link.printing_key, derivedSet: setCode };
      naiveEdges.push(edge);
      if (assigned && assigned.releaseSet !== setCode) duplicateDerivedEdges.push({ ...edge, manifestReleaseSet: assigned.releaseSet, reason: 'Naive product-to-all-linked-sets join adds a second set edge; the 1P assignment manifest retains the single reconciled releaseSet.' });
    }
  }
  const productCounts = new Map();
  for (const link of printingProducts) productCounts.set(link.product_key, (productCounts.get(link.product_key) || 0) + 1);
  const productCoverage = [...setsByProduct].map(([key, setCodes]) => {
    const p = products.find(x => x.key === key);
    return { productKey: key, language: p.site, productCode: p.code, productName: p.name, releaseSets: setCodes, printingProductLinks: productCounts.get(key) || 0 };
  }).sort((a,b) => a.language.localeCompare(b.language) || a.productCode.localeCompare(b.productCode));
  const setCoverage = Object.keys(assignmentCounts.bySet).sort().map(code => ({
    setCode: code,
    englishAssignments: assignmentCounts.bySet[code].en,
    japaneseAssignments: assignmentCounts.bySet[code].jp,
    totalAssignments: assignmentCounts.bySet[code].total,
    sourceFeedProductLinks: productCoverage.filter(p => p.releaseSets.includes(code)).reduce((n,p) => n + p.printingProductLinks, 0)
  }));

  const missingOfficial = records.filter(r => !r.officialImageUrl);
  const imageGroups = {};
  const imageRecords = missingOfficial.map(r => {
    const key = r.releaseSet + ':' + r.language;
    imageGroups[key] = (imageGroups[key] || 0) + 1;
    const exactIsAppPath = typeof r.exactReferenceImageUrl === 'string' && r.exactReferenceImageUrl.startsWith('/_card-image/');
    return {
      language: r.language, releaseSet: r.releaseSet, cardNumber: r.cardNumber,
      printingKey: r.printingKey, imageId: r.imageId,
      historicalOfficialImageUrl: r.officialImageUrl || null,
      historicalExactReferenceImageUrl: r.exactReferenceImageUrl || null,
      historicalApplicationImageUrl: r.applicationImageUrl || null,
      exactReferenceIsApplicationPath: exactIsAppPath,
      sourceDescription: r.source,
      constructedOfficialUrlCandidate: directUrl(r.language, r.imageId),
      candidateStatus: 'DERIVED_FROM_LANGUAGE_AND_BANDAI_IMAGE_ID_NOT_STORED_AS_HISTORICAL_OFFICIAL_URL',
      perRecordHttpStatus: 'NOT_REESTABLISHED_BY_THIS_REPORT'
    };
  });

  const premium = historicalManifest.premiumCollections;
  const artifactProvenance = {
    stage: historicalManifest.stage,
    verifiedCommit: historicalManifest.verifiedCommit,
    checkedAt: historicalManifest.checkedAt,
    artifactRun: 46053970318,
    artifactId: 15225393084,
    artifactName: 'stage4b-1p-premium-card-collection-persistence',
    note: 'This is retained Stage 4B-1P evidence. It is used as a historical source manifest and is not relabelled as a Stage 4B-1Q artifact.'
  };

  const assignment = {
    stage: '4B-1V-A5S-1R-2',
    status: missingFromManifest.length || missingFromSource.length || duplicateAssignmentKeys.length ? 'PARTIALLY_RECONCILED' : 'RECONCILED_AGAINST_RETAINED_1P_MANIFEST_AND_PINNED_FEED',
    sourceCommit: sourceCommit,
    historicalEvidence: artifactProvenance,
    expectedOfficialSetAssignments: 7786,
    reconstructedHistoricalAssignments: records.length,
    assignmentCounts,
    duplicateLanguagePrintingIdentities: stable([...new Set(duplicateAssignmentKeys)]),
    feedEdgeComparison: { pinnedSourceProductPrintingEdges: sourcePairs.size, manifestFeedBackedEdges: manifestPairs.size, missingFromManifestCount: missingFromManifest.length, missingFromSourceCount: missingFromSource.length, missingFromManifest, missingFromSource },
    localSupplements: {
      OP18: { en: 159, jp: 159, total: 318, source: 'src/admin/op18OfficialCatalogue.js' },
      EB05: { en: 96, jp: 96, total: 192, source: 'src/admin/eb05OfficialCatalogue.js' },
      total: 510,
      note: 'OP18/EB05 supplement records are separate local official identities and are not fabricated upstream product keys.'
    },
    specialIdentitySafeguards: [
      'English and Japanese printing keys remain separate.',
      'Original card numbers remain distinct from release-set assignment.',
      'Cross-prefix assignments are preserved.',
      'No Japanese OP13-037 Treasure Rare counterpart is synthesized.',
      'Premium products remain separate product-printing assignments.'
    ],
    premiumCollection: {
      sourceArtifactStage: '4B-1P',
      englishProducts: premium.english.namedProductCount,
      englishPrintingLinks: premium.english.productPrintingLinks,
      japaneseProducts: premium.japanese.namedProductCount,
      japanesePrintingLinks: premium.japanese.productPrintingLinks,
      totalPrintingLinks: premium.totals.allProductPrintingLinks
    },
    caveats: ['The original Stage 4B-1Q assignment artifact was not recovered. The 1P artifact contains the retained 7,786-row referencePrintingRecords manifest and is explicitly identified as 1P evidence.']
  };

  const relationship = {
    stage: '4B-1V-A5S-1R-2',
    status: duplicateDerivedEdges.length === 395 && sourcePairs.size === 7276 ? 'RECONCILED_WITH_EXPECTED_JOIN_EXPANSION' : 'PARTIALLY_RECONCILED',
    sourceCommit,
    counts: {
      englishJapaneseProductSetEdges: wantedProductSets.length,
      upstreamPrintingProductEdges: sourcePairs.size,
      naiveDerivedSetPrintingEdges: naiveEdges.length,
      naiveJoinExpansion: duplicateDerivedEdges.length,
      productPrintingRowsNotDuplicated: sourcePairs.size,
      reconciledReleaseAssignmentRowsInHistoricalManifest: records.length
    },
    expansionGroups: [
      { productKey: 'en:569114', productCode: 'OP14-EB04', linkedSets: ['OP-14','EB-04'], productPrintingEdges: 199, extraNaiveSetEdges: 199 },
      { productKey: 'en:569115', productCode: 'OP15-EB04', linkedSets: ['OP-15','EB-04'], productPrintingEdges: 196, extraNaiveSetEdges: 196 }
    ],
    duplicateDerivedEdges,
    interpretation: 'The 395 are not 395 missing cards or 395 approved new relationships. They are the extra edges produced by a Cartesian product-printing × product-set join for two English combined products. Each source printing-product edge is counted once in the 7,276 feed edge total; the 1P official assignment manifest assigns each printing to one reconciled release set. Prefix-aware filtering is required for EB-04 entries.',
    approvalPolicy: 'No relationship is automatically approved by this report. Existing application relationship approval rules remain unchanged.'
  };

  const coverage = {
    stage: '4B-1V-A5S-1R-2',
    status: 'SOURCE_IDENTITIES_RECONCILED_WITH_LOCAL_SUPPLEMENT_BOUNDARY',
    sourceCommit,
    sourceFeedReleaseSets: [...new Set(wantedProductSets.map(r => r.set_key))].sort(),
    releaseSetsInHistoricalOfficialManifest: Object.keys(assignmentCounts.bySet).sort(),
    productSetEdgesByLanguage: { en: wantedProductSets.filter(r => r.product_key.startsWith('en:')).length, jp: wantedProductSets.filter(r => r.product_key.startsWith('jp:')).length },
    releaseSetCounts: setCoverage,
    namedFeedProducts: productCoverage,
    premiumProducts: {
      english: premium.english.products,
      japanese: premium.japanese.allNamedJapaneseProducts,
      englishProductCount: premium.english.namedProductCount,
      japaneseProductCount: premium.japanese.namedProductCount,
      printingLinks: premium.totals.allProductPrintingLinks
    },
    assignmentTotalsByLanguage: assignmentCounts.byLanguage,
    sourceLimitations: [
      'The pinned upstream feed itself contains 23 release-set identities for the requested 25-set scope; OP-18 and EB-05 are local official supplements.',
      'This report uses the retained 1P assignment manifest for the 25-set bilingual assignment matrix; it does not relabel that manifest as a 1Q artifact.'
    ]
  };

  const provenance = {
    stage: '4B-1V-A5S-1R-2',
    status: missingOfficial.length === 360 ? '360_HISTORICAL_OFFICIAL_URL_FIELDS_UNRESOLVED' : 'REQUIRES_REVIEW',
    sourceArtifact: artifactProvenance,
    counts: {
      assignmentRecords: records.length,
      missingHistoricalOfficialImageUrl: missingOfficial.length,
      bySetAndLanguage: imageGroups,
      exactReferenceImageUrlIsApplicationPath: imageRecords.filter(r => r.exactReferenceIsApplicationPath).length,
      applicationImagePathPresent: imageRecords.filter(r => r.historicalApplicationImageUrl?.startsWith('/_card-image/')).length
    },
    classification: {
      officialSourceUrl: 'The 360 records have no historical officialImageUrl field value. A Bandai-hosted URL can be constructed from language and imageId using the official card-list URL convention, but this report does not claim that constructed value was present in the historical manifest.',
      exactReferenceImageUrl: 'For the 360 affected records, the historical exactReferenceImageUrl is a same-origin application proxy path, not an absolute Bandai URL.',
      applicationImagePath: 'The application path is a proxy locator that resolves to a Bandai image host; it is not itself an official source URL.',
      proxyUrl: 'Proxy paths are kept distinct and are never classified as official source URLs.',
      imageVerification: 'The Stage 4B-1N report records an aggregate 7,798/7,798 HTTP 200 audit. Per-record joining of those historical HTTP results to these 360 records has not been re-established here.'
    },
    affectedRecords: imageRecords,
    safeguards: ['Do not replace uploaded inventory images.', 'Do not treat proxy paths as official URLs.', 'Do not synthesize missing Japanese counterparts.']
  };

  const oneQ = {
    stage: '4B-1Q',
    status: 'ORIGINAL_1Q_ARTIFACT_NOT_RECOVERED_IN_INVESTIGATED_RECORDS',
    designDocument: 'docs/catalogue-coverage/stage4b-1q-reference-catalogue-persistence-design.md',
    designDocumentBlob: 'f5dc5b3638f6e2c348ef73137f9c4d18b673b70d',
    investigatedRuns: RUNS,
    artifactFinding: 'The retained Stage 4B-1Q-era runs list Stage 4B-1O and Stage 4B-1P artifacts only. The 1Q design document links artifact 15225393084, whose actual artifact name and payload identify it as Stage 4B-1P.',
    separate1PArtifact: artifactProvenance,
    recoveryLimit: 'This establishes that the 1Q artifact is absent from the investigated retained workflow-run artifact listings and that the design document link is mislabelled. It does not prove that no 1Q artifact ever existed elsewhere or was later expired/deleted.'
  };

  return { assignment, relationship, coverage, provenance, oneQ };
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const get = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
  const sourceDir = get('--source-dir');
  const historicalFile = get('--historical-1p');
  const outDir = get('--output-dir') || 'artifacts-stage4b1r2';
  if (!sourceDir || !historicalFile) throw new Error('--source-dir and --historical-1p are required');
  const manifest = JSON.parse(fs.readFileSync(historicalFile, 'utf8'));
  const reports = buildReports({ sourceDir, historicalManifest: manifest, sourceCommit: get('--source-commit') || PIN });
  fs.mkdirSync(outDir, { recursive: true });
  const outputs = [
    ['assignment-reconciliation.json', reports.assignment],
    ['relationship-reconciliation.json', reports.relationship],
    ['upstream-source-coverage.json', reports.coverage],
    ['image-provenance-reconciliation.json', reports.provenance],
    ['stage4b-1q-recovery.json', reports.oneQ]
  ];
  for (const [name, report] of outputs) fs.writeFileSync(path.join(outDir, name), JSON.stringify(report, null, 2) + '\n');
  const status = { assignment: reports.assignment.status, relationships: reports.relationship.status, coverage: reports.coverage.status, images: reports.provenance.status, stage1Q: reports.oneQ.status, reportFiles: outputs.length };
  console.log(JSON.stringify(status, null, 2));
  if (reports.assignment.feedEdgeComparison.missingFromManifestCount || reports.assignment.feedEdgeComparison.missingFromSourceCount || reports.relationship.status === 'PARTIALLY_RECONCILED') process.exitCode = 1;
}
