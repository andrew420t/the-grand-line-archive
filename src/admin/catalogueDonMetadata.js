/**
 * Map the Koala Kollect DON!! source-set catalogue to printing keys.
 * This source records the originating product/set separately from card numbers.
 */
export function donSetSlugToCode(slug) {
  const value = String(slug || '').trim().toUpperCase()
  if (!value) return ''
  if (value === 'PROMO') return 'PROMO'
  if (/^(OP|EB|ST|PRB)-?\d{2}$/.test(value)) return value.replace(/^(OP|EB|ST|PRB)-?(\d{2})$/, '$1$2')
  if (/^OP\d{2}-EB\d{2}$/.test(value)) return value
  if (/^DP-?\d{2}$/.test(value)) return value.replace(/^DP-?(\d{2})$/, 'DP-$1')
  return value
}

export function buildDonSetIndex(rows = []) {
  const index = {}
  for (const row of rows || []) {
    const setCode = donSetSlugToCode(row?.set_slug)
    if (!setCode) continue
    for (const printingKey of row?.printing_keys || []) {
      if (!printingKey || index[printingKey]) continue
      index[printingKey] = {
        set_code: setCode,
        set_slug: row.set_slug || '',
        don_design: row.don_design || '',
        source: row.source || '',
        source_note: 'Koala Kollect DON!! source-set data',
      }
    }
  }
  return index
}
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
