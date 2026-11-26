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
  }).sort((a, b) => {
    const strongNumberDifference = Number(b.strongNumberEvidence) - Number(a.strongNumberEvidence)
    if (strongNumberDifference) return strongNumberDifference
    // Only compare strength metrics when both candidates have strong evidence.
    if (a.strongNumberEvidence && b.strongNumberEvidence) {
      const occurrenceDifference = (b.numberEvidence?.occurrences || 0) - (a.numberEvidence?.occurrences || 0)
      if (occurrenceDifference) return occurrenceDifference
      const confidenceDifference = (b.numberEvidence?.confidence || 0) - (a.numberEvidence?.confidence || 0)
      if (confidenceDifference) return confidenceDifference
    }
    return Number(b.exactNameMatch) - Number(a.exactNameMatch) ||
      Number(b.nameMatch) - Number(a.nameMatch) ||
      Number(Boolean(b.numberEvidence)) - Number(Boolean(a.numberEvidence)) ||
      Number(b.languageMatch) - Number(a.languageMatch) ||
      Number(b.remembered) - Number(a.remembered)
  })
}

export function chooseRememberedImageMatch(localImage, sharedImage, cardNumber) {
  const expectedNumber = String(cardNumber || '').trim().toUpperCase()
  if (!expectedNumber) return null

  const candidates = [
    { image: localImage, source: 'local' },
    { image: sharedImage, source: 'shared' },
  ].filter(({ image }) => (
    image?.printingId &&
    String(image.cardNumber || '').trim().toUpperCase() === expectedNumber
  ))

  if (!candidates.length) return null
  return candidates.reduce((best, candidate) => {
    const score = Number.isFinite(Number(candidate.image.similarity))
      ? Number(candidate.image.similarity)
      : -1
    const bestScore = Number.isFinite(Number(best.image.similarity))
      ? Number(best.image.similarity)
      : -1
    return score > bestScore ? candidate : best
  })
}
