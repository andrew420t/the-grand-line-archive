import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, isBulkImportDuplicate } from '../src/admin/bulkImportCsv.js'

test('maps standard and extended card columns from the import CSV', () => {
  const rows = parseCsv('Card Name,Card Number,Set Code,Counter,Trigger Text,Attributes\nNami,OP01-016,OP01,1000,If trigger is met,Slash\n')
  assert.deepEqual(rows[0], {
    name: 'Nami', card_number: 'OP01-016', set_code: 'OP01', rarity: '', variant_label: '',
    color: '', power: '', cost: '', card_type: '', classification: '', language: '',
    condition: '', price_gbp: '', stock_quantity: '', category_name: '', description: '',
    effect_text: '', counter: '1000', trigger_text: 'If trigger is met', attributes: 'Slash', _row: 2,
  })
})

test('handles quoted commas, doubled quotes, and multiline cells', () => {
  const rows = parseCsv('name,description\n"Monkey D. Luffy","Says ""I'm going to be King"", loudly"\n')
  assert.equal(rows[0].name, 'Monkey D. Luffy')
  assert.equal(rows[0].description, 'Says "I\'m going to be King", loudly')
})

test('accepts CRLF rows and ignores empty trailing rows', () => {
  const rows = parseCsv('name,card_number\r\nZoro,OP01-001\r\n\r\n')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].card_number, 'OP01-001')
})

test('rejects unmatched quotes and duplicate headers', () => {
  assert.throws(() => parseCsv('name,description\nLuffy,"unfinished'), /unmatched quote/i)
  assert.throws(() => parseCsv('name,name\nLuffy,Monkey'), /duplicate column headers/i)
})

test('requires a header and at least one data row', () => {
  assert.throws(() => parseCsv('name,card_number\n'), /header row and at least one card row/i)
})

test('duplicate identity normalizes set codes and detects same-language printing', () => {
  assert.equal(isBulkImportDuplicate(
    { card_number: 'OP01-016', set_code: 'OP01', variant_label: 'Normal', language: 'English' },
    { card_number: 'OP01-016', set_code: 'OP-01', variant_label: 'normal', language: 'EN' },
  ), true)
})

test('different languages and variants are not exact bulk-import duplicates', () => {
  const existing = { card_number: 'EB04-005', set_code: 'EB04', variant_label: 'Parallel', language: 'Japanese' }
  assert.equal(isBulkImportDuplicate(existing, { ...existing, language: 'English' }), false)
  assert.equal(isBulkImportDuplicate(existing, { ...existing, variant_label: 'Normal' }), false)
})
