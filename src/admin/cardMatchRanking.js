const normalize = (value) => String(value || '').trim().toLowerCase()

export function rankCatalogueMatches(matches = [], detectedName = '', detectedLanguage = '', rememberedId = '') {
  const name = normalize(detectedName)
  const language = normalize(detectedLanguage)
  return matches.map((match) => {
    const nameMatch = Boolean(name && normalize(match.name) === name)
    const languageMatch = Boolean(language && normalize(match.language).includes(language))
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
