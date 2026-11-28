#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const PINNED = Object.freeze({
  repository: 'hotavocado/koala-kollect-data',
  commit: '619965ec198047de519dc6eb098c7a56aed9bd58',
  tree: 'd0059fd77462cf377b9dfd65d87a6afabc76077f',
  manifestBlob: '5b76b3f0ceb268d1bf43bff7c5dd54ab438076e7',
  fileCount: 27,
  totalRows: 74144,
  generatedAt: '2026-10-22T04:46:19Z'
});

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlobSha = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
const readJson = (file, errors, label) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { errors.push(`${label}: ${error.message}`); return null; }
};
function walkJsonl(root, dir = root, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsonl(root, full, found);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) found.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return found.sort();
}

export function verifySource({
  sourceDir,
  actualCommit = PINNED.commit,
  actualTree = PINNED.tree,
  expectedCommit = PINNED.commit,
  expectedTree = PINNED.tree,
  expectedManifestBlob = PINNED.manifestBlob,
  expectedFileCount = PINNED.fileCount,
  expectedTotalRows = PINNED.totalRows
}) {
  const errors = [];
  if (!sourceDir || !fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    return { ok: false, errors: ['Source directory is missing'], integrity: null, coverage: null };
  }
  if (actualCommit !== expectedCommit) errors.push(`Upstream commit mismatch: expected ${expectedCommit}, got ${actualCommit}`);
  if (actualTree !== expectedTree) errors.push(`Upstream tree mismatch: expected ${expectedTree}, got ${actualTree}`);

  const manifestPath = path.join(sourceDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return { ok: false, errors: [...errors, 'manifest.json is missing'], integrity: null, coverage: null };
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifestBlob = gitBlobSha(manifestBytes);
  if (expectedManifestBlob && manifestBlob !== expectedManifestBlob) errors.push(`Manifest Git blob SHA mismatch: expected ${expectedManifestBlob}, got ${manifestBlob}`);
  const manifest = readJson(manifestPath, errors, 'manifest.json');
  if (!manifest || manifest.schema_version !== 1 || !manifest.files || typeof manifest.files !== 'object') {
    return { ok: false, errors: [...errors, 'Manifest schema is unsupported'], integrity: null, coverage: null };
  }

  const rawManifestKeys = [...manifestBytes.toString('utf8').matchAll(/"(data\/[^"]+\.jsonl)"\s*:/g)].map(match => match[1]);
  const keyCounts = new Map();
  for (const key of rawManifestKeys) keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  for (const [key, count] of keyCounts) if (count > 1) errors.push('Duplicate manifest path: ' + key);
  const entries = Object.entries(manifest.files);
  const paths = entries.map(([p]) => p);
  if (entries.length !== expectedFileCount) errors.push(`Manifest file count mismatch: expected ${expectedFileCount}, got ${entries.length}`);
  const actualPaths = walkJsonl(sourceDir, path.join(sourceDir, 'data'));
  const expectedPaths = [...new Set(paths)].sort();
  const missing = expectedPaths.filter(p => !actualPaths.includes(p));
  const unexpected = actualPaths.filter(p => !expectedPaths.includes(p));
  for (const p of missing) errors.push(`Missing source file: ${p}`);
  for (const p of unexpected) errors.push(`Unexpected JSONL file: ${p}`);

  const files = [];
  const coverageByFile = {};
  let totalRows = 0;
  for (const [relativePath, spec] of entries) {
    const full = path.join(sourceDir, relativePath);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const bytes = fs.readFileSync(full);
    const text = bytes.toString('utf8');
    const lines = text.split(/\r?\n/);
    const nonEmpty = lines.map((line, index) => ({ line, lineNumber: index + 1 })).filter(x => x.line.trim().length > 0);
    let parsed = 0;
    const malformed = [];
    const parsedRows = [];
    for (const item of nonEmpty) {
      try { parsedRows.push(JSON.parse(item.line)); parsed++; }
      catch (error) { malformed.push({ line: item.lineNumber, error: error.message }); }
    }
    const actualHash = sha256(bytes);
    const hashAvailable = typeof spec.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(spec.sha256);
    const hashMatches = hashAvailable ? actualHash === spec.sha256 : null;
    const rowsMatch = typeof spec.rows === 'number' ? parsed === spec.rows : null;
    if (hashMatches === false) errors.push(`SHA-256 mismatch: ${relativePath}`);
    if (rowsMatch === false) errors.push(`Row count mismatch: ${relativePath}: expected ${spec.rows}, got ${parsed}`);
    if (bytes.length === 0) errors.push(`Empty source file: ${relativePath}`);
    if (malformed.length) errors.push(`Malformed JSONL records in ${relativePath}: ${malformed.length}`);
    totalRows += parsed;
    coverageByFile[relativePath] = { type: spec.type ?? null, records: parsed };
    files.push({
      path: relativePath, bytes: bytes.length, sha256: actualHash,
      nonEmptyRecords: nonEmpty.length, parsedRecords: parsed,
      malformedRecords: malformed.length, malformed,
      manifestSha256: hashAvailable ? spec.sha256 : null,
      hashMatchesManifest: hashMatches,
      manifestRows: Number.isInteger(spec.rows) ? spec.rows : null,
      rowCountMatchesManifest: rowsMatch,
      hashComparison: hashAvailable ? 'compared' : 'no manifest SHA-256 supplied'
    });
  }
  if (totalRows !== expectedTotalRows) errors.push(`Total row count mismatch: expected ${expectedTotalRows}, got ${totalRows}`);

  const integrity = {
    repository: PINNED.repository, expectedCommit, actualCommit, commitMatches: actualCommit === expectedCommit,
    expectedTree, actualTree, treeMatches: actualTree === expectedTree,
    manifest: { path: 'manifest.json', gitBlobSha: manifestBlob, expectedGitBlobSha: expectedManifestBlob, blobMatches: expectedManifestBlob ? manifestBlob === expectedManifestBlob : null, generatedAt: manifest.generated_at, expectedGeneratedAt: PINNED.generatedAt, fileEntries: entries.length },
    expectedFileCount, actualManifestFileCount: entries.length, actualJsonlFileCount: actualPaths.length,
    missingFiles: missing, unexpectedFiles: unexpected, files,
    expectedTotalRows, actualTotalRows: totalRows, errors
  };
  const coverage = {
    sourceCommit: actualCommit, generatedAt: manifest.generated_at,
    countsByFile: coverageByFile,
    products: { status: 'requires domain-specific reconciliation; generic row counts are not product identity counts' },
    releaseSets: { status: 'requires domain-specific reconciliation; generic row counts are not release-set identity counts' },
    languages: Object.fromEntries(['en','jp','cn','tcgcsv'].map(language => [language, {
      records: files.filter(f => f.path.endsWith('/' + language + '.jsonl')).reduce((n, f) => n + f.parsedRecords, 0)
    }])),
    note: 'Counts above are source-record counts, not deduplicated card, printing, product or release assignment counts.'
  };
  return { ok: errors.length === 0, errors, integrity, coverage };
}

export function writeSourceReports(outDir, result) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'upstream-source-integrity.json'),
    JSON.stringify(result.integrity ?? { ok: false, errors: result.errors }, null, 2) + '\n'
  );
  fs.writeFileSync(
    path.join(outDir, 'upstream-source-coverage.json'),
    JSON.stringify(result.coverage ?? { status: 'BLOCKED', errors: result.errors }, null, 2) + '\n'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = process.argv.slice(2);
    const get = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
    const sourceDir = get('--source-dir');
    if (!sourceDir) throw new Error('--source-dir is required');
    const actualCommit = get('--actual-commit') || PINNED.commit;
    const actualTree = get('--actual-tree') || PINNED.tree;
    const outDir = get('--output-dir') || 'artifacts';
    const result = verifySource({ sourceDir, actualCommit, actualTree });
    writeSourceReports(outDir, result);
    process.stdout.write(JSON.stringify({ ok: result.ok, errors: result.errors, files: result.integrity?.files.length ?? 0, rows: result.integrity?.actualTotalRows ?? null }, null, 2) + '\n');
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.stack || error.message); process.exitCode = 2; }
}
