import { OP18_OFFICIAL_PRINTINGS } from './op18OfficialCatalogue.js'
import { EB05_OFFICIAL_PRINTINGS } from './eb05OfficialCatalogue.js'
import { buildOfficialImageProxyUrl } from './catalogueImageReference.js'

const LANGUAGES = ['en', 'jp']

function officialDirectImageUrl(imageId, language) {
  const host = language === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
  return host + '/images/cardlist/card/' + encodeURIComponent(imageId) + '.png'
}

/**
 * Return complete official supplement rows using Bandai's per-language
 * identifiers and metadata. Do not fall back to shared English fields.
 */
export function getOfficialSupplementReferenceTestItems() {
  const items = []

  for (const language of LANGUAGES) {
    const isJapanese = language === 'jp'

    for (const printing of OP18_OFFICIAL_PRINTINGS) {
      const imageId = isJapanese ? printing.imageIdJp : printing.imageIdEn
      const cardNumber = isJapanese ? printing.cardNumberJp : printing.cardNumberEn
      const name = isJapanese ? printing.nameJp : printing.nameEn
      const rarity = isJapanese ? printing.rarityJp : printing.rarityEn
      const variant = isJapanese ? printing.variantLabelJp : printing.variantLabelEn
      if (!imageId || !cardNumber || !name || !rarity || !variant) continue

      const imageUrl = buildOfficialImageProxyUrl(imageId, language) || officialDirectImageUrl(imageId, language)
      const fallbackImageUrl = imageId !== cardNumber ? buildOfficialImageProxyUrl(cardNumber, language) : ''
      items.push({
        id: 'op18-complete:' + language + ':' + imageId,
        printingKey: 'op18:' + language + ':' + imageId,
        imageId,
        cardNumber,
        name,
        language,
        targetSet: 'OP-18',
        setCode: 'OP-18',
        setName: 'The Dominance of God [OP-18]',
        rarity,
        variant,
        category: printing.category || '',
        imageUrl,
        fallbackImageUrl,
        source: 'Bandai official OP-18 ' + variant + ' artwork',
        supplementalOfficial: true,
      })
    }

    for (const printing of EB05_OFFICIAL_PRINTINGS) {
      const imageId = isJapanese ? printing.imageIdJp : printing.imageIdEn
      const cardNumber = printing.cardNumber
      const name = isJapanese ? printing.japaneseName : printing.name
      const rarity = isJapanese ? printing.rarityJp : printing.rarityEn
      const variant = isJapanese ? printing.variantLabelJp : printing.variantLabelEn
      if (!imageId || !cardNumber || !name || !rarity || !variant) continue

      const imageUrl = buildOfficialImageProxyUrl(imageId, language) || officialDirectImageUrl(imageId, language)
      const fallbackImageUrl = imageId !== cardNumber ? buildOfficialImageProxyUrl(cardNumber, language) : ''
      items.push({
        id: 'eb05-complete:' + language + ':' + imageId,
        printingKey: 'eb05:' + language + ':' + imageId,
        imageId,
        cardNumber,
        name,
        language,
        targetSet: 'EB-05',
        setCode: 'EB-05',
        setName: 'ONE PIECE Heroines Edition vol.2 [EB-05]',
        rarity,
        variant,
        category: printing.category || '',
        imageUrl,
        fallbackImageUrl,
        source: 'Bandai official EB-05 ' + variant + ' artwork',
        supplementalOfficial: true,
      })
    }
  }

  return items
}
