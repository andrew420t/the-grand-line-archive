import assert from 'node:assert/strict'
import test from 'node:test'
import { SUPPLEMENTAL_SAMPLE_CARDS, getSupplementalSampleMatches } from '../src/admin/catalogueSupplementalSamples.js'

test('supplement contains only the recent OP18 and EB05 sample cards in both languages', () => {
  assert.equal(SUPPLEMENTAL_SAMPLE_CARDS.length, 8)
  const sets = new Set(SUPPLEMENTAL_SAMPLE_CARDS.map((sample) => sample.setCode))
  assert.deepEqual([...sets].sort(), ['EB-05', 'OP-18'])
  for (const setCode of sets) {
    for (const languageCode of ['en', 'jp']) {
      const cards = SUPPLEMENTAL_SAMPLE_CARDS.filter((sample) => sample.setCode === setCode && sample.languageCode === languageCode)
      assert.equal(cards.length, 2, `${setCode} ${languageCode} should have two sample cards`)
      assert.ok(cards.every((sample) => sample.imageUrl.startsWith('https://')))
    }
  }
})

test('lookup returns both language printings for a supplemented card number with explicit sample metadata', () => {
  const matches = getSupplementalSampleMatches(' eb05_001 ')
  assert.equal(matches.length, 2)
  assert.deepEqual(matches.map((match) => match.languageCode).sort(), ['en', 'jp'])
  assert.ok(matches.every((match) => match.supplementalSample))
  assert.ok(matches.every((match) => match.setCode === 'EB-05'))
  assert.ok(matches.every((match) => match.imageUrl))
})

test('supplemental lookup is empty for numbers outside the sample supplement', () => {
  assert.deepEqual(getSupplementalSampleMatches('OP01-001'), [])
})
