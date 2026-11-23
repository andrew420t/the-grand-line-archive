const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const languageFamily = (value) => {
  const normalized = normalize(value)
  if (normalized.includes('japanese') || normalized === 'jp' || normalized === 'jpn') return 'jp'
  if (normalized.includes('english') || normalized === 'en' || normalized === 'eng') return 'en'
  return ''
}

export function rankCatalogueMatches(matches = [], detectedName = '', detectedLanguage = '', rememberedId = '') {
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
    }
  }).sort((a, b) =>
    Number(b.remembered) - Number(a.remembered) ||
    Number(b.nameMatch) - Number(a.nameMatch) ||
    Number(b.languageMatch) - Number(a.languageMatch),
  )
}
