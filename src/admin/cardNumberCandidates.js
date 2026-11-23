const CARD_NUMBER_PATTERN = /\b(O?P|0P|EB|E8|ST|5T|PRB|PR8)\s*[-–— ]?\s*([O0-9]{1,3})\s*[-–—]\s*([O0-9]{3})\b/gi
const PROMO_NUMBER_PATTERN = /\bP\s*[-–—]\s*([O0-9]{3})\b/gi

function normalizeCandidate(prefix, rawSet, rawNumber) {
  const normalizedPrefix = prefix.toUpperCase()
    .replace(/^0P$/, 'OP')
    .replace(/^E8$/, 'EB')
    .replace(/^5T$/, 'ST')
    .replace(/^PR8$/, 'PRB')
  let setNumber = rawSet.toUpperCase().replace(/O/g, '0')
  if (setNumber.length === 3 && setNumber.startsWith('0')) setNumber = setNumber.slice(1)
  if (!/^\d{1,2}$/.test(setNumber)) return ''
  const cardNumber = rawNumber.toUpperCase().replace(/O/g, '0')
  if (!/^\d{3}$/.test(cardNumber)) return ''
  return `${normalizedPrefix}${setNumber.padStart(2, '0')}-${cardNumber}`
}

export function extractCardNumberCandidates(readings = []) {
  const candidates = new Map()
  for (const reading of readings) {
    const text = String(reading.text || '')
    const addCandidate = (number) => {
      if (!number) return
      const existing = candidates.get(number) || {
        number,
        occurrences: 0,
        confidenceTotal: 0,
        sources: [],
      }
      existing.occurrences += 1
      existing.confidenceTotal += Math.max(0, Math.min(100, Number(reading.confidence) || 0))
      existing.sources.push(reading.label || 'OCR')
      candidates.set(number, existing)
    }
    CARD_NUMBER_PATTERN.lastIndex = 0
    let match
    while ((match = CARD_NUMBER_PATTERN.exec(text))) {
      addCandidate(normalizeCandidate(match[1], match[2], match[3]))
    }
    PROMO_NUMBER_PATTERN.lastIndex = 0
    while ((match = PROMO_NUMBER_PATTERN.exec(text))) {
      const cardNumber = match[1].toUpperCase().replace(/O/g, '0')
      if (/^\d{3}$/.test(cardNumber)) addCandidate(`P-${cardNumber}`)
    }
  }
  return [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      confidence: candidate.occurrences
        ? Math.round(candidate.confidenceTotal / candidate.occurrences)
        : 0,
    }))
    .sort((a, b) =>
      b.occurrences - a.occurrences ||
      b.confidence - a.confidence ||
      a.number.localeCompare(b.number),
    )
}
