import assert from 'node:assert/strict'
import test from 'node:test'
import { getOfficialSupplementReferenceTestItems } from '../src/admin/officialSupplementReferenceMatrix.js'

const items = getOfficialSupplementReferenceTestItems()
const forSet = (set, language) => items.filter((item) => item.targetSet === set && item.language === language)

test('OP-18 supplement reference matrix preserves 159 distinct printings per language', () => {
  const english = forSet('OP-18', 'en')
  const japanese = forSet('OP-18', 'jp')
  assert.equal(english.length, 159)
  assert.equal(japanese.length, 159)
  assert.equal(new Set(english.map((item) => item.imageId)).size, 159)
  assert.equal(new Set(japanese.map((item) => item.imageId)).size, 159)
})

test('OP-18 English and Japanese Treasure Rare printings use their own card numbers and image IDs', () => {
  const englishTreasure = forSet('OP-18', 'en').find((item) => item.imageId === 'OP18-049_p1')
  const japaneseTreasure = forSet('OP-18', 'jp').find((item) => item.imageId === 'OP18-064_p1')

  assert.equal(englishTreasure.cardNumber, 'OP18-049')
  assert.equal(englishTreasure.name, 'Mr.2.Bon.Kurei(Bentham)')
  assert.equal(englishTreasure.rarity, 'TR')
  assert.equal(englishTreasure.variant, 'TREASURE RARE')
  assert.equal(japaneseTreasure.cardNumber, 'OP18-064')
  assert.equal(japaneseTreasure.name, 'キリンガム聖')
  assert.equal(japaneseTreasure.rarity, 'TR')
  assert.equal(japaneseTreasure.variant, 'TREASURE RARE')
  assert.equal(forSet('OP-18', 'jp').some((item) => item.imageId === 'OP18-049_p1'), false)
  assert.equal(forSet('OP-18', 'en').some((item) => item.imageId === 'OP18-064_p1'), false)
})

test('EB-05 supplement reference matrix retains language-specific SP rarity and labels', () => {
  const english = forSet('EB-05', 'en')
  const japanese = forSet('EB-05', 'jp')
  assert.equal(english.length, 96)
  assert.equal(japanese.length, 96)
  assert.equal(english.filter((item) => item.rarity === 'SP CARD').length, 8)
  assert.equal(japanese.filter((item) => item.rarity === 'SPカード').length, 8)
  assert.ok(english.every((item) => item.imageUrl.startsWith('/_card-image/bandai/en/')))
  assert.ok(japanese.every((item) => item.imageUrl.startsWith('/_card-image/bandai/jp/')))
  const englishBonney = english.find((item) => item.cardNumber === 'EB05-001')
  const japaneseBonney = japanese.find((item) => item.cardNumber === 'EB05-001')
  assert.equal(englishBonney.name, 'Jewelry Bonney')
  assert.equal(japaneseBonney.name, 'ジュエリー・ボニー')
})

test('all official supplement reference rows keep their declared language and image host', () => {
  for (const item of items) {
    assert.equal(item.language, item.imageUrl.includes('/bandai/jp/') ? 'jp' : 'en')
    assert.ok(item.imageId)
    assert.ok(item.cardNumber)
    assert.ok(item.name)
    assert.ok(item.rarity)
    assert.ok(item.variant)
  }
})
