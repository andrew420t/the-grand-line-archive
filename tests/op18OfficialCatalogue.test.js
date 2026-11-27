import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OP18_BASE_CARD_NUMBERS,
  OP18_OFFICIAL_PRINTINGS,
  getOp18ImageTestItems,
  getOp18SupplementalMatches,
} from '../src/admin/op18OfficialCatalogue.js'

test('OP-18 includes every official numbered base card from OP18-001 through OP18-119', () => {
  assert.equal(OP18_BASE_CARD_NUMBERS.length, 119)
  assert.deepEqual(
    OP18_BASE_CARD_NUMBERS,
    Array.from({ length: 119 }, (_, index) => 'OP18-' + String(index + 1).padStart(3, '0')),
  )
})

test('OP-18 includes all 159 product printings, including parallels and special printings', () => {
  assert.equal(OP18_OFFICIAL_PRINTINGS.length, 159)
  assert.equal(new Set(OP18_OFFICIAL_PRINTINGS.map((printing) => printing.imageId)).size, 159)
  assert.equal(OP18_OFFICIAL_PRINTINGS.filter((printing) => printing.variant === 'Base').length, 119)
  assert.equal(OP18_OFFICIAL_PRINTINGS.filter((printing) => printing.variant === 'Parallel').length, 33)
  assert.equal(OP18_OFFICIAL_PRINTINGS.filter((printing) => ['SP CARD', 'TREASURE RARE'].includes(printing.variant)).length, 7)
})

test('every OP-18 printing has English and Japanese names, rules metadata and a safe image identifier', () => {
  for (const printing of OP18_OFFICIAL_PRINTINGS) {
    assert.ok(printing.cardNumber)
    assert.ok(printing.imageId)
    assert.ok(printing.name)
    assert.ok(printing.japaneseName)
    assert.ok(printing.rarity)
    assert.ok(printing.category)
    assert.ok(printing.color)
    assert.ok(printing.types)
    assert.ok(printing.effect)
    assert.match(printing.imageId, /^(?:OP|EB|ST)\d{2}-\d{3}(?:_p\d+)?$/)
  }
})

test('the full OP-18 image audit includes every printing in both languages', () => {
  const english = getOp18ImageTestItems('en')
  const japanese = getOp18ImageTestItems('jp')
  assert.equal(english.length, 159)
  assert.equal(japanese.length, 159)
  assert.ok(english.every((item) => item.imageUrl.startsWith('/_card-image/bandai/en/')))
  assert.ok(japanese.every((item) => item.imageUrl.startsWith('/_card-image/bandai/jp/')))
  assert.equal(new Set(english.map((item) => item.imageId)).size, 159)
  assert.equal(new Set(japanese.map((item) => item.imageId)).size, 159)
})

test('card-number lookup returns base and alternate printings in English and Japanese', () => {
  const karoo = getOp18SupplementalMatches('OP18-001')
  assert.equal(karoo.length, 4)
  assert.deepEqual(new Set(karoo.map((item) => item.languageCode)), new Set(['en', 'jp']))
  assert.ok(karoo.some((item) => item.variant === 'Base'))
  assert.ok(karoo.some((item) => item.variant === 'Parallel'))
  assert.ok(karoo.every((item) => item.imageUrl && item.imageUrls.length >= 2))
})

test('hyphenated OP-18 card-number input normalizes to the same complete printing set', () => {
  assert.equal(
    getOp18SupplementalMatches('OP-18-001').length,
    getOp18SupplementalMatches('OP18-001').length,
  )
})


test('OP-18 retains Bandai language-specific image IDs and localized TR card identities', () => {
  const english = getOp18SupplementalMatches('OP18-049')
  const japanese = getOp18SupplementalMatches('OP18-064')
  assert.ok(english.some((item) => item.languageCode === 'en' && item.rarity === 'TR' && item.name === 'Mr.2.Bon.Kurei(Bentham)' && item.imageUrl.includes('OP18-049_p1')))
  assert.ok(!english.some((item) => item.languageCode === 'jp' && item.rarity === 'TR'))
  assert.ok(japanese.some((item) => item.languageCode === 'jp' && item.rarity === 'TR' && item.name === 'キリンガム聖' && item.imageUrl.includes('OP18-064_p1')))
  assert.ok(!japanese.some((item) => item.languageCode === 'en' && item.rarity === 'TR'))
  const viviEn = getOp18SupplementalMatches('OP13-012').find((item) => item.languageCode === 'en' && item.variant === 'SP CARD')
  const viviJp = getOp18SupplementalMatches('OP13-012').find((item) => item.languageCode === 'jp' && item.variant === 'SP CARD')
  assert.ok(viviEn.imageUrl.includes('OP13-012_p1'))
  assert.ok(viviJp.imageUrl.includes('OP13-012_p2'))
})
