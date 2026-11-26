export function getCatalogueImageFilterOptions(entries = []) {
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  return {
    languages: unique(entries.map((entry) => entry.languageCode)),
    sets: unique(entries.flatMap((entry) => [entry.setCode, ...(entry.setCodes || [])])),
    rarities: unique(entries.map((entry) => entry.rarity)),
    cardTypes: unique(entries.map((entry) => entry.category)),
    colors: unique(entries.flatMap((entry) => entry.colorValues || [])),
    variants: unique(entries.map((entry) => entry.variant)),
  }
}

export function filterCatalogueImageEntries(entries = [], filters = {}) {
  const {
    query = '',
    language = 'all',
    set = 'all',
    rarity = 'all',
    cardType = 'all',
    color = 'all',
    variant = 'all',
    imageStatus = 'all',
  } = filters
  const normalizedQuery = String(query || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return entries.filter((entry) => {
    if (language !== 'all' && entry.languageCode !== language) return false
    if (set !== 'all' && entry.setCode !== set && !(entry.setCodes || []).includes(set)) return false
    if (rarity !== 'all' && entry.rarity !== rarity) return false
    if (cardType !== 'all' && entry.category !== cardType) return false
    if (color !== 'all' && !(entry.colorValues || []).some((value) => String(value).toLowerCase() === String(color).toLowerCase())) return false
    if (variant !== 'all' && entry.variant !== variant) return false
    if (imageStatus === 'missing' && entry.imageStatus !== 'missing') return false
    if (imageStatus === 'available' && entry.imageStatus === 'missing') return false
    if (imageStatus === 'fallback' && entry.imageStatus !== 'fallback') return false
    if (!normalizedQuery) return true
    const normalize = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    return normalize(entry.cardNumber).includes(normalizedQuery)
      || normalize(entry.name).includes(normalizedQuery)
      || normalize(entry.setCode).includes(normalizedQuery)
      || normalize(entry.setName).includes(normalizedQuery)
      || (entry.setCodes || []).some((value) => normalize(value).includes(normalizedQuery))
      || normalize(entry.sourceText).includes(normalizedQuery)
  })
}
