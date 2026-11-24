import assert from 'node:assert/strict'
import test from 'node:test'
import { rankCatalogueMatches } from '../src/admin/cardMatchRanking.js'

const candidates = [
  { id: 'jp', name: 'Roronoa Zoro', language: 'Japanese', setCode: 'OP01' },
  { id: 'en', name: 'Roronoa Zoro', language: 'English', setCode: 'OP01' },
  { id: 'other', name: 'Monkey D. Luffy', language: 'English', setCode: 'OP05' },
]

test('OCR name and language signals outrank remembered image when they disagree', () => {
  const ranked = rankCatalogueMatches(candidates, 'Roronoa Zoro', 'English', 'jp')
  assert.equal(ranked[0].match.id, 'en')
  assert.equal(ranked[0].remembered, false)
  assert.equal(ranked[1].match.id, 'jp')
  assert.equal(ranked[1].remembered, true)
})

test('remembered image is only a tie-breaker when OCR signals agree', () => {
  const ranked = rankCatalogueMatches(candidates, 'Roronoa Zoro', 'Unknown', 'jp')
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

test('recognition language aliases rank the matching language correctly', () => {
  assert.equal(rankCatalogueMatches(candidates, '', 'eng')[0].match.id, 'en')
  assert.equal(rankCatalogueMatches(candidates, '', 'jpn')[0].match.id, 'jp')
  assert.equal(rankCatalogueMatches(candidates, '', 'JP')[0].match.id, 'jp')
})

test('partial OCR names are normalized before ranking', () => {
  const ranked = rankCatalogueMatches(candidates, 'Roronoa-Zoro', 'eng')
  assert.equal(ranked[0].match.id, 'en')
  assert.equal(ranked[0].nameMatch, true)
})


test('same-number normal and parallel printings remain separate selectable candidates', () => {
  const printings = [
    { id: 'op17-062-normal', cardNumber: 'OP17-062', name: 'Kaido', language: 'English', languageCode: 'en', setCode: 'OP17', rarity: 'SR', variant: 'Normal', variantLabel: 'Normal' },
    { id: 'op17-062-parallel', cardNumber: 'OP17-062', name: 'Kaido', language: 'English', languageCode: 'en', setCode: 'OP17', rarity: 'SR', variant: 'Parallel', variantLabel: 'Parallel' },
  ]
  const ranked = rankCatalogueMatches(printings, 'Kaido', 'English')
  assert.equal(ranked.length, 2)
  assert.deepEqual(new Set(ranked.map(({ match }) => match.id)), new Set(['op17-062-normal', 'op17-062-parallel']))
  assert.deepEqual(new Set(ranked.map(({ match }) => match.variantLabel)), new Set(['Normal', 'Parallel']))
})

test('Japanese EB04-005 candidate keeps its language and printing identity', () => {
  const law = {
    id: 'eb04-005-jp-regular',
    cardNumber: 'EB04-005',
    name: 'トラファルガー・ロー',
    language: 'Japanese',
    languageCode: 'jp',
    setCode: 'EB04',
    setName: 'Egghead Crisis',
    rarity: 'SR',
    variantLabel: 'Normal',
  }
  const ranked = rankCatalogueMatches([law], 'Unknown', 'jpn')
  assert.equal(ranked[0].match.id, law.id)
  assert.equal(ranked[0].match.cardNumber, 'EB04-005')
  assert.equal(ranked[0].match.languageCode, 'jp')
  assert.equal(ranked[0].match.setName, 'Egghead Crisis')
})


test('number evidence is attached to matching printings without changing OCR name/language ranking', () => {
  const evidence = {
    'OP01-001': { occurrences: 3, confidence: 91, sources: ['footer', 'footer-wide', 'footer-tight'] },
    'OP01-002': { occurrences: 1, confidence: 44, sources: ['footer-tight'] },
  }
  const ranked = rankCatalogueMatches([
    { id: 'law', cardNumber: 'OP01-002', name: 'Trafalgar Law', language: 'English' },
    { id: 'zoro', cardNumber: 'OP01-001', name: 'Roronoa Zoro', language: 'English' },
  ], 'Roronoa Zoro', 'English', '', evidence)
  assert.equal(ranked[0].match.id, 'zoro')
  assert.deepEqual(ranked[0].numberEvidence, evidence['OP01-001'])
  assert.deepEqual(ranked[1].numberEvidence, evidence['OP01-002'])
})

test('number evidence stays absent for matches with no OCR candidate evidence', () => {
  const ranked = rankCatalogueMatches([{ id: 'candidate', cardNumber: 'OP01-001', name: 'Zoro', language: 'English' }])
  assert.equal(ranked[0].numberEvidence, null)
})

test('stronger printed-number evidence ranks ahead of contradictory name/language OCR', () => {
  const ranked = rankCatalogueMatches([
    { id: 'name', cardNumber: 'OP01-002', name: 'Roronoa Zoro', language: 'English' },
    { id: 'number', cardNumber: 'OP01-001', name: 'Trafalgar Law', language: 'Japanese' },
  ], 'Roronoa Zoro', 'English', '', {
    'OP01-001': { occurrences: 3, confidence: 92, sources: ['footer', 'wide', 'tight'] },
    'OP01-002': { occurrences: 1, confidence: 51, sources: ['footer'] },
  })
  assert.equal(ranked[0].match.id, 'number')
  assert.equal(ranked[0].nameMatch, false)
  assert.equal(ranked[0].numberEvidence.occurrences, 3)
  assert.equal(ranked[1].match.id, 'name')
})

test('number evidence occurrence count and confidence break ties before OCR name', () => {
  const ranked = rankCatalogueMatches([
    { id: 'weak', cardNumber: 'OP01-003', name: 'Roronoa Zoro', language: 'English' },
    { id: 'strong', cardNumber: 'OP01-001', name: 'Trafalgar Law', language: 'Japanese' },
  ], 'Roronoa Zoro', 'English', '', {
    'OP01-003': { occurrences: 1, confidence: 80, sources: ['footer'] },
    'OP01-001': { occurrences: 2, confidence: 70, sources: ['footer', 'wide'] },
  })
  assert.equal(ranked[0].match.id, 'strong')
})

test('number OCR confidence ranks evidence-strength ties before name matching', () => {
  const ranked = rankCatalogueMatches([
    { id: 'name', cardNumber: 'OP01-002', name: 'Roronoa Zoro', language: 'English' },
    { id: 'confident-number', cardNumber: 'OP01-001', name: 'Trafalgar Law', language: 'Japanese' },
  ], 'Roronoa Zoro', 'English', '', {
    'OP01-002': { occurrences: 2, confidence: 55, sources: ['footer', 'wide'] },
    'OP01-001': { occurrences: 2, confidence: 91, sources: ['footer', 'wide'] },
  })
  assert.equal(ranked[0].match.id, 'confident-number')
  assert.equal(ranked[1].match.id, 'name')
})

test('number-evidenced printing ranks before a match with no footer evidence', () => {
  const ranked = rankCatalogueMatches([
    { id: 'name-only', cardNumber: 'OP01-002', name: 'Roronoa Zoro', language: 'English' },
    { id: 'footer', cardNumber: 'OP01-001', name: 'Trafalgar Law', language: 'Japanese' },
  ], 'Roronoa Zoro', 'English', '', {
    'OP01-001': { occurrences: 1, confidence: 60, sources: ['footer'] },
  })
  assert.equal(ranked[0].match.id, 'footer')
  assert.equal(ranked[0].numberEvidence.occurrences, 1)
})


test('locale-style language codes such as en-US and ja-JP rank correctly', () => {
  assert.equal(rankCatalogueMatches(candidates, '', 'en-US')[0].match.id, 'en')
  assert.equal(rankCatalogueMatches(candidates, '', 'ja-JP')[0].match.id, 'jp')
  assert.equal(rankCatalogueMatches(candidates, '', 'EN-gb')[0].match.id, 'en')
})


test('exact OCR name match outranks a longer name containing the same text', () => {
  const ranked = rankCatalogueMatches([
    { id: 'long', name: 'Portgas D. Ace', language: 'English' },
    { id: 'exact', name: 'Ace', language: 'Japanese' },
  ], 'Ace', 'English')
  assert.equal(ranked[0].match.id, 'exact')
  assert.equal(ranked[0].exactNameMatch, true)
  assert.equal(ranked[1].exactNameMatch, false)
})
