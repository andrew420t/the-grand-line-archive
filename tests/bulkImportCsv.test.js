import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, isBulkImportDuplicate, validateBulkImportNumericFields } from '../src/admin/bulkImportCsv.js'

test('maps standard and extended card columns from the import CSV', () => {
  const rows = parseCsv(`Card Name,Card Number,Set Code,Counter,Trigger Text,Attributes
Nami,OP01-016,OP01,1000,If trigger is met,Slash
`)
  assert.deepEqual(rows[0], {
    name: 'Nami', card_number: 'OP01-016', set_code: 'OP01', rarity: '', variant_label: '',
    color: '', power: '', cost: '', card_type: '', classification: '', language: '',
    condition: '', price_gbp: '', stock_quantity: '', category_name: '', description: '',
    effect_text: '', counter: '1000', trigger_text: 'If trigger is met', attributes: 'Slash', _row: 2,
  })
})

test('handles quoted commas, doubled quotes, and multiline cells', () => {
  const rows = parseCsv(`name,description
"Monkey D. Luffy","Says ""I'm going to be King"", loudly"
Card,"First line
Second line"
`)
  assert.equal(rows[0].name, 'Monkey D. Luffy')
  assert.equal(rows[0].description, `Says "I'm going to be King", loudly`)
  assert.equal(rows[1].description, `First line
Second line`)
})

test('accepts CRLF rows and ignores empty trailing rows', () => {
  const rows = parseCsv(['name,card_number', 'Zoro,OP01-001', '', ''].join('\r\n'))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].card_number, 'OP01-001')
})

test('rejects unmatched quotes, duplicate headers, and trailing text after quotes', () => {
  assert.throws(() => parseCsv('name,description\nLuffy,"unfinished'), /unmatched quote/i)
  assert.throws(() => parseCsv('name,name\nLuffy,Monkey'), /duplicate column headers/i)
  assert.throws(() => parseCsv('name,description\nLuffy,"quoted"trailing'), /text after a closing quote/i)
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

test('numeric card fields allow dash placeholders and zero but reject invalid values', () => {
  assert.deepEqual(validateBulkImportNumericFields({ price_gbp: '0', stock_quantity: '0', power: '0', cost: '-', counter: '-' }), [])
  assert.deepEqual(validateBulkImportNumericFields({ price_gbp: '1.25', stock_quantity: '2', power: '5000', cost: '4', counter: '1000' }), [])
  assert.deepEqual(validateBulkImportNumericFields({ price_gbp: '-1', stock_quantity: '1.5', power: 'five', cost: '-2', counter: '1.5' }), ['Invalid price', 'Invalid quantity', 'Invalid power', 'Invalid cost', 'Invalid counter'])
})

test('blank, base, and Normal variant labels normalize to the same identity', () => {
  assert.equal(isBulkImportDuplicate(
    { card_number: 'OP01-016', set_code: 'OP01', variant_label: '', language: 'EN' },
    { card_number: 'OP01-016', set_code: 'OP01', variant_label: 'Normal', language: 'English' },
  ), true)
})

test('ignores leading blank lines before CSV header', () => {
  const rows = parseCsv('\n\nname,card_number\nLuffy,OP01-001\n')
  assert.equal(rows[0].name, 'Luffy')
})
