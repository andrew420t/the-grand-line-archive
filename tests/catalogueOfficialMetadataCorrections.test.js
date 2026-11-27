import assert from 'node:assert/strict'
import test from 'node:test'
import { applyCatalogueOfficialMetadataCorrection } from '../src/admin/catalogueOfficialMetadataCorrections.js'

test('corrects the Japanese EB01-056 card name to the official Bandai spelling', () => {
  const corrected = applyCatalogueOfficialMetadataCorrection({
    cardNumber: 'EB01-056',
    language: 'jp',
    productCode: 'OP-10',
    observation: { name: 'シャーロット・フランぺ', category: 'character' },
  })
  assert.equal(corrected.name, 'シャーロット・フランペ')
  assert.equal(corrected.category, 'character')
  assert.equal(corrected.source, 'Official Bandai Japanese card list')
})

test('keeps the EB-01 Japanese original spelling while correcting only the OP-10 reprint', () => {
  const english = { name: 'Charlotte Flampe', category: 'character' }
  const japaneseOriginal = { name: 'シャーロット・フランぺ', category: 'character' }
  const japaneseOther = { name: 'Other Card', category: 'character' }
  assert.equal(applyCatalogueOfficialMetadataCorrection({
    cardNumber: 'EB01-056', language: 'en', observation: english,
  }), english)
  assert.equal(applyCatalogueOfficialMetadataCorrection({
    cardNumber: 'EB01-056', language: 'jp', productCode: 'EB-01', observation: japaneseOriginal,
  }), japaneseOriginal)
  assert.equal(applyCatalogueOfficialMetadataCorrection({
    cardNumber: 'EB01-057', language: 'jp', productCode: 'OP-10', observation: japaneseOther,
  }), japaneseOther)
  assert.equal(applyCatalogueOfficialMetadataCorrection({
    cardNumber: 'EB01-056', language: 'jp', observation: null,
  }), null)
})
