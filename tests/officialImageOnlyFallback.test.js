import assert from 'node:assert/strict'
import test from 'node:test'
import { createOfficialImageOnlyMatch } from '../src/admin/officialImageOnlyFallback.js'

test('creates English and Japanese Bandai base-image references for cards absent from the feed', () => {
  const english = createOfficialImageOnlyMatch('OP18-003', 'en')
  const japanese = createOfficialImageOnlyMatch('OP18-003', 'jp')

  assert.equal(english.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-003.png')
  assert.equal(english.language, 'English')
  assert.equal(english.setCode, 'OP-18')
  assert.equal(english.officialCardlistUrl, 'https://en.onepiece-cardgame.com/cardlist/?series=569118')
  assert.equal(english.officialImageOnly, true)

  assert.equal(japanese.imageUrl, 'https://www.onepiece-cardgame.com/images/cardlist/card/OP18-003.png')
  assert.equal(japanese.language, 'Japanese')
  assert.equal(japanese.officialCardlistUrl, 'https://www.onepiece-cardgame.com/cardlist/?series=550118')
})

test('recognises EB05 and maps English EB04 through combined Bandai lists', () => {
  const eb05 = createOfficialImageOnlyMatch('EB05-061', 'en')
  const eb04 = createOfficialImageOnlyMatch('EB04-025', 'en')

  assert.equal(eb05.setCode, 'EB-05')
  assert.equal(eb05.officialCardlistUrl, 'https://en.onepiece-cardgame.com/cardlist/?series=569205')
  assert.equal(eb04.officialCardlistUrl, 'https://en.onepiece-cardgame.com/cardlist/?series=569114')
})

test('preserves requested reprint set while using the official base image for the card number', () => {
  const match = createOfficialImageOnlyMatch('OP01-016', 'en', 'EB-05')

  assert.equal(match.setCode, 'EB-05')
  assert.equal(match.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016.png')
  assert.equal(match.officialCardlistUrl, 'https://en.onepiece-cardgame.com/cardlist/?series=569205')
})

test('does not invent metadata, exact variant identity or unsupported URLs', () => {
  const match = createOfficialImageOnlyMatch('OP18-003', 'en')
  assert.equal(match.name, '')
  assert.equal(match.rarity, '')
  assert.equal(match.effect, '')
  assert.equal(match.printingKey, '')
  assert.equal(match.variantLabel, '')
  assert.equal(match.fallbackImageUrl, '')
  assert.equal(match.usesBaseImageFallback, true)
  assert.equal(createOfficialImageOnlyMatch('DON!!', 'en'), null)
  assert.equal(createOfficialImageOnlyMatch('OP18-1000', 'en'), null)
  assert.equal(createOfficialImageOnlyMatch('OP18-003', 'zh'), null)
})
