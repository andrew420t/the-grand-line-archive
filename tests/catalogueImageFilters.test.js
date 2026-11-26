import assert from 'node:assert/strict'
import test from 'node:test'
import { filterCatalogueImageEntries, getCatalogueImageFilterOptions } from '../src/admin/catalogueImageFilters.js'

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
})

test('exposes only filter values supported by actual catalogue entries', () => {
  const options = getCatalogueImageFilterOptions(entries)
  assert.deepEqual(options.languages, ['cn', 'en', 'jp', 'tcgcsv'])
  assert.deepEqual(options.sets, ['OP-12', 'PRB-01'])
  assert.deepEqual(options.rarities, ['P', 'R', 'UC'])
  assert.deepEqual(options.cardTypes, ['Character', 'Event'])
  assert.deepEqual(options.colors, ['Blue', 'Red'])
  assert.deepEqual(options.variants, ['base', 'parallel', 'stamped'])
})
