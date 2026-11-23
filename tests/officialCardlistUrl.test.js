import test from 'node:test'
import assert from 'node:assert/strict'
import { getOfficialCardlistUrl } from '../src/admin/officialCardlistUrl.js'

test('links standard set codes to official Bandai lists', () => {
  assert.equal(getOfficialCardlistUrl('OP-18'), 'https://en.onepiece-cardgame.com/cardlist/?series=569118')
  assert.equal(getOfficialCardlistUrl('EB-05'), 'https://en.onepiece-cardgame.com/cardlist/?series=569205')
  assert.equal(getOfficialCardlistUrl('PRB-01'), 'https://en.onepiece-cardgame.com/cardlist/?series=569301')
  assert.equal(getOfficialCardlistUrl('ST-10'), 'https://en.onepiece-cardgame.com/cardlist/?series=569010')
})

test('uses Japanese official list and separate DON!! source', () => {
  assert.equal(getOfficialCardlistUrl('OP-18', 'jp'), 'https://www.onepiece-cardgame.com/cardlist/?series=550118')
  assert.equal(getOfficialCardlistUrl('', 'jp', true), 'https://www.onepiece-cardgame.com/pdf/don-cardlist.pdf')
  assert.equal(getOfficialCardlistUrl('DON!!', 'en', true), 'https://www.onepiece-cardgame.com/pdf/don-cardlist.pdf')
})

test('does not guess combined set series mappings', () => {
  assert.equal(getOfficialCardlistUrl('OP14-EB04'), '')
})
