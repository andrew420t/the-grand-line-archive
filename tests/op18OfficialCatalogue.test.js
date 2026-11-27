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

test('OP-18 union preserves 160 language-aware printing records and 159 printings per language', () => {
  assert.equal(OP18_OFFICIAL_PRINTINGS.length, 160)
  const english = OP18_OFFICIAL_PRINTINGS.filter((printing) => printing.imageIdEn)
  const japanese = OP18_OFFICIAL_PRINTINGS.filter((printing) => printing.imageIdJp)
  assert.equal(english.length, 159)
  assert.equal(japanese.length, 159)
  assert.equal(new Set(english.map((printing) => printing.imageIdEn)).size, 159)
  assert.equal(new Set(japanese.map((printing) => printing.imageIdJp)).size, 159)
  assert.equal(english.filter((printing) => printing.variant === 'Base').length, 119)
  assert.equal(japanese.filter((printing) => printing.variant === 'Base').length, 119)
  assert.equal(english.filter((printing) => printing.variant === 'Parallel').length, 33)
  assert.equal(japanese.filter((printing) => printing.variant === 'Parallel').length, 33)
  assert.equal(english.filter((printing) => ['SP CARD', 'TREASURE RARE'].includes(printing.variant)).length, 7)
  assert.equal(japanese.filter((printing) => ['SP CARD', 'TREASURE RARE'].includes(printing.variant)).length, 7)
})

test('every OP-18 language-specific printing has a matching card number, name and safe image identifier', () => {
  for (const printing of OP18_OFFICIAL_PRINTINGS) {
    if (printing.imageIdEn) {
      assert.ok(printing.cardNumberEn)
      assert.ok(printing.nameEn)
      assert.match(printing.imageIdEn, /^(?:OP|EB|ST)\\d{2}-\\d{3}(?:_p\\d+)?$/)
    } else {
      assert.equal(printing.cardNumberEn, null)
      assert.equal(printing.nameEn, null)
    }
    if (printing.imageIdJp) {
      assert.ok(printing.cardNumberJp)
      assert.ok(printing.nameJp)
      assert.match(printing.imageIdJp, /^(?:OP|EB|ST)\\d{2}-\\d{3}(?:_p\\d+)?$/)
    } else {
      assert.equal(printing.cardNumberJp, null)
      assert.equal(printing.nameJp, null)
    }
    assert.ok(printing.rarity)
    assert.ok(printing.category)
    assert.ok(printing.color)
    assert.ok(printing.types)
    assert.ok(printing.effect)
  }
})

test('official parallel image IDs remain language-specific', () => {
  const english = getOp18ImageTestItems('en')
  const japanese = getOp18ImageTestItems('jp')
  assert.ok(english.some((item) => item.cardNumber === 'OP13-012' && item.imageId === 'OP13-012_p1'))
  assert.ok(japanese.some((item) => item.cardNumber === 'OP13-012' && item.imageId === 'OP13-012_p2'))
  assert.ok(english.some((item) => item.cardNumber === 'OP17-040' && item.imageId === 'OP17-040_p2'))
  assert.ok(japanese.some((item) => item.cardNumber === 'OP17-040' && item.imageId === 'OP17-040_p1'))
})

test('the English and Japanese treasure-rare cards remain separate printing identities', () => {
  const english = getOp18SupplementalMatches('OP18-049').filter((item) => item.variant === 'TREASURE RARE')
  const japanese = getOp18SupplementalMatches('OP18-064').filter((item) => item.variant === 'TREASURE RARE')
  assert.equal(english.length, 1)
  assert.equal(japanese.length, 1)
  assert.equal(english[0].languageCode, 'en')
  assert.equal(english[0].cardNumber, 'OP18-049')
  assert.equal(english[0].name, 'Mr.2.Bon.Kurei(Bentham)')
  assert.equal(english[0].imageUrl.includes('OP18-049_p1'), true)
  assert.equal(japanese[0].languageCode, 'jp')
  assert.equal(japanese[0].cardNumber, 'OP18-064')
  assert.equal(japanese[0].name, 'キリンガム聖')
  assert.equal(japanese[0].imageUrl.includes('OP18-064_p1'), true)
  assert.equal(getOp18SupplementalMatches('OP18-049').filter((item) => item.languageCode === 'jp' && item.variant === 'TREASURE RARE').length, 0)
  assert.equal(getOp18SupplementalMatches('OP18-064').filter((item) => item.languageCode === 'en' && item.variant === 'TREASURE RARE').length, 0)
})

test('the full OP-18 image audit includes all 159 official printings in each language', () => {
  const english = getOp18ImageTestItems('en')
  const japanese = getOp18ImageTestItems('jp')
  assert.equal(english.length, 159)
  assert.equal(japanese.length, 159)
  assert.ok(english.every((item) => item.imageUrl.startsWith('/_card-image/bandai/en/')))
  assert.ok(japanese.every((item) => item.imageUrl.startsWith('/_card-image/bandai/jp/')))
  assert.equal(new Set(english.map((item) => item.imageId)).size, 159)
  assert.equal(new Set(japanese.map((item) => item.imageId)).size, 159)
  assert.ok(english.some((item) => item.imageId === 'OP18-049_p1'))
  assert.ok(!english.some((item) => item.imageId === 'OP18-064_p1'))
  assert.ok(japanese.some((item) => item.imageId === 'OP18-064_p1'))
  assert.ok(!japanese.some((item) => item.imageId === 'OP18-049_p1'))
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
