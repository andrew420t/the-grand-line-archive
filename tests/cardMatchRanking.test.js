import assert from 'node:assert/strict'
import test from 'node:test'
import { rankCatalogueMatches } from '../src/admin/cardMatchRanking.js'

const candidates = [
  { id: 'jp', name: 'Roronoa Zoro', language: 'Japanese', setCode: 'OP01' },
  { id: 'en', name: 'Roronoa Zoro', language: 'English', setCode: 'OP01' },
  { id: 'other', name: 'Monkey D. Luffy', language: 'English', setCode: 'OP05' },
]

test('remembered choice outranks name and language signals', () => {
  const ranked = rankCatalogueMatches(candidates, 'Roronoa Zoro', 'English', 'jp')
  assert.equal(ranked[0].match.id, 'jp')
  assert.equal(ranked[0].remembered, true)
})

test('exact OCR name ranks before language-only matches', () => {
  const ranked = rankCatalogueMatches(candidates, 'Roronoa Zoro', 'Japanese')
  assert.equal(ranked[0].match.id, 'jp')
  assert.equal(ranked[0].nameMatch, true)
  assert.equal(ranked[1].match.id, 'en')
  assert.equal(ranked[1].nameMatch, true)
  assert.equal(ranked[2].match.id, 'other')
  assert.equal(ranked[2].languageMatch, false)
})

test('language match ranks above a candidate with neither signal', () => {
  const ranked = rankCatalogueMatches(candidates, 'Unknown', 'English')
  assert.equal(ranked[0].match.id, 'en')
  assert.equal(ranked[1].match.id, 'other')
  assert.equal(ranked[2].match.id, 'jp')
})

test('returns an empty ranking for no candidates', () => {
  assert.deepEqual(rankCatalogueMatches([]), [])
})
