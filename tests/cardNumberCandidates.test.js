import assert from 'node:assert/strict'
import test from 'node:test'
import { extractCardNumberCandidates } from '../src/admin/cardNumberCandidates.js'

test('normalizes common OCR substitutions and rewards repeated readings', () => {
  const candidates = extractCardNumberCandidates([
    { label: 'Bottom left', text: 'OP01-001', confidence: 90 },
    { label: 'Bottom right', text: '0P01-001', confidence: 80 },
  ])
  assert.equal(candidates[0].number, 'OP01-001')
  assert.equal(candidates[0].occurrences, 2)
  assert.equal(candidates[0].confidence, 85)
})

test('recognizes EB, ST and PRB card-number formats', () => {
  const candidates = extractCardNumberCandidates([
    { text: 'EB05-119', confidence: 91 },
    { text: 'ST20-001', confidence: 88 },
    { text: 'PRB02-003', confidence: 87 },
  ])
  assert.deepEqual(candidates.map((candidate) => candidate.number), ['EB05-119', 'ST20-001', 'PRB02-003'])
})

test('recognizes promo card numbers', () => {
  const candidates = extractCardNumberCandidates([{ text: 'P-041', confidence: 95 }])
  assert.equal(candidates[0].number, 'P-041')
})

test('ignores text that is not a supported card-number format', () => {
  assert.deepEqual(extractCardNumberCandidates([{ text: 'OP01-AB1 and Luffy 5000', confidence: 99 }]), [])
})
