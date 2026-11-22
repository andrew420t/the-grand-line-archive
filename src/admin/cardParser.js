export const CARD_FIELDS = [
  ['name', 'Card name / character'],
  ['card_number', 'Card number'],
  ['set_code', 'Set code'],
  ['rarity', 'Rarity'],
  ['color', 'Colour'],
  ['power', 'Power'],
  ['cost', 'Cost'],
  ['card_type', 'Card type'],
  ['effect_text', 'Card effect / text'],
  ['language', 'Language'],
  ['classification', 'Classification'],
]

const emptyField = () => ({ value: '', confidence: 0, needsReview: true })

const matchConfidence = (value, lines) => {
  const line = lines.find((entry) =>
    entry.text.toLowerCase().includes(value.toLowerCase()),
  )
  const confidence = Number(line?.confidence)
  return Number.isFinite(confidence) ? Math.round(confidence) : 58
}

const makeField = (value, confidence) => ({
  value: value || '',
  confidence: value ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
  needsReview: !value || confidence < 82,
})

const capture = (text, expression) => {
  const match = text.match(expression)
  return match ? match[1].trim() : ''
}

const cleanLabel = (value) => value.replace(/^[\s:：-]+|[\s:：-]+$/g, '').trim()

const normalizeOcrCardNumberText = (source) => String(source || '').replace(
  /\b(O?P|EB|ST|PRB)\s*[- ]?([O0-9]{1,3})\s*[-–]\s*(\d{3})\b/gi,
  (_, prefix, rawSetNumber, cardNumber) => {
    let setNumber = rawSetNumber.toUpperCase().replace(/O/g, '0')
    // OCR sometimes reads a leading zero as an extra character (OP O02, EB0O1, PRB O1).
    if (setNumber.length === 3 && setNumber.startsWith('0')) setNumber = setNumber.slice(1)
    if (!/^\d{1,2}$/.test(setNumber)) return _
    return prefix.toUpperCase().replace(/^O?P$/, 'OP') + setNumber.padStart(2, '0') + '-' + cardNumber
  },
)

export function parseCardDetails(text, recognizedLines = []) {
  const source = String(text || '')
  const cardNumberSource = normalizeOcrCardNumberText(source)
  const lines = recognizedLines
    .map((line) => ({
      text: String(line.text || '').trim(),
      confidence: Number(line.confidence),
      y: Number(line.bbox?.y0),
    }))
    .filter((line) => line.text)
  const textLines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const availableLines = lines.length
    ? lines
    : textLines.map((line) => ({ text: line, confidence: 58, y: Number.NaN }))
  const fields = Object.fromEntries(CARD_FIELDS.map(([key]) => [key, emptyField()]))

  const cardNumber = capture(
    cardNumberSource.toUpperCase(),
    /\b((?:OP|EB|ST|PRB)\s*-?\s*\d{1,2}|P)\s*-\s*(\d{3})\b/i,
  )
  const fullCardNumber = cardNumber
    ? cardNumberSource.match(/\b((?:OP|EB|ST|PRB)\s*-?\s*\d{1,2}|P)\s*-\s*(\d{3})\b/i)?.[0]
    : ''
  if (fullCardNumber) {
    const normalized = fullCardNumber.toUpperCase().replace(/\s+/g, '').replace(/-/g, '-')
    const numberConfidence = matchConfidence(fullCardNumber, availableLines)
    fields.card_number = makeField(normalized, numberConfidence)
    const setCode = fullCardNumber.match(/^(OP|EB|ST|PRB)\s*-?\s*\d{1,2}|^(P)/i)?.[0]
    if (setCode) {
      const cleanSetCode = setCode.toUpperCase().replace(/\s+/g, '').replace(/-$/, '')
      fields.set_code = makeField(cleanSetCode, numberConfidence)
    }
  }

  const labeledName = capture(source, /\b(?:CARD\s+)?NAME\s*[:：]\s*([^\r\n]+)/i)
  let name = cleanLabel(labeledName)
  if (!name) {
    const nameCandidate = availableLines.find((line, index) => {
      const topLine = Number.isFinite(line.y) ? line.y < 450 : index < 5
      return (
        topLine &&
        /[A-Za-z]{2}/.test(line.text) &&
        line.text.length <= 42 &&
        !/\b(?:ONE PIECE CARD GAME|LEADER|CHARACTER|EVENT|STAGE|COST|POWER|COLOR|COLOUR|RARITY|EFFECT|COUNTER)\b/i.test(line.text) &&
        !/\b(?:OP|EB|ST|PRB)\s*-?\s*\d{1,2}\s*-\s*\d{3}\b/i.test(line.text)
      )
    })
    name = nameCandidate?.text || ''
  }
  if (name) fields.name = makeField(name, matchConfidence(name, availableLines))

  const labeledRarity = capture(
    source,
    /\b(?:RARITY|RARE)\s*[:：]\s*(SECRET\s+RARE|SUPER\s+RARE|UNCOMMON|COMMON|LEADER|SEC|SR|UC|C|R|L|SP|TR)\b/i,
  )
  const namedRarity = labeledRarity || capture(
    source,
    /\b(SECRET\s+RARE|SUPER\s+RARE|UNCOMMON|COMMON|SEC|SR|UC|SP|TR)\b/i,
  )
  if (namedRarity) {
    const rarity = namedRarity
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
    fields.rarity = makeField(rarity, matchConfidence(namedRarity, availableLines))
  }

  const color = capture(
    source,
    /\b(?:COLOR|COLOUR)\s*[:：]\s*(RED|GREEN|BLUE|PURPLE|BLACK|YELLOW|MULTI[- ]?COLOR)\b/i,
  )
  if (color) {
    const normalizedColor = color.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
    fields.color = makeField(normalizedColor, matchConfidence(color, availableLines))
  }

  for (const [field, label] of [['power', 'POWER'], ['cost', 'COST']]) {
    const value = capture(
      source,
      new RegExp(`\\b${label}\\s*[:：]?\\s*(\\d{1,5}|-)\\b`, 'i'),
    )
    if (value) fields[field] = makeField(value, matchConfidence(value, availableLines))
  }

  const type = capture(
    source,
    /\b(?:CARD\s+)?TYPE\s*[:：]\s*(LEADER|CHARACTER|EVENT|STAGE|DON!!?)\b/i,
  )
  if (type) {
    const cardType = type.toLowerCase()
    const normalizedType = cardType.replace(/\b\w/g, (letter) => letter.toUpperCase())
    const confidence = matchConfidence(type, availableLines)
    fields.card_type = makeField(normalizedType, confidence)
    if (['leader', 'character'].includes(cardType)) {
      fields.classification = makeField(normalizedType, confidence)
    }
  } else {
    const obviousType = availableLines.find((line) =>
      /^\s*(LEADER|CHARACTER|EVENT|STAGE|DON!!?)\s*$/i.test(line.text),
    )?.text
    if (obviousType) {
      const normalizedType = obviousType.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
      fields.card_type = makeField(
        normalizedType,
        matchConfidence(obviousType, availableLines),
      )
      if (['leader', 'character'].includes(obviousType.toLowerCase())) {
        fields.classification = makeField(
          normalizedType,
          matchConfidence(obviousType, availableLines),
        )
      }
    }
  }

  const labeledLanguage = capture(
    source,
    /\bLANGUAGE\s*[:：]\s*(ENGLISH|JAPANESE|KOREAN|CHINESE|EN|JP|KR|CN)\b/i,
  )
  if (labeledLanguage) {
    const languages = {
      en: 'English',
      english: 'English',
      jp: 'Japanese',
      japanese: 'Japanese',
      kr: 'Korean',
      korean: 'Korean',
      cn: 'Chinese',
      chinese: 'Chinese',
    }
    fields.language = makeField(
      languages[labeledLanguage.toLowerCase()],
      matchConfidence(labeledLanguage, availableLines),
    )
  } else if (/[ぁ-ゖァ-ヺ]/u.test(source)) {
    fields.language = makeField('Japanese', matchConfidence(source.match(/[ぁ-ゖァ-ヺ]/u)[0], availableLines))
  } else if (/[가-힣]/u.test(source)) {
    fields.language = makeField('Korean', matchConfidence(source.match(/[가-힣]/u)[0], availableLines))
  }

  const effectLines = availableLines.filter((line) =>
    /\b(?:ON PLAY|WHEN ATTACKING|YOUR TURN|OPPONENT'S TURN|COUNTER|BLOCKER|RUSH|BANISH|DOUBLE ATTACK|DON!! X)\b/i.test(line.text),
  )
  if (effectLines.length) {
    const effect = effectLines.map((line) => line.text).join('\n')
    const confidence =
      effectLines.reduce((total, line) => total + (Number(line.confidence) || 58), 0) /
      effectLines.length
    fields.effect_text = makeField(effect, confidence)
  }

  return fields
}
