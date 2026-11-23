const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const languageFamily = (value) => {
  const normalized = normalize(value)
  if (normalized.includes('japanese') || normalized === 'jp' || normalized === 'jpn') return 'jp'
  if (normalized.includes('english') || normalized === 'en' || normalized === 'eng') return 'en'
  return ''
}

export function rankCatalogueMatches(matches = [], detectedName = '', detectedLanguage = '', rememberedId = '', numberEvidence = {}) {
  const name = normalize(detectedName)
  const language = languageFamily(detectedLanguage)
  return matches.map((match) => {
    const candidateName = normalize(match.name)
    const nameMatch = Boolean(name && candidateName && (candidateName.includes(name) || name.includes(candidateName)))
    const languageMatch = Boolean(language && languageFamily(match.language) === language)
    return {
      match,
      nameMatch,
      languageMatch,
      remembered: match.id === rememberedId,
      numberEvidence: numberEvidence[match.cardNumber] || null,
    }
  }).sort((a, b) =>
    // Printed-number evidence is the primary identity signal; name/language
    // OCR and remembered images support it but must not override it.
    Number(Boolean(b.numberEvidence)) - Number(Boolean(a.numberEvidence)) ||
    (b.numberEvidence?.occurrences || 0) - (a.numberEvidence?.occurrences || 0) ||
    (b.numberEvidence?.confidence || 0) - (a.numberEvidence?.confidence || 0) ||
    Number(b.nameMatch) - Number(a.nameMatch) ||
    Number(b.languageMatch) - Number(a.languageMatch) ||
    Number(b.remembered) - Number(a.remembered),
  )
}
