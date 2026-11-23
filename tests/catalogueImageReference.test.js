import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveCatalogueImage } from '../src/admin/catalogueImageReference.js'

test('uses the printing-specific official image when available', () => {
  const printing = { key: 'base', card_key: 'law', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['base:en', { image_id: 'EB04-005_p1' }]]) }
  const result = resolveCatalogueImage({ printing, index, printings: [printing], language: 'en' })
  assert.equal(result.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/EB04-005_p1.png')
  assert.equal(result.usesBaseImageFallback, false)
})

test('uses same-card official base artwork for an unpictured TCGCSV printing', () => {
  const stamped = { key: 'stamp', card_key: 'law', site: 'tcgcsv', image_url: '' }
  const base = { key: 'base', card_key: 'law', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['base:en', { image_id: 'EB04-005' }]]) }
  const result = resolveCatalogueImage({ printing: stamped, index, printings: [stamped, base], language: 'en' })
  assert.equal(result.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/EB04-005.png')
  assert.equal(result.usesBaseImageFallback, true)
  assert.match(result.source, /stamped artwork may differ/)
})

test('does not borrow an image from a different card or language', () => {
  const stamped = { key: 'stamp', card_key: 'law', site: 'tcgcsv', image_url: '' }
  const otherCard = { key: 'other', card_key: 'luffy', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['other:en', { image_id: 'OP01-001' }]]) }
  const result = resolveCatalogueImage({ printing: stamped, index, printings: [stamped, otherCard], language: 'en' })
  assert.equal(result.imageUrl, '')
  assert.equal(result.usesBaseImageFallback, false)
})

test('keeps a direct third-party image when there is no official locator', () => {
  const printing = { key: 'tcg', card_key: 'law', site: 'tcgcsv', image_url: 'https://example.test/law.jpg' }
  const result = resolveCatalogueImage({ printing, index: {}, printings: [printing], language: 'en' })
  assert.equal(result.imageUrl, 'https://example.test/law.jpg')
  assert.equal(result.usesBaseImageFallback, false)
})
