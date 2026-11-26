import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOfficialImageProxyUrl, buildOfficialBaseImageUrl, resolveCatalogueImage } from '../src/admin/catalogueImageReference.js'

test('uses the referrer-aware proxy first for exact Bandai printing artwork', () => {
  const printing = { key: 'base', card_key: 'law', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['base:en', { image_id: 'EB04-005_p1' }]]) }
  const result = resolveCatalogueImage({ printing, index, printings: [printing], language: 'en' })
  assert.equal(result.imageUrl, 'https://optcg-api.arjunbansal-ai.workers.dev/images/EB04-005_P1')
  assert.equal(result.fallbackImageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/EB04-005_p1.png')
  assert.equal(result.usesBaseImageFallback, false)
})

test('uses same-card official artwork for an unpictured stamped printing', () => {
  const stamped = { key: 'stamp', card_key: 'law', site: 'tcgcsv', image_url: '' }
  const base = { key: 'base', card_key: 'law', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['base:en', { image_id: 'EB04-005' }]]) }
  const result = resolveCatalogueImage({ printing: stamped, index, printings: [stamped, base], language: 'en' })
  assert.equal(result.imageUrl, 'https://optcg-api.arjunbansal-ai.workers.dev/images/EB04-005')
  assert.equal(result.usesAlternateOfficialFallback, true)
  assert.equal(result.usesBaseImageFallback, false)
  assert.match(result.source, /exact finish may differ/)
})

test('does not borrow another card or language image', () => {
  const stamped = { key: 'stamp', card_key: 'law', site: 'tcgcsv', image_url: '' }
  const otherCard = { key: 'other', card_key: 'luffy', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['other:en', { image_id: 'OP01-001' }]]) }
  const result = resolveCatalogueImage({ printing: stamped, index, printings: [stamped, otherCard], language: 'en' })
  assert.equal(result.imageUrl, '')
  assert.equal(result.usesBaseImageFallback, false)
})

test('keeps exact TCGPlayer product photos ahead of base-card proxy artwork', () => {
  const printing = { key: 'tcg', card_key: 'law', site: 'tcgcsv', image_url: 'https://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg' }
  const result = resolveCatalogueImage({ printing, index: {}, printings: [printing], language: 'en', cardNumber: 'OP12-002' })
  assert.equal(result.imageUrl, 'https://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg')
  assert.equal(result.imageUrls[1], 'https://optcg-api.arjunbansal-ai.workers.dev/images/OP12-002')
})

test('validates English, Japanese, DON and alternate-printing proxy URLs', () => {
  assert.equal(buildOfficialImageProxyUrl('OP12-002', 'en'), 'https://optcg-api.arjunbansal-ai.workers.dev/images/OP12-002')
  assert.equal(buildOfficialImageProxyUrl('OP12-002', 'jp'), 'https://optcg-api.arjunbansal-ai.workers.dev/images/OP12-002?lang=ja')
  assert.equal(buildOfficialImageProxyUrl('EB05-061_p1', 'en'), 'https://optcg-api.arjunbansal-ai.workers.dev/images/EB05-061_P1')
  assert.equal(buildOfficialImageProxyUrl('DON-001', 'en'), 'https://optcg-api.arjunbansal-ai.workers.dev/images/DON-001')
  assert.equal(buildOfficialImageProxyUrl('https://evil.example/a.png', 'en'), '')
})

test('uses a same-card Chinese catalogue image as a retry before marking the CN image missing', () => {
  const missing = { key: 'cn-base-no-image', card_key: 'law', site: 'cn', image_url: '' }
  const alternate = { key: 'cn-alternate', card_key: 'law', site: 'cn', image_url: 'https://source.windoent.com/OnePiecePc/Picture/alternate-OP06-050P.png' }
  const result = resolveCatalogueImage({
    printing: missing,
    index: { locatorsByPrinting: new Map() },
    printings: [missing, alternate],
    language: 'cn',
    cardNumber: 'OP06-050',
  })
  assert.equal(result.imageUrl, alternate.image_url)
  assert.equal(result.usesAlternateOfficialFallback, true)
  assert.equal(result.usesBaseImageFallback, false)
  assert.match(result.source, /Chinese catalogue alternate/)
})

test('uses the original Chinese catalogue image and does not substitute English artwork', () => {
  const printing = { key: 'cn-card', card_key: 'law', site: 'cn', image_url: 'https://source.windoent.com/OnePiecePc/Picture/1705891765183OP06-050.png' }
  const result = resolveCatalogueImage({ printing, index: {}, printings: [printing], language: 'cn', cardNumber: 'OP06-050' })
  assert.equal(result.imageUrl, printing.image_url)
  assert.equal(result.usesBaseImageFallback, false)
  assert.equal(result.source, 'Chinese catalogue source image')
})

test('does not invent direct image URLs for DON!! or malformed card numbers', () => {
  assert.equal(buildOfficialBaseImageUrl('DON!!', 'en'), '')
  assert.equal(buildOfficialBaseImageUrl('OP18-1000', 'en'), '')
  assert.equal(buildOfficialBaseImageUrl('OP18-001', 'zh'), '')
})

test('uses proxy base-card fallback when a known official printing has no locator', () => {
  const printing = { key: 'op18-missing-locator', card_key: 'karoo', site: 'en', image_url: '' }
  const result = resolveCatalogueImage({
    printing,
    index: { locatorsByPrinting: new Map() },
    printings: [printing],
    language: 'en',
    cardNumber: 'OP18-001',
  })
  assert.equal(result.imageUrl, 'https://optcg-api.arjunbansal-ai.workers.dev/images/OP18-001')
  assert.equal(result.usesBaseImageFallback, true)
  assert.match(result.source, /special finish may differ/)
})

test('uses a requested-language proxy fallback for Japanese base artwork', () => {
  const printing = { key: 'jp-card', card_key: 'karoo', site: 'jp', image_url: '' }
  const result = resolveCatalogueImage({
    printing,
    index: { locatorsByPrinting: new Map() },
    printings: [printing],
    language: 'jp',
    cardNumber: 'OP18-001',
  })
  assert.equal(result.imageUrl, 'https://optcg-api.arjunbansal-ai.workers.dev/images/OP18-001?lang=ja')
  assert.equal(result.fallbackImageUrl, 'https://www.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(result.usesBaseImageFallback, true)
})

test('prefers a same-card alternate before generic base artwork', () => {
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
  assert.equal(result.imageUrl, 'https://optcg-api.arjunbansal-ai.workers.dev/images/OP18-001_P1')
  assert.equal(result.usesAlternateOfficialFallback, true)
  assert.equal(result.usesBaseImageFallback, false)
})
