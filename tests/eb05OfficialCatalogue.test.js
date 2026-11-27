import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EB05_BASE_CARD_NUMBERS,
  EB05_OFFICIAL_PRINTINGS,
  getEb05ImageTestItems,
  getEb05SupplementalMatches,
} from '../src/admin/eb05OfficialCatalogue.js'

test('EB-05 official Bandai list includes all 61 numbered base cards', () => {
  assert.equal(EB05_BASE_CARD_NUMBERS.length, 61)
  assert.deepEqual(
    EB05_BASE_CARD_NUMBERS,
    Array.from({ length: 61 }, (_, index) => 'EB05-' + String(index + 1).padStart(3, '0')),
  )
})

test('EB-05 official Bandai lists include all 96 product printings', () => {
  assert.equal(EB05_OFFICIAL_PRINTINGS.length, 96)
  assert.equal(new Set(EB05_OFFICIAL_PRINTINGS.map((printing) => printing.imageIdEn)).size, 96)
  assert.equal(new Set(EB05_OFFICIAL_PRINTINGS.map((printing) => printing.imageIdJp)).size, 96)
  assert.equal(EB05_OFFICIAL_PRINTINGS.filter((printing) => printing.variant === 'Base').length, 61)
  assert.equal(EB05_OFFICIAL_PRINTINGS.filter((printing) => printing.variant === 'Parallel').length, 27)
  assert.equal(EB05_OFFICIAL_PRINTINGS.filter((printing) => printing.variant === 'SP CARD').length, 8)
})

test('EB-05 preserves language-specific official image identifiers and complete metadata', () => {
  for (const printing of EB05_OFFICIAL_PRINTINGS) {
    assert.ok(printing.cardNumber)
    assert.ok(printing.imageIdEn)
    assert.ok(printing.imageIdJp)
    assert.ok(printing.name)
    assert.ok(printing.japaneseName)
    assert.ok(printing.rarity)
    assert.ok(printing.category)
    assert.ok(printing.color)
    assert.ok(printing.types)
    assert.ok(printing.effect)
    assert.match(printing.imageIdEn, /^(?:OP|EB|ST)\d{2}-\d{3}(?:_p\d+)?$/)
    assert.match(printing.imageIdJp, /^(?:OP|EB|ST)\d{2}-\d{3}(?:_p\d+)?$/)
  }
})

test('the EB-05 image audit contains every official printing in both languages', () => {
  const english = getEb05ImageTestItems('en')
  const japanese = getEb05ImageTestItems('jp')
  assert.equal(english.length, 96)
  assert.equal(japanese.length, 96)
  assert.ok(english.every((item) => item.imageUrl.startsWith('/_card-image/bandai/en/')))
  assert.ok(japanese.every((item) => item.imageUrl.startsWith('/_card-image/bandai/jp/')))
  assert.equal(new Set(english.map((item) => item.imageId)).size, 96)
  assert.equal(new Set(japanese.map((item) => item.imageId)).size, 96)
})

test('card-number lookup returns base, parallel and reprint printings in English and Japanese', () => {
  const bonney = getEb05SupplementalMatches('EB05-001')
  assert.equal(bonney.length, 4)
  assert.deepEqual(new Set(bonney.map((item) => item.languageCode)), new Set(['en', 'jp']))
  assert.ok(bonney.some((item) => item.variant === 'Base'))
  assert.ok(bonney.some((item) => item.variant === 'Parallel'))
  assert.ok(bonney.every((item) => item.setCode === 'EB-05'))

  const reprint = getEb05SupplementalMatches('EB03-001')
  assert.equal(reprint.length, 2)
  assert.ok(reprint.every((item) => item.setCode === 'EB-05'))
})

test('hyphenated EB-05 card-number input normalizes to the same printing set', () => {
  assert.equal(
    getEb05SupplementalMatches('EB-05-001').length,
    getEb05SupplementalMatches('EB05-001').length,
  )
  assert.equal(getEb05SupplementalMatches('EB 05 001').length, 4)
  assert.equal(getEb05SupplementalMatches('EB05_001').length, 4)
})
