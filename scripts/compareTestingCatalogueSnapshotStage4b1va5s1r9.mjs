#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const TESTING_PROJECT = Object.freeze({
  ref: 'ehzqsnfkmwphyllhaqhe',
  name: 'Grand Line Archive Testing',
  region: 'eu-west-1',
  status: 'ACTIVE_HEALTHY'
});

export const EMPTY_CATALOGUE_TABLES = Object.freeze([
  'catalogue_release_sets',
  'catalogue_release_products',
  'catalogue_cards',
  'catalogue_printings',
  'catalogue_card_observations',
  'catalogue_printing_images',
  'catalogue_product_sets',
  'catalogue_product_printings',
  'catalogue_set_printings',
  'catalogue_inventory_links'
]);

function compareTestingSnapshot(snapshot) {
  const errors = [];
  if (snapshot?.read_only !== true) errors.push('Snapshot is not explicitly marked read-only');
  if (snapshot?.no_database_writes !== true) errors.push('Snapshot does not assert zero database writes');
  if (snapshot?.project?.ref !== TESTING_PROJECT.ref || snapshot?.project?.name !== TESTING_PROJECT.name
    || snapshot?.project?.status !== TESTING_PROJECT.status) {
    errors.push('Snapshot project identity is not the verified Testing project');
  }

  const counts = snapshot?.snapshot;
  if (!counts || typeof counts !== 'object') throw new Error('Snapshot is missing the Testing read-only counts');
  const expectedCounts = {
    sets: 25,
    products: 32,
    card_numbered_products: 31,
    products_without_card_number: 1,
    products_with_uploaded_image: 5,
    products_with_catalogue_match_id: 0,
    products_with_catalogue_printing_key: 0,
    products_with_catalogue_reference_image: 0,
    set_assigned_products: 2,
    products_without_set: 30,
    product_image_rows: 9,
    legacy_public_cards: 0
  };
  const countDifferences = {};
  for (const [field, expected] of Object.entries(expectedCounts)) {
    const actual = counts[field];
    if (actual !== expected) {
      countDifferences[field] = { expected, actual: actual ?? null };
      errors.push(`${field} count differs from the reviewed Testing baseline`);
    }
  }

  const catalogueDifferences = {};
  for (const table of EMPTY_CATALOGUE_TABLES) {
    const actual = counts.catalogue_counts?.[table];
    if (actual !== 0) {
      catalogueDifferences[table] = { expected: 0, actual: actual ?? null };
      errors.push(`${table} must remain empty before a separate import approval`);
    }
  }

  const lokiRecords = counts.loki_records;
  const lokiIds = Array.isArray(lokiRecords) ? lokiRecords.map(record => record.product_id) : [];
  const lokiRowsAreDistinct = lokiIds.length === 2 && new Set(lokiIds).size === 2
    && lokiRecords.every(record => record.name === 'Loki' && record.language === 'Japanese' && record.card_number === 'OP17-119');
  if (!lokiRowsAreDistinct) errors.push('The two Japanese OP17-119 Loki inventory records are not both present with distinct product IDs');

  return {
    stage: '4B-1V-A5S-1R-9',
    status: errors.length ? 'TESTING_READ_ONLY_COMPARISON_FAILED' : 'TESTING_READ_ONLY_COMPARISON_PASSED',
    project: snapshot.project,
    retrievedDate: snapshot.retrieved_date,
    queryFile: snapshot.query_file,
    readOnly: true,
    noDatabaseWrites: true,
    productionAccessed: false,
    baseline: {
      stage: '4B-1P',
      retrievalDate: '2026-11-27',
      products: 32,
      sets: 25,
      productImageRows: 9,
      uploadedImageProducts: 5,
      catalogueInventoryLinks: 0
    },
    current: counts,
    comparison: {
      productsUnchanged: counts.products === 32,
      setsUnchanged: counts.sets === 25,
      catalogueTablesEmpty: Object.keys(catalogueDifferences).length === 0,
      lokiRecordsDistinctAndPreserved: lokiRowsAreDistinct,
      uploadedInventoryImagesPreserved: counts.product_image_rows === 9 && counts.products_with_uploaded_image === 5,
      countDifferences,
      catalogueDifferences
    },
    errors
  };
}

export { compareTestingSnapshot };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const get = name => {
      const index = args.indexOf(name);
      return index < 0 ? null : args[index + 1];
    };
    const input = get('--snapshot');
    const output = get('--output');
    if (!input) throw new Error('--snapshot is required');
    const report = compareTestingSnapshot(JSON.parse(fs.readFileSync(input, 'utf8')));
    const serialized = JSON.stringify(report, null, 2) + '\n';
    if (output) {
      fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
      fs.writeFileSync(output, serialized);
    }
    console.log(JSON.stringify({ status: report.status, comparison: report.comparison, errors: report.errors }, null, 2));
    if (report.status !== 'TESTING_READ_ONLY_COMPARISON_PASSED') process.exitCode = 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
