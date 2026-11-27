import assert from 'node:assert/strict'
import test from 'node:test'
import { filterCatalogueImageEntries, getCatalogueImageFilterOptions, getCardNumberSetCode, dedupePrintingProducts, getCatalogueProductSetCode } from '../src/admin/catalogueImageFilters.js'

const entries = [
  { id: 'a', cardNumber: 'OP12-002', name: 'Edward.Newgate', languageCode: 'en', setCode: 'OP-12', setCodes: ['OP-12'], rarity: 'UC', category: 'Character', colorValues: ['Red'], variant: 'base', imageStatus: 'available' },
  { id: 'b', cardNumber: 'OP12-002', name: 'Edward.Newgate', languageCode: 'jp', setCode: 'OP-12', setCodes: ['OP-12'], rarity: 'UC', category: 'Character', colorValues: ['Red'], variant: 'base', imageStatus: 'missing' },
  { id: 'c', cardNumber: 'OP12-002', name: 'Edward.Newgate', languageCode: 'tcgcsv', setCode: 'PRB-01', setCodes: ['PRB-01'], rarity: 'P', category: 'Character', colorValues: ['Red'], variant: 'stamped', imageStatus: 'fallback' },
  { id: 'd', cardNumber: 'OP12-010', name: 'Whitebeard Pirates', languageCode: 'cn', setCode: 'OP-12', setCodes: ['OP-12'], rarity: 'R', category: 'Event', colorValues: ['Blue'], variant: 'parallel', imageStatus: 'available' },
]

test('filters catalogue rows by set, language, rarity, type, colour, variant and image state', () => {
  assert.deepEqual(filterCatalogueImageEntries(entries, { set: 'OP-12' }).map(x => x.id), ['a', 'b', 'd'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { language: 'cn' }).map(x => x.id), ['d'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { rarity: 'UC', cardType: 'Character', color: 'Red' }).map(x => x.id), ['a', 'b'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { variant: 'stamped' }).map(x => x.id), ['c'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { imageStatus: 'missing' }).map(x => x.id), ['b'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { imageStatus: 'fallback' }).map(x => x.id), ['c'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { imageStatus: 'available' }).map(x => x.id), ['a', 'c', 'd'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { query: 'Whitebeard' }).map(x => x.id), ['d'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { cardNumber: 'OP12-010' }).map(x => x.id), ['d'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { cardNumber: 'OP12-002' }).map(x => x.id), ['a', 'b', 'c'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { sortBy: 'card-number-desc' }).map(x => x.id), ['d', 'a', 'b', 'c'])
  assert.deepEqual(filterCatalogueImageEntries(entries, { sortBy: 'card-number-asc' }).map(x => x.id), ['a', 'b', 'c', 'd'])
})

test('exposes only filter values supported by actual catalogue entries', () => {
  const options = getCatalogueImageFilterOptions(entries)
  assert.deepEqual(options.languages, ['cn', 'en', 'jp', 'tcgcsv'])
  assert.deepEqual(options.sets, ['OP-12', 'PRB-01'])
  assert.deepEqual(options.cardNumberSets, ['OP-12'])
  assert.deepEqual(options.rarities, ['P', 'R', 'UC'])
  assert.deepEqual(options.cardTypes, ['Character', 'Event'])
  assert.deepEqual(options.colors, ['Blue', 'Red'])
  assert.deepEqual(options.variants, ['base', 'parallel', 'stamped'])
})

test('keeps product release set separate from the original set in the card number', () => {
  const printings = [
    { id: 'sp-in-op18', cardNumber: 'OP13-012', name: 'Nefeltari Vivi', languageCode: 'en', setCode: 'OP-18', setCodes: ['OP-18'], rarity: 'SP CARD', variant: 'SP CARD' },
    { id: 'op18-base', cardNumber: 'OP18-001', name: 'Karoo', languageCode: 'en', setCode: 'OP-18', setCodes: ['OP-18'], rarity: 'L', variant: 'Base' },
    { id: 'op13-original', cardNumber: 'OP13-012', name: 'Nefeltari Vivi', languageCode: 'en', setCode: 'OP-13', setCodes: ['OP-13'], rarity: 'R', variant: 'Base' },
    { id: 'st24-sp-in-op18', cardNumber: 'ST24-004', name: 'Law & Bepo', languageCode: 'en', setCode: 'OP-18', setCodes: ['OP-18'], rarity: 'SP CARD', variant: 'SP CARD' },
  ]

  assert.equal(getCardNumberSetCode('OP13-012'), 'OP-13')
  assert.equal(getCardNumberSetCode('ST24-004'), 'ST-24')
  assert.equal(getCardNumberSetCode('OP18-001'), 'OP-18')
  assert.equal(getCardNumberSetCode('DON!!'), '')

  assert.deepEqual(filterCatalogueImageEntries(printings, { set: 'OP-18' }).map((x) => x.id), [
    'sp-in-op18', 'op18-base', 'st24-sp-in-op18',
  ])
  assert.deepEqual(filterCatalogueImageEntries(printings, { cardNumberSet: 'OP-13' }).map((x) => x.id), [
    'op13-original', 'sp-in-op18',
  ])
  assert.deepEqual(filterCatalogueImageEntries(printings, { set: 'OP-18', cardNumberSet: 'OP-13' }).map((x) => x.id), [
    'sp-in-op18',
  ])
  assert.deepEqual(filterCatalogueImageEntries(printings, { set: 'OP-18', cardNumberSet: 'ST-24' }).map((x) => x.id), [
    'st24-sp-in-op18',
  ])
  assert.deepEqual(getCatalogueImageFilterOptions(printings).cardNumberSets, ['OP-13', 'OP-18', 'ST-24'])
})


test('card-number filter is exact after normalising spaces and separators', () => {
  const records = [
    { id: 'op18', cardNumber: 'OP18-001', languageCode: 'en', setCode: 'OP-18', rarity: 'L' },
    { id: 'op15', cardNumber: 'OP15-075', languageCode: 'en', setCode: 'OP-15', rarity: 'UC' },
    { id: 'op18-jp', cardNumber: 'OP-18-001', languageCode: 'jp', setCode: 'OP-18', rarity: 'L' },
  ]
  assert.deepEqual(filterCatalogueImageEntries(records, { cardNumber: 'OP18-001' }).map((x) => x.id).sort(), ['op18', 'op18-jp'])
  assert.deepEqual(filterCatalogueImageEntries(records, { cardNumber: ' OP 18 001 ' }).map((x) => x.id).sort(), ['op18', 'op18-jp'])
  assert.deepEqual(filterCatalogueImageEntries(records, { cardNumber: 'OP18-001', set: 'OP-15', rarity: 'UC' }), [])
  assert.deepEqual(filterCatalogueImageEntries(records, { cardNumber: 'OP18-001', set: 'OP-18', rarity: 'L' }).map((x) => x.id).sort(), ['op18', 'op18-jp'])
})

test('all active filters intersect and cannot leak OP15 results into an OP18 card-number search', () => {
  const records = [
    { id: 'wrong-op15-uc', cardNumber: 'OP15-075', name: 'Karoo', languageCode: 'en', setCode: 'OP-15', rarity: 'UC', category: 'Character', colorValues: ['Yellow'], variant: 'Parallel', imageStatus: 'available' },
    { id: 'right-op18', cardNumber: 'OP18-001', name: 'Karoo', languageCode: 'en', setCode: 'OP-18', rarity: 'L', category: 'Leader', colorValues: ['Yellow'], variant: 'Base', imageStatus: 'available' },
    { id: 'op15-genuine', cardNumber: 'OP13-012', name: 'Nefeltari Vivi', languageCode: 'en', setCode: 'OP-15', setCodes: ['OP-15'], rarity: 'UC', category: 'Character', colorValues: ['Blue'], variant: 'Parallel', imageStatus: 'available' },
  ]
  assert.deepEqual(filterCatalogueImageEntries(records, {
    cardNumber: 'OP18-001', set: 'OP-15', rarity: 'UC', language: 'en',
  }), [])
  assert.deepEqual(filterCatalogueImageEntries(records, {
    set: 'OP-15', cardNumberSet: 'OP-13', rarity: 'UC', cardType: 'Character',
    language: 'en', variant: 'Parallel',
  }).map((x) => x.id), ['op15-genuine'])
  assert.deepEqual(filterCatalogueImageEntries(records, {
    set: 'OP-15', rarity: 'UC', language: 'en',
  }).map((x) => x.id), ['op15-genuine', 'wrong-op15-uc'])
})

test('keeps English and Japanese records and distinct variants/release products separate', () => {
  const records = [
    { id: 'en-base-op15', cardNumber: 'OP13-012', languageCode: 'en', setCode: 'OP-15', rarity: 'UC', variant: 'Base' },
    { id: 'jp-base-op15', cardNumber: 'OP13-012', languageCode: 'jp', setCode: 'OP-15', rarity: 'UC', variant: 'Base' },
    { id: 'en-parallel-op15', cardNumber: 'OP13-012', languageCode: 'en', setCode: 'OP-15', rarity: 'UC', variant: 'Parallel' },
    { id: 'en-reprint-prb', cardNumber: 'OP13-012', languageCode: 'en', setCode: 'PRB-01', rarity: 'UC', variant: 'Parallel' },
  ]
  assert.deepEqual(filterCatalogueImageEntries(records, { set: 'OP-15', language: 'en' }).map((x) => x.id), ['en-base-op15', 'en-parallel-op15'])
  assert.deepEqual(filterCatalogueImageEntries(records, { set: 'PRB-01', cardNumberSet: 'OP-13' }).map((x) => x.id), ['en-reprint-prb'])
})

test('deduplicates repeated links to one product but preserves different release products', () => {
  const products = [
    { key: 'op15', code: 'OP15', name: 'OP-15' },
    { key: 'op15', code: 'OP15', name: 'OP-15 duplicate link' },
    { key: 'prb1', code: 'PRB01', name: 'PRB-01' },
  ]
  assert.deepEqual(dedupePrintingProducts(products), [products[0], products[2]])
  assert.deepEqual(dedupePrintingProducts([]), [])
})


test('prefers a named product over a generic Other Product Card link for one printing', () => {
  const generic = { key: 'en:569801', name: 'Other Product Card' }
  const named = { key: 'en:src_a521deb08741', name: 'Premium Card Collection -Best Selection Vol.6-' }
  const otherRelease = { key: 'en:prb01', code: 'PRB-01', name: 'Premium Booster' }

  assert.deepEqual(dedupePrintingProducts([generic, named]), [named])
  assert.deepEqual(dedupePrintingProducts([generic]), [generic])
  assert.deepEqual(dedupePrintingProducts([generic, named, otherRelease]), [named, otherRelease])
})

test('uses the linked named product as release identity instead of the original card-number set', () => {
  assert.equal(getCatalogueProductSetCode(
    { key: 'en:src_a521deb08741', name: 'Premium Card Collection -Best Selection Vol.6-' },
    'OP15-075',
  ), 'Premium Card Collection -Best Selection Vol.6-')
  assert.equal(getCatalogueProductSetCode(
    { key: 'en:569115', code: 'OP15-EB04', name: 'Adventure on Kami’s Island' },
    'OP15-075',
  ), 'OP15-EB04')
  assert.equal(getCatalogueProductSetCode(
    { key: 'en:569801', name: 'Other Product Card' },
    'OP15-075',
  ), 'OP-15')

  const premiumPrinting = {
    id: 'op15-075-premium',
    cardNumber: 'OP15-075',
    setCode: getCatalogueProductSetCode(
      { key: 'en:src_a521deb08741', name: 'Premium Card Collection -Best Selection Vol.6-' },
      'OP15-075',
    ),
  }
  assert.deepEqual(filterCatalogueImageEntries([premiumPrinting], { set: 'OP-15' }), [])
  assert.deepEqual(filterCatalogueImageEntries([premiumPrinting], { set: premiumPrinting.setCode }).map((entry) => entry.id), ['op15-075-premium'])
})
