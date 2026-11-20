const DATA_ROOT = 'https://raw.githubusercontent.com/hotavocado/koala-kollect-data/main/data'
const LANGUAGES = ['en', 'jp']
const CACHE_TTL = 6 * 60 * 60 * 1000

let cataloguePromise
let loadedAt = 0

const normalizeCardNumber = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .trim()

const baseCardNumber = (value) => {
  const normalized = normalizeCardNumber(value)
  return normalized.match(/^(?:(?:OP|EB|ST|PRB)\d{1,2}|P)-\d{3}/)?.[0] || ''
}

async function readJsonLines(path) {
  const response = await fetch(`${DATA_ROOT}/${path}`, {
    headers: { Accept: 'text/plain' },
    cache: 'no-cache',
  })
  if (!response.ok) throw new Error(`Card reference data unavailable (${path}, HTTP ${response.status}).`)
  const text = await response.text()
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

async function loadCatalogue() {
  const [cards, ...languageData] = await Promise.all([
    readJsonLines('cards.jsonl'),
    ...LANGUAGES.flatMap((language) => [
      readJsonLines(`card_observations/${language}.jsonl`),
      readJsonLines(`printings/${language}.jsonl`),
      readJsonLines(`printing_locators/${language}.jsonl`),
      readJsonLines(`products/${language}.jsonl`),
      readJsonLines(`printing_products/${language}.jsonl`),
    ]),
  ])

  const languages = {}
  LANGUAGES.forEach((language, index) => {
    const offset = index * 5
    languages[language] = {
      observations: languageData[offset],
      printings: languageData[offset + 1],
      locators: languageData[offset + 2],
      products: languageData[offset + 3],
      printingProducts: languageData[offset + 4],
    }
  })
  return { cards, languages }
}

async function getCatalogue() {
  if (!cataloguePromise || Date.now() - loadedAt > CACHE_TTL) {
    cataloguePromise = loadCatalogue()
      .then((catalogue) => {
        loadedAt = Date.now()
        return catalogue
      })
      .catch((error) => {
        cataloguePromise = null
        throw error
      })
  }
  return cataloguePromise
}

const value = (item, key) => item?.[key] ?? ''

function formatSetCode(code) {
  return String(code || '').replace(/^(OP|EB|ST|PRB)(\d{2})$/, '$1-$2').toUpperCase()
}

export async function findCatalogueMatches(cardNumber) {
  const requestedNumber = baseCardNumber(cardNumber)
  if (!requestedNumber) return []

  const catalogue = await getCatalogue()
  const matchingCards = catalogue.cards.filter((card) => baseCardNumber(card.number) === requestedNumber)
  const results = []

  for (const card of matchingCards) {
    for (const language of LANGUAGES) {
      const data = catalogue.languages[language]
      const observations = data.observations.filter((item) => item.card_key === card.key)
      const observation = observations.sort((a, b) =>
        String(b.first_seen_at || '').localeCompare(String(a.first_seen_at || '')),
      )[0]
      const printings = data.printings.filter((item) => item.card_key === card.key)

      for (const printing of printings) {
        const productLinks = data.printingProducts.filter((item) => item.printing_key === printing.key)
        const linkedProducts = productLinks
          .map((link) => data.products.find((product) => product.key === link.product_key))
          .filter(Boolean)
        const products = linkedProducts.length ? linkedProducts : [null]

        for (const product of products) {
          const setCode = formatSetCode(product?.code || '')
          results.push({
            id: `${printing.key}:${language}:${product?.key || 'no-product'}`,
            cardKey: card.key,
            printingKey: printing.key,
            cardNumber: card.number || '',
            name: observation?.name || '',
            language: language === 'jp' ? 'Japanese' : 'English',
            languageCode: language,
            category: observation?.category || card.category || '',
            colors: (observation?.colors || card.colors || []).join(' / '),
            cost: value(observation, 'cost') === '' ? value(card, 'cost') : value(observation, 'cost'),
            life: value(observation, 'life') === '' ? value(card, 'life') : value(observation, 'life'),
            power: value(observation, 'power') === '' ? value(card, 'power') : value(observation, 'power'),
            counter: value(observation, 'counter') === '' ? value(card, 'counter') : value(observation, 'counter'),
            attributes: (observation?.attributes || card.attributes || []).join(' / '),
            traits: (observation?.types || []).join(' / '),
            effect: value(observation, 'effect'),
            trigger: value(observation, 'trigger'),
            rarity: value(printing, 'rarity'),
            variant: value(printing, 'variant'),
            variantLabel: value(printing, 'variant'),
            imageUrl: value(printing, 'image_url'),
            sourceText: value(printing, 'source_text'),
            setCode,
            setName: value(product, 'name'),
            productKind: value(product, 'kind'),
            releaseDate: value(product, 'release_date'),
            sourceUrl: value(product, 'product_url'),
            blockIcon: value(printing, 'block_icon'),
            source: language === 'jp' ? 'Official Japanese card list' : 'Official English card list',
          })
        }
      }
    }
  }

  return results.sort((a, b) =>
    a.language.localeCompare(b.language) ||
    a.setCode.localeCompare(b.setCode) ||
    a.variant.localeCompare(b.variant) ||
    a.id.localeCompare(b.id),
  )
}

export function catalogueMatchToForm(match) {
  const category = String(match.category || '').toLowerCase()
  return {
    name: match.name || '',
    card_number: match.cardNumber || '',
    set_code: match.setCode || '',
    rarity: match.rarity || '',
    color: match.colors || '',
    power: match.power === '' ? '' : String(match.power),
    cost: match.cost === '' ? '' : String(match.cost),
    card_type: category ? category[0].toUpperCase() + category.slice(1) : '',
    classification: match.traits || '',
    language: match.language || '',
    effect_text: match.effect || '',
    variant_label: match.variantLabel || '',
    counter: match.counter === '' ? '' : String(match.counter),
    trigger_text: match.trigger || '',
    attributes: match.attributes || '',
    reference_image_url: match.imageUrl || '',
  }
}

export function clearCatalogueCache() {
  cataloguePromise = null
  loadedAt = 0
}
