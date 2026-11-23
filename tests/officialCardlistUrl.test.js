import test from 'node:test'
import assert from 'node:assert/strict'
import { getOfficialCardlistUrl } from '../src/admin/officialCardlistUrl.js'

test('links standard set codes to official Bandai lists', () => {
  assert.equal(getOfficialCardlistUrl('OP-18'), 'https://en.onepiece-cardgame.com/cardlist/?series=569118')
  assert.equal(getOfficialCardlistUrl('EB-05'), 'https://en.onepiece-cardgame.com/cardlist/?series=569205')
  assert.equal(getOfficialCardlistUrl('PRB-01'), 'https://en.onepiece-cardgame.com/cardlist/?series=569301')
  assert.equal(getOfficialCardlistUrl('ST-10'), 'https://en.onepiece-cardgame.com/cardlist/?series=569010')
  assert.equal(getOfficialCardlistUrl('PROMO'), 'https://en.onepiece-cardgame.com/cardlist/?series=569901')
  assert.equal(getOfficialCardlistUrl('P'), 'https://en.onepiece-cardgame.com/cardlist/?series=569901')
})

test('uses Japanese official list and separate DON!! source', () => {
  assert.equal(getOfficialCardlistUrl('OP-18', 'jp'), 'https://www.onepiece-cardgame.com/cardlist/?series=550118')
  assert.equal(getOfficialCardlistUrl('EB-05', 'jp'), 'https://www.onepiece-cardgame.com/cardlist/?series=550205')
  assert.equal(getOfficialCardlistUrl('PRB-01', 'jp'), 'https://www.onepiece-cardgame.com/cardlist/?series=550301')
  assert.equal(getOfficialCardlistUrl('EB04', 'jp', false, 'EB04-025'), 'https://www.onepiece-cardgame.com/cardlist/?series=550204')
  assert.equal(getOfficialCardlistUrl('', 'jp', true), 'https://www.onepiece-cardgame.com/pdf/don-cardlist.pdf')
  assert.equal(getOfficialCardlistUrl('DON!!', 'en', true), 'https://www.onepiece-cardgame.com/pdf/don-cardlist.pdf')
})

test('maps verified combined English products and EB04 split by card number', () => {
  assert.equal(getOfficialCardlistUrl('OP14-EB04'), 'https://en.onepiece-cardgame.com/cardlist/?series=569114')
  assert.equal(getOfficialCardlistUrl('OP15-EB04'), 'https://en.onepiece-cardgame.com/cardlist/?series=569115')
  assert.equal(getOfficialCardlistUrl('OP14-EB04', 'en', false, 'OP14-001'), 'https://en.onepiece-cardgame.com/cardlist/?series=569114')
  assert.equal(getOfficialCardlistUrl('OP15-EB04', 'en', false, 'OP15-001'), 'https://en.onepiece-cardgame.com/cardlist/?series=569115')
  assert.equal(getOfficialCardlistUrl('EB04', 'en', false, 'EB04-025'), 'https://en.onepiece-cardgame.com/cardlist/?series=569114')
  assert.equal(getOfficialCardlistUrl('EB04', 'en', false, 'EB04-005'), 'https://en.onepiece-cardgame.com/cardlist/?series=569115')
  assert.equal(getOfficialCardlistUrl('EB04', 'en', false, 'EB04-061'), 'https://en.onepiece-cardgame.com/cardlist/?series=569115')
  assert.equal(getOfficialCardlistUrl('EB04', 'en', false, 'EB04-062'), '')
})
