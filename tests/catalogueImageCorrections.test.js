import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyCatalogueImageCorrection,
  applyCatalogueImageCorrections,
  matchesCatalogueImageCorrection,
} from '../src/admin/catalogueImageCorrections.js'

const englishRecord = {
  id: 'en-printing:en:op18',
  cardKey: 'card-18-001',
  printingKey: 'en-printing',
  cardNumber: 'OP18-001',
  languageCode: 'en',
  setCode: 'OP-18',
  variant: 'Base',
  variantLabel: 'Base',
  imageUrl: 'https://old.example/op18-001.png',
  imageUrls: ['https://old.example/op18-001.png', 'https://old.example/fallback.png'],
  imageCandidates: [
    { url: 'https://old.example/op18-001.png', kind: 'exact', language: 'en' },
    { url: 'https://old.example/fallback.png', kind: 'base-fallback', language: 'en' },
  ],
}
const englishCorrection = {
  card_number: 'OP18-001',
  language: 'English',
  set_code: 'OP-18',
  variant_label: 'Base',
  printing_key: 'en-printing',
  source: 'Administrator-corrected image reference',
  details: { reference_image_url: 'https://corrected.example/op18-001.png' },
}

test('applies a persisted English image correction only to its exact printing identity', () => {
  assert.equal(matchesCatalogueImageCorrection(englishRecord, englishCorrection), true)
  const corrected = applyCatalogueImageCorrection(englishRecord, englishCorrection)
  assert.equal(corrected.imageUrl, 'https://corrected.example/op18-001.png')
  assert.equal(corrected.imageCandidates[0].url, corrected.imageUrl)
  assert.equal(corrected.imageCandidates[0].language, 'en')
  assert.equal(corrected.imageCandidates[0].printingKey, 'en-printing')
  assert.equal(corrected.referenceCorrected, true)
  assert.equal(corrected.imageCandidates.some((candidate) => candidate.kind === 'base-fallback'), true)
})

test('does not apply a correction across language, set, variant or printing identity', () => {
  assert.equal(matchesCatalogueImageCorrection({ ...englishRecord, languageCode: 'jp' }, englishCorrection), false)
  assert.equal(matchesCatalogueImageCorrection({ ...englishRecord, setCode: 'OP-17' }, englishCorrection), false)
  assert.equal(matchesCatalogueImageCorrection({ ...englishRecord, variant: 'Parallel', variantLabel: 'Parallel' }, englishCorrection), false)
  assert.equal(matchesCatalogueImageCorrection({ ...englishRecord, printingKey: 'another-printing' }, englishCorrection), false)
})

test('applies Japanese corrections only to Japanese catalogue entries', () => {
  const japaneseRecord = { ...englishRecord, id: 'jp-printing:jp:op18', printingKey: 'jp-printing', languageCode: 'jp' }
  const japaneseCorrection = {
    ...englishCorrection,
    language: 'Japanese',
    printing_key: 'jp-printing',
    details: { reference_image_url: 'https://corrected.example/jp-op18-001.png' },
  }
  const corrected = applyCatalogueImageCorrections([japaneseRecord], [japaneseCorrection])[0]
  assert.equal(corrected.imageUrl, 'https://corrected.example/jp-op18-001.png')
  assert.equal(corrected.imageCandidates[0].language, 'jp')
  assert.equal(applyCatalogueImageCorrection(englishRecord, japaneseCorrection), englishRecord)
})

test('ignores invalid persisted URLs rather than overriding a valid catalogue reference', () => {
  const invalid = { ...englishCorrection, details: { reference_image_url: 'http://unsafe.example/image.png' } }
  const result = applyCatalogueImageCorrection(englishRecord, invalid)
  assert.equal(result, englishRecord)
})
