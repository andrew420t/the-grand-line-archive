import test from 'node:test'
import assert from 'node:assert/strict'
import { isDonCatalogueEntry } from '../src/admin/catalogueDonMetadata.js'

test('detects DON!! printings from rarity and source text', () => {
  assert.equal(isDonCatalogueEntry({ printing: { rarity: 'DON', variant: 'normal' } }), true)
  assert.equal(isDonCatalogueEntry({ printing: { source_text: 'DON!! Card (Nico Robin)' } }), true)
  assert.equal(isDonCatalogueEntry({ observation: { name: 'DON!! Card' } }), true)
})

test('does not misclassify ordinary cards as DON!!', () => {
  assert.equal(isDonCatalogueEntry({ printing: { rarity: 'SR', source_text: 'Luffy' }, card: { category: 'character' } }), false)
})
