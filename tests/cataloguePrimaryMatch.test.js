import assert from 'node:assert/strict'
import test from 'node:test'
import { selectPrimaryCatalogueMatch } from '../src/admin/cataloguePrimaryMatch.js'

const matches = [
  { id: 'normal-en', printingKey: 'kaido-normal', cardNumber: 'OP17-062', languageCode: 'en', setCode: 'OP17', variantLabel: 'Normal', imageUrl: 'normal-en.jpg' },
  { id: 'normal-jp', printingKey: 'kaido-normal', cardNumber: 'OP17-062', languageCode: 'jp', setCode: 'OP17', variantLabel: 'Normal', imageUrl: 'normal-jp.jpg' },
  { id: 'parallel-en', printingKey: 'kaido-parallel', cardNumber: 'OP17-062', languageCode: 'en', setCode: 'OP17', variantLabel: 'Parallel', imageUrl: 'parallel-en.jpg' },
  { id: 'other-set-en', printingKey: 'kaido-promo', cardNumber: 'OP17-062', languageCode: 'en', setCode: 'P', variantLabel: 'Promo', imageUrl: 'promo-en.jpg' },
]

test('exact catalogue match id is respected and never falls back to another printing', () => {
  assert.equal(selectPrimaryCatalogueMatch(matches, { matchId: 'parallel-en' })?.id, 'parallel-en')
  assert.equal(selectPrimaryCatalogueMatch(matches, { matchId: 'missing-id' }), null)
})

test('printing key selects exact printing and prefers requested language', () => {
  assert.equal(selectPrimaryCatalogueMatch(matches, { printingKey: 'kaido-normal', language: 'Japanese' })?.id, 'normal-jp')
  assert.equal(selectPrimaryCatalogueMatch(matches, { printingKey: 'missing-key', language: 'English' }), null)
})

test('set and variant identity filter reference images without generic fallback', () => {
  assert.equal(selectPrimaryCatalogueMatch(matches, { setCode: 'OP-17', variantLabel: 'Parallel', language: 'en' })?.id, 'parallel-en')
  assert.equal(selectPrimaryCatalogueMatch(matches, { setCode: 'OP17', variantLabel: 'Promo' })?.id, 'other-set-en')
  assert.equal(selectPrimaryCatalogueMatch(matches, { setCode: 'OP17', variantLabel: 'Alternate Art' }), null)
})

test('normal/base variants normalize and legacy products use language-preferred fallback', () => {
  assert.equal(selectPrimaryCatalogueMatch(matches, { setCode: 'OP17', variantLabel: 'base', language: 'English' })?.id, 'normal-en')
  assert.equal(selectPrimaryCatalogueMatch(matches, { language: 'Japanese' })?.id, 'normal-jp')
})
