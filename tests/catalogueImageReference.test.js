import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCatalogueImageProxyUrl,
  buildPreviewBandaiImageFunctionUrl,
  buildOfficialBaseImageUrl,
  buildOfficialImageProxyUrl,
  resolveCatalogueImage,
} from '../src/admin/catalogueImageReference.js'

test('routes English and Japanese Bandai printing images through same-origin proxy first', () => {
  const enPrinting = { key: 'base', card_key: 'law', site: 'en', image_url: '' }
  const jpPrinting = { key: 'jp', card_key: 'law', site: 'jp', image_url: '' }
  const index = { locatorsByPrinting: new Map([
    ['base:en', { image_id: 'EB04-005_p1' }],
    ['jp:jp', { image_id: 'EB04-005_p1' }],
  ]) }
  const en = resolveCatalogueImage({ printing: enPrinting, index, printings: [enPrinting], language: 'en' })
  const jp = resolveCatalogueImage({ printing: jpPrinting, index, printings: [jpPrinting], language: 'jp' })
  assert.equal(en.imageUrl, '/_card-image/bandai/en/EB04-005_p1.png')
  assert.equal(en.fallbackImageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/EB04-005_p1.png')
  assert.equal(jp.imageUrl, '/_card-image/bandai/jp/EB04-005_p1.png')
  assert.equal(jp.fallbackImageUrl, 'https://www.onepiece-cardgame.com/images/cardlist/card/EB04-005_p1.png')
})

test('keeps exact TCGPlayer product photos ahead of generic Bandai base artwork', () => {
  const printing = { key: 'tcg', card_key: 'law', site: 'tcgcsv', image_url: 'https://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg' }
  const result = resolveCatalogueImage({ printing, index: {}, printings: [printing], language: 'en', cardNumber: 'OP12-002' })
  assert.equal(result.imageUrl, '/_card-image/external?url=' + encodeURIComponent(printing.image_url))
  assert.equal(result.fallbackImageUrl, printing.image_url)
  assert.equal(result.imageUrls[2], '/_card-image/bandai/en/OP12-002.png')
})

test('proxies Chinese catalogue images only through their own source host', () => {
  const printing = { key: 'cn-card', card_key: 'law', site: 'cn', image_url: 'https://source.windoent.com/OnePiecePc/Picture/1705891765183OP06-050.png' }
  const result = resolveCatalogueImage({ printing, index: {}, printings: [printing], language: 'cn', cardNumber: 'OP06-050' })
  assert.equal(result.imageUrl, '/_card-image/external?url=' + encodeURIComponent(printing.image_url))
  assert.equal(result.fallbackImageUrl, printing.image_url)
})

test('uses a same-card Chinese catalogue image as a retry before marking the CN image missing', () => {
  const missing = { key: 'cn-base-no-image', card_key: 'law', site: 'cn', image_url: '' }
  const alternate = { key: 'cn-alternate', card_key: 'law', site: 'cn', image_url: 'https://source.windoent.com/OnePiecePc/Picture/alternate-OP06-050P.png' }
  const result = resolveCatalogueImage({ printing: missing, index: { locatorsByPrinting: new Map() }, printings: [missing, alternate], language: 'cn', cardNumber: 'OP06-050' })
  assert.equal(result.imageUrl, '/_card-image/external?url=' + encodeURIComponent(alternate.image_url))
  assert.equal(result.fallbackImageUrl, alternate.image_url)
  assert.equal(result.usesAlternateOfficialFallback, true)
})

test('uses same-card Bandai alternate image before the base-card fallback', () => {
  const missing = { key: 'parallel-missing', card_key: 'karoo', site: 'en', image_url: '' }
  const base = { key: 'base-printing', card_key: 'karoo', site: 'en', image_url: '' }
  const index = { locatorsByPrinting: new Map([['base-printing:en', { image_id: 'OP18-001_p1' }]]) }
  const result = resolveCatalogueImage({ printing: missing, index, printings: [missing, base], language: 'en', cardNumber: 'OP18-001' })
  assert.equal(result.imageUrl, '/_card-image/bandai/en/OP18-001_p1.png')
  assert.equal(result.fallbackImageUrl, 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001_p1.png')
  assert.equal(result.usesAlternateOfficialFallback, true)
})

test('builds validated direct and same-origin Bandai URLs', () => {
  assert.equal(buildOfficialBaseImageUrl('OP18-001', 'English'), 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(buildOfficialBaseImageUrl('OP-18-001', 'English'), 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png')
  assert.equal(buildOfficialBaseImageUrl('EB05-061', 'Japanese'), 'https://www.onepiece-cardgame.com/images/cardlist/card/EB05-061.png')
  assert.equal(buildOfficialBaseImageUrl('P-101', 'en'), 'https://en.onepiece-cardgame.com/images/cardlist/card/P-101.png')
  assert.equal(buildOfficialImageProxyUrl('OP18-001', 'English'), '/_card-image/bandai/en/OP18-001.png')
  assert.equal(buildOfficialImageProxyUrl('OP18-001_p1', 'jp'), '/_card-image/bandai/jp/OP18-001_p1.png')
  assert.equal(buildOfficialImageProxyUrl('DON!!', 'en'), '')
  assert.equal(buildOfficialImageProxyUrl('https://evil.example/x.png', 'en'), '')
})

test('proxies only known external catalogue image hosts', () => {
  assert.equal(buildCatalogueImageProxyUrl('https://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg'), '/_card-image/external?url=' + encodeURIComponent('https://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg'))
  assert.equal(buildCatalogueImageProxyUrl('https://source.windoent.com/OnePiecePc/Picture/card-01.png', 'cn'), '/_card-image/external?url=' + encodeURIComponent('https://source.windoent.com/OnePiecePc/Picture/card-01.png'))
  assert.equal(buildCatalogueImageProxyUrl('https://evil.example/image.png'), '')
  assert.equal(buildCatalogueImageProxyUrl('http://tcgplayer-cdn.tcgplayer.com/product/123_in_1000x1000.jpg'), '')
})

test('does not invent a Bandai base image for numberless DON!! or malformed numbers', () => {
  assert.equal(buildOfficialBaseImageUrl('DON!!', 'en'), '')
  assert.equal(buildOfficialBaseImageUrl('OP18-1000', 'en'), '')
  assert.equal(buildOfficialBaseImageUrl('OP18-001', 'zh'), '')
})

test('builds Testing Supabase Bandai image URLs only for the dedicated preview project', () => {
  assert.equal(
    buildPreviewBandaiImageFunctionUrl('OP18-002', 'en', 'https://ehzqsnfkmwphyllhaqhe.supabase.co'),
    'https://ehzqsnfkmwphyllhaqhe.supabase.co/functions/v1/bandai-card-image?language=en&id=OP18-002',
  )
  assert.equal(
    buildPreviewBandaiImageFunctionUrl('OP18-001_p1', 'Japanese', 'https://ehzqsnfkmwphyllhaqhe.supabase.co/'),
    'https://ehzqsnfkmwphyllhaqhe.supabase.co/functions/v1/bandai-card-image?language=jp&id=OP18-001_p1',
  )
  assert.equal(buildPreviewBandaiImageFunctionUrl('DON!!', 'en', 'https://ehzqsnfkmwphyllhaqhe.supabase.co'), '')
  assert.equal(buildPreviewBandaiImageFunctionUrl('OP18-002', 'en', 'https://production.example.supabase.co'), '')
  assert.equal(buildPreviewBandaiImageFunctionUrl('OP18-002', 'en', 'http://ehzqsnfkmwphyllhaqhe.supabase.co'), '')
})
