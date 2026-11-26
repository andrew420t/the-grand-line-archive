import { buildOfficialBaseImageUrl, buildOfficialImageProxyUrl } from './catalogueImageReference.js'
import { getOfficialCardlistUrl } from './officialCardlistUrl.js'

const normalizeCardNumber = (value) => String(value || '')
  .toUpperCase()
  .replace(/\s+/g, '')
  .replace(/_/g, '-')
  .replace(/-+/g, '-')
  .replace(/^(OP|EB|ST|PRB)-(\d{2})-/, '$1$2-')
  .trim()

const normalizeSetCode = (value) => {
  const code = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (/^(OP|EB|ST|PRB)\d{2}$/.test(code)) return code.slice(0, -2) + '-' + code.slice(-2)
  if (/^OP\d{2}EB\d{2}$/.test(code)) return code.slice(0, 4) + '-' + code.slice(4)
  if (code === 'P' || code === 'PROMO') return 'PROMO'
  if (code === 'OTHER' || code === 'OTHERPRODUCT' || code === 'OTHERPRODUCTCARD') return 'OTHER PRODUCT'
  return String(value || '').trim()
}

/**
 * Return a conservative Bandai base-image reference when full printing
 * metadata is absent. Never invent a name, rarity, effect or variant identity.
 */
export function createOfficialImageOnlyMatch(cardNumber, language = 'en', requestedSetCode = '') {
  const normalizedNumber = normalizeCardNumber(cardNumber)
  const numberMatch = normalizedNumber.match(/^((?:OP|EB|ST|PRB)\d{2}|P)-(\d{3})$/)
  if (!numberMatch) return null

  const languageText = String(language || '').toLowerCase()
  const languageCode = languageText.startsWith('jp') || languageText.includes('japanese') ? 'jp'
    : languageText.startsWith('en') || languageText.includes('english') ? 'en' : ''
  if (!languageCode) return null

  const inferredSetCode = numberMatch[1] === 'P' ? 'PROMO' : normalizeSetCode(numberMatch[1])
  const setCode = normalizeSetCode(requestedSetCode) || inferredSetCode
  const languageLabel = languageCode === 'jp' ? 'Japanese' : 'English'
  const directImageUrl = buildOfficialBaseImageUrl(normalizedNumber, languageCode)
  const imageUrl = buildOfficialImageProxyUrl(normalizedNumber, languageCode)
  if (!imageUrl) return null

  return {
    id: 'official-image-only:' + languageCode + ':' + normalizedNumber + ':' + setCode.replace(/[^A-Z0-9]/g, ''),
    cardKey: '',
    printingKey: '',
    cardNumber: normalizedNumber,
    name: '',
    language: languageLabel,
    languageCode,
    category: '',
    colors: '',
    cost: '',
    life: '',
    power: '',
    counter: '',
    attributes: '',
    traits: '',
    effect: '',
    trigger: '',
    rarity: '',
    variant: 'Base image reference',
    variantLabel: '',
    imageUrl,
    imageUrls: [imageUrl, directImageUrl].filter(Boolean),
    fallbackImageUrl: directImageUrl,
    usesBaseImageFallback: true,
    usesAlternateOfficialFallback: false,
    sourceText: 'Official Bandai image reference only. Full card metadata is not available in the current local catalogue feed.',
    setCode,
    setName: 'Official Bandai card-list reference',
    productKind: 'reference-only',
    releaseDate: '',
    sourceUrl: '',
    blockIcon: '',
    source: 'Bandai official base-card image reference (exact printing/finish not verified)',
    officialCardlistUrl: getOfficialCardlistUrl(setCode, languageLabel, false, normalizedNumber),
    officialImageOnly: true,
  }
}
