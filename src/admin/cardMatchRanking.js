const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const languageFamily = (value) => {
  const normalized = normalize(value)
  if (normalized.startsWith('ja') || normalized.includes('japanese') || normalized === 'jp' || normalized === 'jpn') return 'jp'
  if (normalized.startsWith('en') || normalized.includes('english') || normalized === 'eng') return 'en'
  return ''
}

const hasStrongNumberEvidence = (evidence) => Boolean(evidence && (
  (evidence.occurrences || 0) >= 2 || (evidence.confidence || 0) >= 60
))

export function rankCatalogueMatches(matches = [], detectedName = '', detectedLanguage = '', rememberedId = '', numberEvidence = {}) {
  const name = normalize(detectedName)
  const language = languageFamily(detectedLanguage)
  return matches.map((match) => {
    const candidateName = normalize(match.name)
    const exactNameMatch = Boolean(name && candidateName && name === candidateName)
    const nameMatch = Boolean(name && candidateName && (candidateName.includes(name) || name.includes(candidateName)))
    const languageMatch = Boolean(language && languageFamily(match.language) === language)
    const evidence = numberEvidence[match.cardNumber] || null
    return {
      match,
      exactNameMatch,
      nameMatch,
      languageMatch,
      remembered: match.id === rememberedId,
      numberEvidence: evidence,
      strongNumberEvidence: hasStrongNumberEvidence(evidence),
    }
  }).sort((a, b) =>
    Number(b.strongNumberEvidence) - Number(a.strongNumberEvidence) ||
    (b.numberEvidence?.occurrences || 0) - (a.numberEvidence?.occurrences || 0) ||
    (b.numberEvidence?.confidence || 0) - (a.numberEvidence?.confidence || 0) ||
    Number(b.exactNameMatch) - Number(a.exactNameMatch) ||
    Number(b.nameMatch) - Number(a.nameMatch) ||
    Number(Boolean(b.numberEvidence)) - Number(Boolean(a.numberEvidence)) ||
    Number(b.languageMatch) - Number(a.languageMatch) ||
    Number(b.remembered) - Number(a.remembered),
  )
}
