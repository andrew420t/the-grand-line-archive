import { supabase } from '../lib/supabase'

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
  const [cards, tcgcsvPrintings, ...languageData] = await Promise.all([
    readJsonLines('cards.jsonl'),
    readJsonLines('printings/tcgcsv.jsonl'),
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
  languages.en.printings = [...languages.en.printings, ...tcgcsvPrintings]
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
      const observations = data.observations.filter((item) => item.card_key === card.key && !item.superseded_at)
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
            language: printing.site === 'tcgcsv' ? 'English (promo/stamped)' : language === 'jp' ? 'Japanese' : 'English',
            languageCode: printing.site === 'tcgcsv' ? 'tcgcsv' : language,
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
            source: printing.site === 'tcgcsv' ? 'TCGplayer catalogue reference' : language === 'jp' ? 'Official Japanese card list' : 'Official English card list',
          })
        }
      }
    }
  }

  // Admin-entered corrections and custom cards are layered over the public reference data.
  if (supabase) {
    const saved = await supabase
      .from('card_catalogue_overrides')
      .select('id,card_number,language,set_code,variant_label,printing_key,details,source')
      .eq('card_number', requestedNumber)

    if (!saved.error) {
      for (const override of saved.data || []) {
        const identity = (match) =>
          match.language === override.language &&
          String(match.setCode || '') === String(override.set_code || '') &&
          String(match.variantLabel || '') === String(override.variant_label || '') &&
          (override.printing_key ? match.printingKey === override.printing_key : !match.printingKey)
        const existing = results.find((match) => identity(match))
        const details = override.details || {}
        if (existing) {
          Object.assign(existing, details, {
            id: existing.id,
            cardNumber: requestedNumber,
            source: 'Grand Line Archive saved correction',
          })
        } else {
          results.push({
            id: 'custom-' + override.id,
            cardKey: '',
            printingKey: '',
            cardNumber: requestedNumber,
            language: override.language,
            languageCode: override.language === 'Japanese' ? 'jp' : 'en',
            category: details.card_type || 'character',
            colors: details.color || '',
            cost: details.cost ?? '',
            life: details.life ?? '',
            power: details.power ?? '',
            counter: details.counter ?? '',
            attributes: details.attributes || '',
            traits: details.classification || '',
            effect: details.effect_text || '',
            trigger: details.trigger_text || '',
            rarity: details.rarity || '',
            variant: details.variant_label || 'custom',
            variantLabel: details.variant_label || '',
            imageUrl: details.reference_image_url || '',
            sourceText: 'Saved by Grand Line Archive admin',
            setCode: override.set_code || '',
            setName: details.set_name || '',
            productKind: 'custom',
            releaseDate: '',
            sourceUrl: '',
            blockIcon: '',
            source: override.source || 'Grand Line Archive saved card',
            ...details,
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
    reference_printing_key: match.printingKey || '',
  }
}
 
export async function saveCatalogueOverride({ form, userId }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!form?.card_number?.trim() || !form?.name?.trim()) {
    throw new Error('Enter both a card number and card name before saving to the library.')
  }
  const details = {
    name: form.name.trim(),
    rarity: form.rarity || '',
    color: form.color || '',
    power: form.power === '' ? '' : Number(form.power),
    cost: form.cost === '' ? '' : Number(form.cost),
    counter: form.counter === '' ? '' : Number(form.counter),
    card_type: form.card_type || '',
    classification: form.classification || '',
    language: form.language || 'English',
    effect_text: form.effect_text || '',
    trigger_text: form.trigger_text || '',
    attributes: form.attributes || '',
    variant_label: form.variant_label || '',
    reference_image_url: form.reference_image_url || '',
  }
  const payload = {
    card_number: normalizeCardNumber(form.card_number),
    language: form.language || 'English',
    set_code: String(form.set_code || '').toUpperCase(),
    variant_label: String(form.variant_label || ''),
    printing_key: String(form.reference_printing_key || ''),
    details,
    updated_by: userId || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('card_catalogue_overrides')
    .upsert(payload, { onConflict: 'card_number,language,set_code,variant_label,printing_key' })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('The shared card library table is not set up yet. Apply supabase/review-only/card-catalogue-overrides.sql in Supabase SQL Editor first.')
    }
    throw new Error('Could not save the card library correction: ' + error.message)
  }
  return true
}

export function clearCatalogueCache() {
  cataloguePromise = null
  loadedAt = 0
}
