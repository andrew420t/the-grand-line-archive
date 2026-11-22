import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCardDetails } from '../src/admin/cardParser.js'

test('parses clearly labelled card details and keeps their OCR confidence', () => {
  const text = [
    'CARD NAME: Monkey D. Luffy',
    'CARD NUMBER: OP05-119',
    'RARITY: SUPER RARE',
    'COLOR: RED',
    'POWER: 5000',
    'COST: 5',
    'TYPE: CHARACTER',
    'LANGUAGE: ENGLISH',
    'On Play: Draw 1 card.',
  ].join('\n')
  const lines = text.split('\n').map((line) => ({ text: line, confidence: 96 }))

  const fields = parseCardDetails(text, lines)

  assert.equal(fields.name.value, 'Monkey D. Luffy')
  assert.equal(fields.card_number.value, 'OP05-119')
  assert.equal(fields.set_code.value, 'OP05')
  assert.equal(fields.rarity.value, 'Super Rare')
  assert.equal(fields.color.value, 'Red')
  assert.equal(fields.power.value, '5000')
  assert.equal(fields.cost.value, '5')
  assert.equal(fields.card_type.value, 'Character')
  assert.equal(fields.classification.value, 'Character')
  assert.equal(fields.language.value, 'English')
  assert.equal(fields.effect_text.value, 'On Play: Draw 1 card.')
  assert.equal(fields.name.needsReview, false)
})

test('leaves absent fields blank rather than inventing card details', () => {
  const fields = parseCardDetails('OP05-119\n5000\nA character sails away.')

  assert.equal(fields.card_number.value, 'OP05-119')
  assert.equal(fields.set_code.value, 'OP05')
  assert.equal(fields.name.value, '')
  assert.equal(fields.rarity.value, '')
  assert.equal(fields.color.value, '')
  assert.equal(fields.power.value, '')
  assert.equal(fields.cost.value, '')
  assert.equal(fields.card_type.value, '')
  assert.equal(fields.effect_text.value, '')
  assert.equal(fields.language.value, '')
})

test('flags low-confidence OCR for manual verification', () => {
  const fields = parseCardDetails('CARD NAME: Trafalgar Law', [
    { text: 'CARD NAME: Trafalgar Law', confidence: 51 },
  ])

  assert.equal(fields.name.value, 'Trafalgar Law')
  assert.equal(fields.name.confidence, 51)
  assert.equal(fields.name.needsReview, true)
})

test('normalizes common OCR zero-versus-letter errors in set codes', () => {
  const cases = [
    ['OPO02-009', 'OP02-009'],
    ['OPO7-057', 'OP07-057'],
    ['EBOO1-008', 'EB01-008'],
    ['EBO2-015', 'EB02-015'],
    ['PRBO1-001', 'PRB01-001'],
    ['PRBO2-050', 'PRB02-050'],
    ['STO1-004', 'ST01-004'],
    ['OPO09-485', 'OP09-485'],
  ]
  for (const [ocr, expected] of cases) {
    const fields = parseCardDetails(ocr)
    assert.equal(fields.card_number.value, expected, `expected ${ocr} to normalize to ${expected}`)
    assert.equal(fields.set_code.value, expected.slice(0, expected.indexOf('-')))
  }
})

test('uses selected OCR language when English or Japanese is not explicitly detectable', () => {
  assert.equal(parseCardDetails('OP01-001 Roronoa Zoro', [], 'eng').language.value, 'English')
  assert.equal(parseCardDetails('OP01-001 ゾロ', [], 'jpn').language.value, 'Japanese')
})

test('Japanese script takes precedence over English OCR language selection', () => {
  assert.equal(parseCardDetails('OP01-001 ゾロ', [], 'eng').language.value, 'Japanese')
})
