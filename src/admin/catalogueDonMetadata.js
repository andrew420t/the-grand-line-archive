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
      if (!printingKey) continue
      const existing = index[printingKey] || {
        set_code: '',
        set_codes: [],
        set_slugs: [],
        don_designs: [],
        sources: [],
        source_note: 'Koala Kollect DON!! source-set data',
      }
      if (!existing.set_codes.includes(setCode)) existing.set_codes.push(setCode)
      if (row.set_slug && !existing.set_slugs.includes(row.set_slug)) existing.set_slugs.push(row.set_slug)
      if (row.don_design && !existing.don_designs.includes(row.don_design)) existing.don_designs.push(row.don_design)
      if (row.source && !existing.sources.includes(row.source)) existing.sources.push(row.source)
      // A single set is safe to present as the primary attribution. If the
      // source links one printing to multiple products, keep all links and
      // leave set_code blank rather than silently choosing the first one.
      existing.set_code = existing.set_codes.length === 1 ? existing.set_codes[0] : ''
      existing.set_slug = existing.set_slugs.length === 1 ? existing.set_slugs[0] : ''
      existing.don_design = existing.don_designs.length === 1 ? existing.don_designs[0] : ''
      existing.source = existing.sources.length === 1 ? existing.sources[0] : ''
      index[printingKey] = existing
    }
  }
  return index
}
/**
 * Identify DON!! catalogue entries even though the official card list does not
 * assign them standard card numbers. Attribution comes from the source DON!!
 * dataset or an explicit admin correction; otherwise it remains unassigned.
 */
export function isDonCatalogueEntry({ printing, card, observation } = {}) {
  const rarity = String(printing?.rarity || '').toUpperCase()
  const sourceText = String(printing?.source_text || '').toUpperCase()
  const category = String(observation?.category || card?.category || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  const name = String(observation?.name || '').toUpperCase()
  return rarity === 'DON' || ['don', 'doncard', 'doncards'].includes(category) || /DON\s*!{1,2}/.test(sourceText) || name.includes('DON!!')
}
