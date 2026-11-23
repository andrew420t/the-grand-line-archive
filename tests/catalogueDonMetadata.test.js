import test from 'node:test'
import assert from 'node:assert/strict'
import { isDonCatalogueEntry, buildDonSetIndex, donSetSlugToCode } from '../src/admin/catalogueDonMetadata.js'

test('detects DON!! printings from rarity and source text', () => {
  assert.equal(isDonCatalogueEntry({ printing: { rarity: 'DON', variant: 'normal' } }), true)
  assert.equal(isDonCatalogueEntry({ printing: { source_text: 'DON!! Card (Nico Robin)' } }), true)
  assert.equal(isDonCatalogueEntry({ observation: { name: 'DON!! Card' } }), true)
})

test('recognizes DON category labels with punctuation and spacing', () => {
  assert.equal(isDonCatalogueEntry({ card: { category: 'DON!!' } }), true)
  assert.equal(isDonCatalogueEntry({ observation: { category: 'D O N !!' } }), true)
  assert.equal(isDonCatalogueEntry({ card: { category: 'don card' } }), true)
  assert.equal(isDonCatalogueEntry({ observation: { category: 'DON cards' } }), true)
  assert.equal(isDonCatalogueEntry({ card: { category: 'donquixote' } }), false)
})

test('does not misclassify ordinary cards as DON!!', () => {
  assert.equal(isDonCatalogueEntry({ printing: { rarity: 'SR', source_text: 'Luffy' }, card: { category: 'character' } }), false)
})

test('normalizes DON!! source set slugs to display codes', () => {
  assert.equal(donSetSlugToCode('op-01'), 'OP01')
  assert.equal(donSetSlugToCode('eb-03'), 'EB03')
  assert.equal(donSetSlugToCode('prb-02'), 'PRB02')
  assert.equal(donSetSlugToCode('op14-eb04'), 'OP14-EB04')
  assert.equal(donSetSlugToCode('op15-eb04'), 'OP15-EB04')
  assert.equal(donSetSlugToCode('dp-02'), 'DP-02')
  assert.equal(donSetSlugToCode('dp-09'), 'DP-09')
  assert.equal(donSetSlugToCode('promo'), 'PROMO')
})

test('maps printing keys to their source set without guessing', () => {
  const index = buildDonSetIndex([
    { printing_keys: ['print-a', 'print-b'], set_slug: 'prb-01', don_design: 'PRB-01:don-card-luffy', source: 'group' },
    { printing_keys: ['print-c'], set_slug: 'dp-09', source: 'override' },
    { printing_keys: ['print-empty'], set_slug: '' },
  ])
  assert.equal(index['print-a'].set_code, 'PRB01')
  assert.equal(index['print-b'].source_note, 'Koala Kollect DON!! source-set data')
  assert.equal(index['print-c'].set_code, 'DP-09')
  assert.equal(index['print-empty'], undefined)
})

test('normalizes all observed upstream DON!! source-set slug formats', () => {
  const observedSlugs = {
    'dp-02': 'DP-02', 'dp-03': 'DP-03', 'dp-04': 'DP-04', 'dp-05': 'DP-05',
    'dp-06': 'DP-06', 'dp-07': 'DP-07', 'dp-08': 'DP-08', 'dp-09': 'DP-09',
    'dp-10': 'DP-10', 'dp-11': 'DP-11', 'dp-12': 'DP-12',
    'eb-03': 'EB03',
    'op-01': 'OP01', 'op-02': 'OP02', 'op-03': 'OP03', 'op-04': 'OP04',
    'op-05': 'OP05', 'op-06': 'OP06', 'op-07': 'OP07', 'op-08': 'OP08',
    'op-09': 'OP09', 'op-10': 'OP10', 'op-11': 'OP11', 'op-12': 'OP12',
    'op-13': 'OP13', 'op-16': 'OP16', 'op-17': 'OP17',
    'op14-eb04': 'OP14-EB04', 'op15-eb04': 'OP15-EB04',
    'prb-01': 'PRB01', 'prb-02': 'PRB02',
    'promo': 'PROMO',
    'st-01': 'ST01', 'st-10': 'ST10', 'st-21': 'ST21',
  }
  for (const [slug, expected] of Object.entries(observedSlugs)) {
    assert.equal(donSetSlugToCode(slug), expected, slug)
  }
})
