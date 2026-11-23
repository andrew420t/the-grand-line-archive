export function selectPrimaryCatalogueMatch(matches = [], { language = '', printingKey = '', matchId = '', setCode = '', variantLabel = '' } = {}) {
  const requested = String(language || '').toLowerCase()
  const preferredCode = requested.startsWith('jp') || requested.includes('japanese') ? 'jp'
    : requested.startsWith('en') || requested.includes('english') ? 'en' : ''
  const withImages = matches.filter((match) => match.imageUrl)
  if (matchId) return withImages.find((match) => match.id === matchId) || null
  if (printingKey) {
    const exactPrinting = withImages.filter((match) => match.printingKey === printingKey)
    return exactPrinting.find((match) => preferredCode && match.languageCode === preferredCode)
      || exactPrinting[0]
      || null
  }
  if (setCode || variantLabel) {
    const normalizeSet = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const normalizeVariant = (value) => {
      const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      return ['', 'normal', 'base', 'regular'].includes(normalized) ? 'normal' : normalized
    }
    // A set-only product defaults to the normal/base printing rather than
    // accidentally showing a parallel/alternate variant from the same set.
    const requestedVariant = variantLabel || (setCode ? 'normal' : '')
    const exactIdentity = withImages.filter((match) => {
      const candidateSet = match.setCode || match.set_code || match.sourceSetCode || ''
      const candidateVariant = match.variantLabel || match.variant || match.rarityLabel || ''
      return (!setCode || normalizeSet(candidateSet) === normalizeSet(setCode)) &&
        (!requestedVariant || normalizeVariant(candidateVariant) === normalizeVariant(requestedVariant))
    })
    return exactIdentity.find((match) => preferredCode && match.languageCode === preferredCode)
      || exactIdentity[0]
      || null
  }
  // Legacy products without exact printing identity may use a generic catalogue
  // reference, but known identity fields never silently fall back to another variant.
  return withImages.find((match) => preferredCode && match.languageCode === preferredCode)
    || withImages.find((match) => match.languageCode === 'en')
    || withImages[0]
    || null
}
