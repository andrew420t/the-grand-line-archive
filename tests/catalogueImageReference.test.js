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
  assert.match(result.source, /special finish may differ/)
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


test('builds a validated official base-card URL for English and Japanese card numbers', async () => {
  const { buildOfficialBaseImageUrl } = await import('../src/admin/catalogueImageReference.js')
  assert.equal(buildOfficialBaseImageUrl('OP18-001', 'English'), 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(buildOfficialBaseImageUrl('OP-18-001', 'English'), 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(buildOfficialBaseImageUrl('EB05-061', 'jp'), 'https://www.onepiece-cardgame.com/images/cardlist/card/EB05-061.png')
  assert.equal(buildOfficialBaseImageUrl('P-101', 'en'), 'https://en.onepiece-cardgame.com/images/cardlist/card/P-101.png')
})

test('does not invent an image URL for DON!! or malformed card numbers', async () => {
  const { buildOfficialBaseImageUrl } = await import('../src/admin/catalogueImageReference.js')
  assert.equal(buildOfficialBaseImageUrl('DON!!', 'en'), '')
  assert.equal(buildOfficialBaseImageUrl('OP18-1000', 'en'), '')
  assert.equal(buildOfficialBaseImageUrl('OP18-001', 'zh'), '')
})

test('uses a same-language Bandai base-image fallback when a known official printing has no locator', () => {
  const printing = { key: 'op18-missing-locator', card_key: 'karoo', site: 'en', image_url: '' }
  const result = resolveCatalogueImage({
    printing,
    index: { locatorsByPrinting: new Map() },
    printings: [printing],
    language: 'en',
    cardNumber: 'OP18-001',
  })
  assert.equal(result.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(result.usesBaseImageFallback, true)
  assert.match(result.source, /special finish may differ/)
})

test('uses a numbered base-card fallback for a TCGCSV printing when no exact or alternate image exists', () => {
  const printing = { key: 'tcg-stamp', card_key: 'karoo', site: 'tcgcsv', image_url: '' }
  const result = resolveCatalogueImage({
    printing,
    index: { locatorsByPrinting: new Map() },
    printings: [printing],
    language: 'en',
    cardNumber: 'OP18-001',
  })
  assert.equal(result.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(result.usesBaseImageFallback, true)
})

test('uses the requested language host for a numbered Japanese base-card fallback', () => {
  const printing = { key: 'jp-card', card_key: 'karoo', site: 'jp', image_url: '' }
  const result = resolveCatalogueImage({
    printing,
    index: { locatorsByPrinting: new Map() },
    printings: [printing],
    language: 'jp',
    cardNumber: 'OP18-001',
  })
  assert.equal(result.imageUrl, 'https://www.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(result.usesBaseImageFallback, true)
})

test('prefers same-card alternate official printing artwork before generic base artwork', () => {
  const missing = { key: 'parallel-missing', card_key: 'karoo', site: 'en', image_url: '' }
  const base = { key: 'base-printing', card_key: 'karoo', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['base-printing:en', { image_id: 'OP18-001_p1' }]]) }
  const result = resolveCatalogueImage({
    printing: missing,
    index,
    printings: [missing, base],
    language: 'en',
    cardNumber: 'OP18-001',
  })
  assert.equal(result.imageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001_p1.png')
  assert.equal(result.usesAlternateOfficialFallback, true)
  assert.equal(result.usesBaseImageFallback, false)
})
