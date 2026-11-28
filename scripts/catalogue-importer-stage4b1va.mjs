#!/usr/bin/env node
// Offline source planner only. This module has no Supabase client, credential or write path.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifySource } from './verifyPinnedCatalogueSourceStage4b1vA5s1r1.mjs';
import { buildReports, EXPECTED, PINNED_SOURCE_COMMIT } from './reconcileCatalogueEvidenceStage4b1vA5s1r2.mjs';

export const SOURCE_COMMIT = PINNED_SOURCE_COMMIT;
export const SOURCE_TREE = 'd0059fd77462cf377b9dfd65d87a6afabc76077f';
export const TESTING_PROJECT_REF = 'ehzqsnfkmwphyllhaqhe';
export const HISTORICAL_1P_COMMIT = 'd0c478adf17767d0fa441c4483ac42a18a4b089a';
export const PROTECTED = Object.freeze([
  'public.products',
  'public.cards',
  'public.sets',
  'public.product_images',
  'public.orders',
  'public.order_items',
  'public.profiles',
  'public.catalogue_inventory_links'
]);

function verifyPinnedSource(sourceDir, actualCommit, actualTree) {
  const result = verifySource({ sourceDir, actualCommit, actualTree });
  if (!result.ok) throw new Error(`Pinned source verification failed: ${result.errors.join('; ')}`);
  return result;
}

export function plan(sourceDir, {
  projectRef = TESTING_PROJECT_REF,
  sourceCommit = SOURCE_COMMIT,
  sourceTree = SOURCE_TREE,
  historicalManifest
} = {}) {
  if (projectRef !== TESTING_PROJECT_REF) throw new Error('Only the verified Testing project reference is accepted');
  if (sourceCommit !== SOURCE_COMMIT) throw new Error('Only the pinned upstream source commit is accepted');
  if (sourceTree !== SOURCE_TREE) throw new Error('Only the pinned upstream source tree is accepted');
  if (!historicalManifest) throw new Error('A retained Stage 4B-1P official assignment artifact is required');
  if (historicalManifest.stage !== '4B-1P' || historicalManifest.verifiedCommit !== HISTORICAL_1P_COMMIT) {
    throw new Error('The supplied official assignment evidence is not the retained Stage 4B-1P artifact');
  }

  const source = verifyPinnedSource(sourceDir, sourceCommit, sourceTree);
  const reports = buildReports({ sourceDir, historicalManifest, sourceCommit });
  if (reports.assignment.validationErrors.length || reports.relationship.validationErrors.length
    || reports.provenance.validationErrors.length
    || reports.assignment.status !== 'RECONCILED_7786_OFFICIAL_ASSIGNMENTS_AND_231_PREMIUM_ASSIGNMENTS'
    || reports.relationship.status !== 'RECONCILED_395_COMBINED_PRODUCT_JOIN_EXPANSIONS'
    || reports.provenance.status !== '360_LOCAL_SUPPLEMENT_IMAGE_EXCEPTIONS_CLASSIFIED'
    || reports.coverage.status !== 'RECONCILED_25_SETS_50_LANGUAGE_SET_ROWS') {
    throw new Error('Full catalogue reconciliation did not meet every pinned acceptance count');
  }

  const sourceFiles = source.integrity.files.map(file => ({
    path: file.path,
    type: source.coverage.countsByFile[file.path]?.type ?? null,
    sourceRows: file.parsedRecords,
    sha256: file.sha256,
    hashMatchesManifest: file.hashMatchesManifest,
    rowCountMatchesManifest: file.rowCountMatchesManifest
  }));
  const excludedTypes = new Set(['designs', 'distributions', 'don_sets', 'printing_designs', 'printing_distributions', 'retired_printings']);
  const unsupportedFiles = sourceFiles.filter(file => excludedTypes.has(file.type)).map(file => ({
    path: file.path,
    rows: file.sourceRows,
    type: file.type,
    reason: 'Outside the approved English/Japanese release and Premium assignment scope; no lossless target is included in this dry-run.'
  }));

  return {
    stage: '4B-1V-A5S-1R-9',
    mode: 'OFFLINE_DRY_RUN_ONLY',
    status: 'RECONCILED_DRY_RUN_READY_FOR_SEPARATE_REVIEW',
    source: {
      repository: 'hotavocado/koala-kollect-data',
      commit: sourceCommit,
      tree: sourceTree,
      manifestBlob: source.integrity.manifest.gitBlobSha,
      generatedAt: source.coverage.generatedAt,
      files: source.integrity.actualManifestFileCount,
      rows: source.integrity.actualTotalRows
    },
    historicalEvidence: {
      stage: historicalManifest.stage,
      commit: historicalManifest.verifiedCommit,
      retrievedAt: historicalManifest.checkedAt,
      workflowRun: 46053970318,
      artifactId: 15225393084,
      assignmentRecords: reports.assignment.reconstructedHistoricalAssignments
    },
    targetGuard: {
      acceptedProjectRef: TESTING_PROJECT_REF,
      projectRefWasConnected: false,
      databaseConnectionUsed: false,
      productionAccessed: false
    },
    reconciliation: {
      releaseSets: EXPECTED.releaseSets,
      languageSetRows: EXPECTED.languageSetRows,
      officialSetPrintingAssignments: reports.assignment.reconstructedHistoricalAssignments,
      languageScopedBaseCardNumbers: reports.assignment.assignmentCounts.languageScopedBaseCardNumbers,
      officialAssignmentsByLanguage: reports.assignment.assignmentCounts.byLanguage,
      sourceFeedAssignments: reports.assignment.assignmentCounts.feedBacked,
      localOfficialSupplementAssignments: reports.assignment.assignmentCounts.localSupplement,
      op18Supplement: reports.assignment.localSupplements.OP18,
      eb05Supplement: reports.assignment.localSupplements.EB05,
      premiumProducts: reports.assignment.premiumCollection.totalProducts,
      premiumAssignments: reports.assignment.premiumCollection.totalAssignments,
      combinedDistinctPrintingIdentities: reports.assignment.reconstructedHistoricalAssignments
        + reports.assignment.premiumCollection.totalAssignments,
      extraNaiveJoinRelationships: reports.relationship.counts.naiveJoinExpansion,
      sourceRelationshipGroups: reports.relationship.expansionGroups,
      imageExceptions: {
        count: reports.provenance.counts.missingHistoricalOfficialImageUrl,
        uniqueImageIds: reports.provenance.counts.uniqueImageIds,
        uniqueBandaiUrlCandidates: reports.provenance.counts.uniqueOfficialUrlCandidates,
        bySetAndLanguage: reports.provenance.counts.bySetAndLanguage,
        classification: 'LOCAL_OFFICIAL_SUPPLEMENT_IDS_WITH_LANGUAGE_SCOPED_PROXY_PATHS; CANDIDATE URLS ARE NOT WRITTEN AS HISTORICAL VALUES'
      }
    },
    validation: {
      sourceFileHashes: 'PASS',
      sourceManifestRows: 'PASS',
      assignmentIdentities: reports.assignment.status,
      setAndLanguageRows: reports.coverage.status,
      productRelationshipExpansion: reports.relationship.status,
      imageExceptionClassification: reports.provenance.status,
      premiumAssignments: 'PASS_231_DISTINCT_LANGUAGE_SCOPED_LINKS'
    },
    sourceFiles,
    unsupportedFiles,
    protectedTables: PROTECTED,
    writesPerformed: 0,
    liveImportCapability: false,
    notes: [
      'This command reads local source and the retained 1P artifact only. It cannot connect to Supabase or write database rows.',
      'The 510 local OP-18/EB-05 official assignments are included in the 7,786 official set assignment total.',
      'The 395 relationship cases are excess edges from a naive combined-product join and are not additional assignments.',
      'The 360 historical officialImageUrl gaps remain null; language-scoped Bandai URL candidates are reported separately.',
      'This output is not an import authorization or a live import capability.'
    ]
  };
}

function readArgs(args) {
  const get = name => {
    const index = args.indexOf(name);
    return index < 0 ? null : args[index + 1];
  };
  return { get, has: name => args.includes(name) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = readArgs(process.argv.slice(2));
    if (!args.has('--dry-run')) throw new Error('Only --dry-run is supported');
    const sourceDir = args.get('--source-dir');
    const historicalFile = args.get('--historical-1p');
    if (!sourceDir || !historicalFile) throw new Error('--source-dir and --historical-1p are required');
    const historicalManifest = JSON.parse(fs.readFileSync(historicalFile, 'utf8'));
    const result = plan(sourceDir, {
      sourceCommit: args.get('--source-commit') || SOURCE_COMMIT,
      sourceTree: args.get('--source-tree') || SOURCE_TREE,
      historicalManifest
    });
    const output = JSON.stringify(result, null, 2) + '\n';
    const outputPath = args.get('--output');
    if (outputPath) {
      fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
      fs.writeFileSync(outputPath, output);
    }
    process.stdout.write(output);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
