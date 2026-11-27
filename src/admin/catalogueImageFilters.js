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
    cardNumber = '',
    sortBy = 'card-number-asc',
    language = 'all',
    set = 'all',
    rarity = 'all',
    cardType = 'all',
    color = 'all',
    variant = 'all',
    imageStatus = 'all',
  } = filters
  const normalize = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const normalizedQuery = normalize(query)
  const normalizedCardNumber = normalize(cardNumber)
  const filtered = entries.filter((entry) => {
    if (normalizedCardNumber && !normalize(entry.cardNumber).includes(normalizedCardNumber)) return false
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
    return normalize(entry.cardNumber).includes(normalizedQuery)
      || normalize(entry.name).includes(normalizedQuery)
      || normalize(entry.setCode).includes(normalizedQuery)
      || normalize(entry.setName).includes(normalizedQuery)
      || (entry.setCodes || []).some((value) => normalize(value).includes(normalizedQuery))
      || normalize(entry.sourceText).includes(normalizedQuery)
  })
  if (sortBy === 'card-number-asc' || sortBy === 'card-number-desc') {
    const direction = sortBy === 'card-number-desc' ? -1 : 1
    return filtered.sort((a, b) => {
      const numberOrder = String(a.cardNumber || '').localeCompare(String(b.cardNumber || ''), undefined, { numeric: true, sensitivity: 'base' })
      if (numberOrder) return numberOrder * direction
      return String(a.languageCode || '').localeCompare(String(b.languageCode || ''))
        || String(a.variant || '').localeCompare(String(b.variant || ''))
        || String(a.id || '').localeCompare(String(b.id || ''))
    })
  }
  return filtered
}
