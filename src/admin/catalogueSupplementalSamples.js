import { buildCatalogueImageProxyUrl } from './catalogueImageReference.js'
import { getOp18SupplementalMatches } from './op18OfficialCatalogue.js'

/**
 * Small, explicitly labelled supplemental sample catalogue for recent sets that
 * are not yet present in the upstream Koala Kollect snapshot.
 *
 * These are scanner smoke-test samples only, NOT a complete set catalogue.
 * Keep source card-list URLs, language, set, and image identity explicit.
 */
export const SUPPLEMENTAL_SAMPLE_CARDS = [
  {
    cardNumber: 'OP18-001', name: 'Karoo', rarity: 'L', category: 'Leader',
    language: 'English', languageCode: 'en', setCode: 'OP-18',
    imageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-001.png?261016=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'OP18-002', name: 'Igaram', rarity: 'UC', category: 'Character',
    language: 'English', languageCode: 'en', setCode: 'OP-18',
    imageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP18-002.png?261016=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'OP18-001', name: 'カルー', rarity: 'L', category: 'Leader',
    language: 'Japanese', languageCode: 'jp', setCode: 'OP-18',
    imageUrl: 'https://www.onepiece-cardgame.com/images/cardlist/card/OP18-001.png?261113=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'OP18-002', name: 'イガラム', rarity: 'UC', category: 'Character',
    language: 'Japanese', languageCode: 'jp', setCode: 'OP-18',
    imageUrl: 'https://www.onepiece-cardgame.com/images/cardlist/card/OP18-002.png?261113=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'EB05-001', name: 'Jewelry Bonney', rarity: 'SR', category: 'Character',
    language: 'English', languageCode: 'en', setCode: 'EB-05',
    imageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/EB05-001.png?261016=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'EB05-002', name: 'Doll', rarity: 'R', category: 'Character',
    language: 'English', languageCode: 'en', setCode: 'EB-05',
    imageUrl: 'https://en.onepiece-cardgame.com/images/cardlist/card/EB05-002.png?261016=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'EB05-001', name: 'ジュエリー・ボニー', rarity: 'SR', category: 'Character',
    language: 'Japanese', languageCode: 'jp', setCode: 'EB-05',
    imageUrl: 'https://www.onepiece-cardgame.com/images/cardlist/card/EB05-001.png?261113=',
    source: 'Bandai official card-list sample supplement',
  },
  {
    cardNumber: 'EB05-002', name: 'ドール', rarity: 'R', category: 'Character',
    language: 'Japanese', languageCode: 'jp', setCode: 'EB-05',
    imageUrl: 'https://www.onepiece-cardgame.com/images/cardlist/card/EB05-002.png?261113=',
    source: 'Bandai official card-list sample supplement',
  },
]

export function getSupplementalSampleMatches(cardNumber) {
  const normalized = String(cardNumber || '').toUpperCase().replace(/\s+/g, '').replace(/_/g, '-')
  const legacySamples = SUPPLEMENTAL_SAMPLE_CARDS
    .filter((sample) => sample.cardNumber === normalized)
    .map((sample) => ({
      id: 'supplemental-sample:' + sample.languageCode + ':' + sample.setCode + ':' + sample.cardNumber,
      cardKey: '',
      printingKey: '',
      cardNumber: sample.cardNumber,
      name: sample.name,
      language: sample.language,
      languageCode: sample.languageCode,
      category: sample.category,
      colors: '',
      cost: '',
      life: '',
      power: '',
      counter: '',
      attributes: '',
      traits: '',
      effect: '',
      trigger: '',
      rarity: sample.rarity,
      variant: 'Base',
      variantLabel: 'Base',
      imageUrl: buildCatalogueImageProxyUrl(sample.imageUrl) || sample.imageUrl,
      imageUrls: [buildCatalogueImageProxyUrl(sample.imageUrl, sample.languageCode), sample.imageUrl].filter(Boolean),
      fallbackImageUrl: sample.imageUrl,
      sourceText: 'Supplemental scanner sample only; upstream catalogue is stale for this set.',
      setCode: sample.setCode,
      setName: sample.setCode + ' supplemental sample',
      productKind: 'sample',
      releaseDate: '',
      sourceUrl: '',
      blockIcon: '',
      source: sample.source,
      officialCardlistUrl: '',
      supplementalSample: true,
    }))
  return [...legacySamples, ...getOp18SupplementalMatches(normalized)]
}
