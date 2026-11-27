import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { verifySource } from '../scripts/verifyPinnedCatalogueSourceStage4b1vA5s1r1.mjs';

function fixture({ rows = ['{"id":1}\n'], declaredRows, declaredHash, extraFiles = [], manifest = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogue-source-'));
  const bytes = Buffer.from(rows.join(''));
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const spec = { type: 'test', rows: declaredRows ?? rows.filter(x => x.trim()).length, sha256: declaredHash ?? hash };
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/a.jsonl'), bytes);
  for (const file of extraFiles) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '{"extra":true}\n');
  }
  if (manifest) fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ schema_version: 1, generated_at: 'test', files: { 'data/a.jsonl': spec } }));
  return root;
}
const run = (root, extra = {}) => verifySource({
  sourceDir: root, expectedManifestBlob: null, expectedFileCount: 1,
  expectedTotalRows: 1, ...extra
});

test('1. accepts a valid JSONL source file', () => {
  const root = fixture();
  assert.equal(run(root).ok, true);
});

test('2. counts and parses multiple valid records', () => {
  const root = fixture({ rows: ['{"id":1}\n', '{"id":2}\n'] });
  const result = run(root, { expectedTotalRows: 2 });
  assert.equal(result.integrity.files[0].parsedRecords, 2);
  assert.equal(result.ok, true);
});

test('3. rejects malformed JSON records', () => {
  const root = fixture({ rows: ['{"id":1}\n', '{bad}\n'] });
  const result = run(root, { expectedTotalRows: 2 });
  assert.equal(result.integrity.files[0].malformedRecords, 1);
  assert.equal(result.ok, false);
});

test('4. rejects an empty source file', () => {
  const root = fixture({ rows: [''], declaredRows: 0 });
  const result = run(root, { expectedTotalRows: 0 });
  assert.ok(result.errors.some(x => x.includes('Empty source file')));
});

test('5. reports a manifest-listed file that is missing', () => {
  const root = fixture();
  fs.unlinkSync(path.join(root, 'data/a.jsonl'));
  assert.ok(run(root).errors.some(x => x.includes('Missing source file')));
});

test('6. rejects an unexpected JSONL file', () => {
  const root = fixture({ extraFiles: ['data/unexpected.jsonl'] });
  assert.ok(run(root).errors.some(x => x.includes('Unexpected JSONL file')));
});

test('7. detects duplicate manifest paths', () => {
  const root = fixture();
  const duplicate = '{"schema_version":1,"generated_at":"test","files":{"data/a.jsonl":{"rows":1,"sha256":"' +
    crypto.createHash('sha256').update('{"id":1}\n').digest('hex') +
    '"},"data/a.jsonl":{"rows":1,"sha256":"' +
    crypto.createHash('sha256').update('{"id":1}\n').digest('hex') + '"}}}';
  fs.writeFileSync(path.join(root, 'manifest.json'), duplicate);
  assert.ok(run(root).errors.some(x => x.toLowerCase().includes('duplicate')));
});

test('8. rejects an incorrect file hash', () => {
  const root = fixture({ declaredHash: '0'.repeat(64) });
  assert.ok(run(root).errors.some(x => x.includes('SHA-256 mismatch')));
});

test('9. rejects an incorrect declared file row count', () => {
  const root = fixture({ declaredRows: 9 });
  assert.ok(run(root).errors.some(x => x.includes('Row count mismatch')));
});

test('10. rejects an incorrect total row count', () => {
  const root = fixture();
  assert.ok(run(root, { expectedTotalRows: 2 }).errors.some(x => x.includes('Total row count mismatch')));
});

test('11. rejects a missing source directory', () => {
  const result = run(path.join(os.tmpdir(), 'definitely-not-a-catalogue-source'));
  assert.ok(result.errors.some(x => x.includes('Source directory is missing')));
});

test('12. rejects incorrect upstream commit or tree identity', () => {
  const root = fixture();
  const commit = run(root, { actualCommit: 'bad-commit' });
  const tree = run(root, { actualTree: 'bad-tree' });
  assert.ok(commit.errors.some(x => x.includes('commit mismatch')));
  assert.ok(tree.errors.some(x => x.includes('tree mismatch')));
});
