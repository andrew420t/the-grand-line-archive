const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const languageFamily = (value) => {
  const normalized = normalize(value)
  if (normalized.startsWith('ja') || normalized.includes('japanese') || normalized === 'jp' || normalized === 'jpn') return 'jp'
  if (normalized.startsWith('en') || normalized.includes('english') || normalized === 'eng') return 'en'
  return ''
}

export function rankCatalogueMatches(matches = [], detectedName = '', detectedLanguage = '', rememberedId = '', numberEvidence = {}) {
  const name = normalize(detectedName)
  const language = languageFamily(detectedLanguage)
  return matches.map((match) => {
    const candidateName = normalize(match.name)
    const exactNameMatch = Boolean(name && candidateName && name === candidateName)
    const nameMatch = Boolean(name && candidateName && (candidateName.includes(name) || name.includes(candidateName)))
    const languageMatch = Boolean(language && languageFamily(match.language) === language)
    return {
      match,
      exactNameMatch,
      nameMatch,
      languageMatch,
      remembered: match.id === rememberedId,
      numberEvidence: numberEvidence[match.cardNumber] || null,
    }
  }).sort((a, b) =>
    Number(Boolean(b.numberEvidence)) - Number(Boolean(a.numberEvidence)) ||
    (b.numberEvidence?.occurrences || 0) - (a.numberEvidence?.occurrences || 0) ||
    (b.numberEvidence?.confidence || 0) - (a.numberEvidence?.confidence || 0) ||
    Number(b.exactNameMatch) - Number(a.exactNameMatch) ||
    Number(b.nameMatch) - Number(a.nameMatch) ||
    Number(b.languageMatch) - Number(a.languageMatch) ||
    Number(b.remembered) - Number(a.remembered),
  )
}
