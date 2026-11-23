/**
 * Identify DON!! catalogue entries even though the official card list does not
 * assign them standard card numbers. Set attribution is kept separate and is
 * only shown when a product link exists; never guess a DON!! source set.
 */
export function isDonCatalogueEntry({ printing, card, observation } = {}) {
  const rarity = String(printing?.rarity || '').toUpperCase()
  const sourceText = String(printing?.source_text || '').toUpperCase()
  const category = String(observation?.category || card?.category || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  const name = String(observation?.name || '').toUpperCase()
  return rarity === 'DON' || category === 'don' || /DON\s*!{1,2}/.test(sourceText) || name.includes('DON!!')
}
