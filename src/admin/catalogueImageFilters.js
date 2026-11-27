export function getCardNumberSetCode(cardNumber = '') {
  const match = String(cardNumber || '').trim().toUpperCase().match(/^((?:OP|EB|ST|PRB)\d{2}|P)-\d{3}/)
  if (!match) return ''
  return match[1].replace(/^(OP|EB|ST|PRB)(\d{2})$/, '$1-$2')
}

const normalizeCardNumber = (value = '') => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
const normalizeText = (value = '') => String(value || '').toLocaleLowerCase().trim()

export function getCatalogueImageFilterOptions(entries = []) {
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  return {
    languages: unique(entries.map((entry) => entry.languageCode)),
    sets: unique(entries.flatMap((entry) => [entry.setCode, ...(entry.setCodes || [])])),
    cardNumberSets: unique(entries.map((entry) => entry.cardNumberSet || getCardNumberSetCode(entry.cardNumber))),
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
    cardNumberSet = 'all',
    rarity = 'all',
    cardType = 'all',
    color = 'all',
    variant = 'all',
    imageStatus = 'all',
  } = filters
  const normalizedQuery = normalizeText(query)
  const normalizedCardNumber = normalizeCardNumber(cardNumber)
  const filtered = entries.filter((entry) => {
    // A dedicated card-number field is an exact identifier lookup. Do not let
    // a partial or similar number leak unrelated printings into the result.
    if (normalizedCardNumber && normalizeCardNumber(entry.cardNumber) !== normalizedCardNumber) return false
    if (language !== 'all' && entry.languageCode !== language) return false
    if (set !== 'all' && entry.setCode !== set && !(entry.setCodes || []).includes(set)) return false
    if (cardNumberSet !== 'all' && (entry.cardNumberSet || getCardNumberSetCode(entry.cardNumber)) !== cardNumberSet) return false
    if (rarity !== 'all' && entry.rarity !== rarity) return false
    if (cardType !== 'all' && entry.category !== cardType) return false
    if (color !== 'all' && !(entry.colorValues || []).some((value) => normalizeText(value) === normalizeText(color))) return false
    if (variant !== 'all' && entry.variant !== variant) return false
    if (imageStatus === 'missing' && entry.imageStatus !== 'missing') return false
    if (imageStatus === 'available' && !['available', 'fallback'].includes(entry.imageStatus)) return false
    if (imageStatus === 'fallback' && entry.imageStatus !== 'fallback') return false
    if (!normalizedQuery) return true
    return normalizeText(entry.cardNumber).includes(normalizedQuery)
      || normalizeText(entry.name).includes(normalizedQuery)
      || normalizeText(entry.setCode).includes(normalizedQuery)
      || normalizeText(entry.setName).includes(normalizedQuery)
      || (entry.setCodes || []).some((value) => normalizeText(value).includes(normalizedQuery))
      || normalizeText(entry.sourceText).includes(normalizedQuery)
  })
  if (sortBy === 'card-number-asc' || sortBy === 'card-number-desc') {
    const direction = sortBy === 'card-number-desc' ? -1 : 1
    return filtered.sort((a, b) => {
      const numberOrder = String(a.cardNumber || '').localeCompare(String(b.cardNumber || ''), undefined, { numeric: true, sensitivity: 'base' })
      if (numberOrder) return numberOrder * direction
      return String(a.languageCode || '').localeCompare(String(b.languageCode || ''))
        || String(a.variant || '').localeCompare(String(b.variant || ''))
        || String(a.setCode || '').localeCompare(String(b.setCode || ''))
        || String(a.id || '').localeCompare(String(b.id || ''))
    })
  }
  return filtered
}

/** Collapse repeated links to the same product without merging distinct releases. */
export function dedupePrintingProducts(products = []) {
  const unique = new Map()
  for (const product of products) {
    if (!product) continue
    const key = product.key || product.id
    if (!key) continue
    if (!unique.has(key)) unique.set(key, product)
  }

  const linkedProducts = [...unique.values()]
  // Koala Kollect can link one printing to both a generic "Other Product Card"
  // placeholder and its named product. When a concrete product is present,
  // keep that identity and suppress only the generic placeholder. If it is the
  // sole link, retain it so the printing is not lost from the catalogue.
  const concreteProducts = linkedProducts.filter((product) =>
    String(product.name || '').trim().toLowerCase() !== 'other product card',
  )
  return concreteProducts.length ? concreteProducts : linkedProducts
}

/** Resolve a release-product identity without confusing it with the card-number set. */
export function getCatalogueProductSetCode(product, cardNumber = '') {
  const code = String(product?.code || '').trim()
  if (code) return code
  const name = String(product?.name || '').trim()
  if (name && name.toLowerCase() !== 'other product card') return name
  return getCardNumberSetCode(cardNumber)
}
