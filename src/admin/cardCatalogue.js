import { supabase } from '../lib/supabase'

const DATA_ROOT = 'https://raw.githubusercontent.com/hotavocado/koala-kollect-data/main/data'
const MANIFEST_URL = 'https://raw.githubusercontent.com/hotavocado/koala-kollect-data/main/manifest.json'
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

const normalizeSearchText = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

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

  // Build reusable indexes once. Scanner lookups previously re-filtered every
  // catalogue table for every card number, which became increasingly expensive.
  const cardsByNumber = new Map()
  for (const card of cards) {
    const number = baseCardNumber(card.number)
    if (!number) continue
    const entries = safeMapGet(cardsByNumber, number) || []
    entries.push(card)
    cardsByNumber.set(number, entries)
  }
  const cardsByKey = new Map(cards.map((card) => [card.key, card]))
  const indexes = {}
  for (const language of LANGUAGES) {
    const data = languages[language]
    const observationsByCard = new Map()
    for (const item of data.observations) {
      if (item.superseded_at) continue
      const entries = safeMapGet(observationsByCard, item.card_key) || []
      entries.push(item)
      observationsByCard.set(item.card_key, entries)
    }
    const printingsByCard = new Map()
    for (const item of data.printings) {
      const entries = safeMapGet(printingsByCard, item.card_key) || []
      entries.push(item)
      printingsByCard.set(item.card_key, entries)
    }
    const locatorsByPrinting = new Map()
    for (const item of data.locators) {
      const key = item.printing_key + ':' + item.site
      if (!locatorsByPrinting.has(key)) locatorsByPrinting.set(key, item)
    }
    const printingProductsByPrinting = new Map()
    for (const item of data.printingProducts) {
      const entries = safeMapGet(printingProductsByPrinting, item.printing_key) || []
      entries.push(item)
      printingProductsByPrinting.set(item.printing_key, entries)
    }
    const productsByKey = new Map(data.products.map((item) => [item.key, item]))
    indexes[language] = { observationsByCard, printingsByCard, locatorsByPrinting, printingProductsByPrinting, productsByKey }
  }
  return { cards, languages, cardsByNumber, cardsByKey, indexes }
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

// Catalogue data can be partially unavailable during a failed/older cache load.
// Treat absent indexes as empty rather than crashing the entire Image Library.
const safeMapGet = (map, key) => map instanceof Map ? map.get(key) : undefined

function formatSetCode(code) {
  return String(code || '').replace(/^(OP|EB|ST|PRB)(\d{2})$/, '$1-$2').toUpperCase()
}

export async function findCatalogueMatches(cardNumber) {
  const requestedNumber = baseCardNumber(cardNumber)
  if (!requestedNumber) return []

  const catalogue = await getCatalogue()
  const matchingCards = safeMapGet(catalogue.cardsByNumber, requestedNumber) || []
  const results = []

  for (const card of matchingCards) {
    for (const language of LANGUAGES) {
      const data = catalogue.languages[language]
      const index = catalogue.indexes?.[language] || {}
      const observations = safeMapGet(index.observationsByCard, card.key) || []
      const observation = observations.reduce((latest, item) =>
        !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest,
      null)
      const printings = safeMapGet(index.printingsByCard, card.key) || []

      for (const printing of printings) {
        const locator = safeMapGet(index.locatorsByPrinting, printing.key + ':' + printing.site)
        const officialImageFallback = locator?.site === 'en'
          ? `https://en.onepiece-cardgame.com/images/cardlist/card/${encodeURIComponent(locator.image_id)}.png`
          : locator?.site === 'jp'
            ? `https://www.onepiece-cardgame.com/images/cardlist/card/${encodeURIComponent(locator.image_id)}.png`
            : ''
        const productLinks = safeMapGet(index.printingProductsByPrinting, printing.key) || []
        const linkedProducts = productLinks
          .map((link) => safeMapGet(index.productsByKey, link.product_key))
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
            imageUrl: officialImageFallback || value(printing, 'image_url'),
            fallbackImageUrl: officialImageFallback && officialImageFallback !== value(printing, 'image_url') ? officialImageFallback : '',
            sourceText: value(printing, 'source_text'),
            setCode,
            setName: value(product, 'name'),
            productKind: value(product, 'kind'),
            releaseDate: value(product, 'release_date'),
            sourceUrl: value(product, 'product_url'),
            blockIcon: value(printing, 'block_icon'),
            source: officialImageFallback ? (language === 'jp' ? 'Bandai official Japanese image' : 'Bandai official English image') : printing.site === 'tcgcsv' ? 'TCGplayer catalogue reference' : 'Koala Kollect catalogue reference',
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


/**
 * Opens Collectr's product search for a specific printing.
 * Collectr resolves the search on its own site; we deliberately do not
 * guess an internal card-detail URL that may change.
 */
export function collectrSearchUrl(match) {
  const cardNumber = String(match?.cardNumber || '').trim()
  if (!cardNumber) return 'https://app.getcollectr.com/'
  const query = match?.languageCode === 'jp' || match?.language === 'Japanese' ? cardNumber + ' JP' : cardNumber
  return `https://app.getcollectr.com/?query=${encodeURIComponent(query)}`
}


/**
 * Resolve one safe display reference for public archive tiles. Seller-uploaded
 * product photographs remain the primary image and are never overwritten.
 */
export async function findPrimaryCatalogueMatch(cardNumber, language = '') {
  const matches = await findCatalogueMatches(cardNumber)
  if (!matches.length) return null
  const requested = String(language || '').toLowerCase()
  const preferredCode = requested.startsWith('jp') || requested.includes('japanese') ? 'jp'
    : requested.startsWith('en') || requested.includes('english') ? 'en' : ''
  return matches.find((match) => preferredCode && match.languageCode === preferredCode && match.imageUrl)
    || matches.find((match) => match.languageCode === 'en' && match.imageUrl)
    || matches.find((match) => match.imageUrl)
    || null
}

/**
 * Read-only catalogue health summary for administrators. It reports what the
 * current source feed actually contains; it does not imply every Bandai set
 * has been imported or that an image URL has been live-checked.
 */
export async function getCatalogueCoverageReport() {
  const catalogue = await getCatalogue()
  let sourceManifest = null
  try {
    const manifestResponse = await fetch(MANIFEST_URL, { cache: 'no-cache' })
    if (manifestResponse.ok) sourceManifest = await manifestResponse.json()
  } catch {
    // The catalogue remains usable if the optional source freshness check is offline.
  }
  const sourceGeneratedAt = sourceManifest?.generated_at || ''
  const sourceAgeTimestamp = sourceGeneratedAt ? new Date(sourceGeneratedAt).getTime() : NaN
  const sourceAgeDays = Number.isFinite(sourceAgeTimestamp)
    ? Math.max(0, Math.floor((Date.now() - sourceAgeTimestamp) / 86400000))
    : null
  const report = {
    cards: catalogue.cards.length,
    printings: 0,
    withOfficialImage: 0,
    withoutImageLocator: 0,
    missingImageTotal: 0,
    missingImageBySet: {},
    missingImageByLanguage: {},
    languages: {},
    sets: {},
    unassigned: { printings: 0, withImage: 0, withoutImage: 0, withoutImageBySite: {} },
    missingImageSamples: [],
    sources: ['Bandai official image URLs where a Bandai locator exists', 'Koala Kollect structured catalogue metadata'],
    checkedAt: new Date().toISOString(),
    sourceGeneratedAt,
    sourceAgeDays,
    sourceIsStale: sourceAgeDays !== null && sourceAgeDays > 7,
    missingExpectedSets: [],
  }
  for (const language of LANGUAGES) {
    const data = catalogue.languages?.[language] || { printings: [] }
    const index = catalogue.indexes?.[language] || {}
    report.languages[language] = { printings: data.printings.length, withImage: 0, withoutImage: 0 }
    for (const printing of data.printings) {
      report.printings += 1
      const locator = safeMapGet(index.locatorsByPrinting, printing.key + ':' + printing.site)
      const hasOfficialImage = Boolean(locator?.image_id && (printing.site === 'en' || printing.site === 'jp'))
      const imageUrl = hasOfficialImage
        ? (printing.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com') + '/images/cardlist/card/' + encodeURIComponent(locator.image_id) + '.png'
        : String(printing.image_url || '')
      const hasImage = Boolean(imageUrl)
      const products = safeMapGet(index.printingProductsByPrinting, printing.key) || []
      const linkedProducts = products
        .map((link) => safeMapGet(index.productsByKey, link.product_key))
        .filter(Boolean)
      const setCodes = [...new Set(linkedProducts.map((product) => product.code).filter(Boolean))]
      const card = safeMapGet(catalogue.cardsByKey, printing.card_key)
      const cardNumber = card?.number || ''
      const observations = safeMapGet(index.observationsByCard, printing.card_key) || []
      const observation = observations.reduce((latest, item) =>
        !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest, null)
      const setLabels = setCodes.length ? setCodes.map(formatSetCode) : ['Unassigned']

      if (hasImage) {
        if (hasOfficialImage) report.withOfficialImage += 1
        report.languages[language].withImage += 1
      } else {
        report.withoutImageLocator += 1
        report.languages[language].withoutImage += 1
        report.missingImageTotal += 1
        report.missingImageByLanguage[language] = (report.missingImageByLanguage[language] || 0) + 1
        for (const setCode of setLabels) report.missingImageBySet[setCode] = (report.missingImageBySet[setCode] || 0) + 1
        // Keep a useful bounded sample for the admin screen while preserving the full missing total.
        if (report.missingImageSamples.length < 250) {
          report.missingImageSamples.push({
            cardNumber,
            name: observation?.name || '',
            language,
            printingKey: printing.key || '',
            sourceSite: printing.site || 'unknown',
            rarity: printing.rarity || '',
            variant: printing.variant || '',
            setCode: setLabels.join(', '),
            hasProductLink: products.length > 0,
            linkedProductCodes: setCodes,
            hasOfficialLocator: Boolean(locator?.image_id),
            imageUrl: printing.image_url || '',
            numberPrefixHint: cardNumber.match(/^(OP\d{2}|EB\d{2}|ST\d{2}|PRB\d{2}|P)-/)?.[1] || '',
          })
        }
      }

      if (!setCodes.length) {
        report.unassigned.printings += 1
        if (hasImage) report.unassigned.withImage += 1
        else {
          report.unassigned.withoutImage += 1
          const site = printing.site || 'unknown'
          report.unassigned.withoutImageBySite[site] = (report.unassigned.withoutImageBySite[site] || 0) + 1
        }
      }

      for (const setCode of setLabels) {
        const entry = report.sets[setCode] || { printings: 0, withImage: 0, withoutImage: 0 }
        entry.printings += 1
        if (hasImage) entry.withImage += 1
        else entry.withoutImage += 1
        report.sets[setCode] = entry
      }
    }
  }
  report.missingExpectedSets = ['OP-18', 'EB-05'].filter((code) => !report.sets[code] || report.sets[code].printings === 0)
  report.missingImageSamples.sort((a, b) =>
    a.sourceSite.localeCompare(b.sourceSite) ||
    a.cardNumber.localeCompare(b.cardNumber) ||
    a.printingKey.localeCompare(b.printingKey),
  )
  return report
}


/** Paged view of catalogue image URLs; these remain remote references, not stored uploads. */
export async function getCatalogueImageGallery({ offset = 0, limit = 60, query = '', language = 'all' } = {}) {
  const catalogue = await getCatalogue()
  const entries = []
  for (const language of LANGUAGES) {
    const data = catalogue.languages?.[language] || { printings: [] }
    const index = catalogue.indexes?.[language] || {}
    for (const printing of data.printings) {
      const locator = safeMapGet(index.locatorsByPrinting, printing.key + ':' + printing.site)
      const officialUrl = locator?.image_id && (printing.site === 'en' || printing.site === 'jp')
        ? (printing.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com') + '/images/cardlist/card/' + encodeURIComponent(locator.image_id) + '.png'
        : ''
      const imageUrl = officialUrl || printing.image_url || ''
      if (!imageUrl) continue
      const card = safeMapGet(catalogue.cardsByKey, printing.card_key)
      const observations = safeMapGet(index.observationsByCard, printing.card_key) || []
      const observation = observations.reduce((latest, item) => !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest, null)
      const links = safeMapGet(index.printingProductsByPrinting, printing.key) || []
      const product = links.map((link) => safeMapGet(index.productsByKey, link.product_key)).find(Boolean)
      entries.push({ id: printing.key + ':' + language, cardNumber: card?.number || '', name: observation?.name || '', language, rarity: printing.rarity || '', variant: printing.variant || '', setCode: formatSetCode(product?.code || ''), imageUrl })
    }
  }
  entries.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber) || a.language.localeCompare(b.language) || a.id.localeCompare(b.id))
  const normalizedQuery = normalizeSearchText(query)
  const filtered = entries.filter((entry) => {
    if (language !== 'all' && entry.language !== language) return false
    if (!normalizedQuery) return true
    return normalizeSearchText(entry.cardNumber).includes(normalizedQuery)
      || normalizeSearchText(entry.name).includes(normalizedQuery)
      || normalizeSearchText(entry.setCode).includes(normalizedQuery)
  })
  const start = Math.max(0, Number(offset) || 0)
  const pageSize = Math.min(120, Math.max(1, Number(limit) || 60))
  return { items: filtered.slice(start, start + pageSize), total: filtered.length, nextOffset: start + pageSize < filtered.length ? start + pageSize : null }
}

/**
 * Build the requested 100-image smoke-test matrix: two unique card numbers
 * per set and language for OP01–OP18, EB01–EB05 and PRB01/02.
 * This checks source coverage and image URLs; it does not run OCR.
 */
export async function getCatalogueReferenceTestMatrix() {
  const catalogue = await getCatalogue()
  const expectedSets = [
    ...Array.from({ length: 18 }, (_, index) => 'OP' + String(index + 1).padStart(2, '0')),
    ...Array.from({ length: 5 }, (_, index) => 'EB' + String(index + 1).padStart(2, '0')),
    'PRB01', 'PRB02',
  ]
  const bySlot = new Map()
  const targetSetForProduct = (productCode, cardNumber) => {
    const code = String(productCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const prefix = baseCardNumber(cardNumber).split('-')[0]
    if (code === 'OP14EB04' || code === 'OP15EB04') {
      if (prefix === 'EB04') return 'EB04'
      return code.startsWith('OP14') ? 'OP14' : 'OP15'
    }
    const match = code.match(/^(OP\d{2}|EB\d{2}|PRB\d{2})/)
    return match?.[1] || ''
  }

  for (const language of LANGUAGES) {
    const data = catalogue.languages?.[language] || { printings: [] }
    const index = catalogue.indexes?.[language] || {}
    for (const printing of data.printings) {
      if (printing.site !== language) continue
      const card = safeMapGet(catalogue.cardsByKey, printing.card_key)
      const cardNumber = card?.number || ''
      if (!cardNumber) continue
      const locator = safeMapGet(index.locatorsByPrinting, printing.key + ':' + printing.site)
      const officialUrl = locator?.image_id
        ? (language === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com') + '/images/cardlist/card/' + encodeURIComponent(locator.image_id) + '.png'
        : ''
      const imageUrl = officialUrl || printing.image_url || ''
      if (!imageUrl) continue
      const links = safeMapGet(index.printingProductsByPrinting, printing.key) || []
      const products = links.map((link) => safeMapGet(index.productsByKey, link.product_key)).filter(Boolean)
      const observations = safeMapGet(index.observationsByCard, printing.card_key) || []
      const observation = observations.reduce((latest, item) =>
        !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest, null)
      for (const product of products) {
        const set = targetSetForProduct(product.code, cardNumber)
        if (!expectedSets.includes(set)) continue
        const key = language + ':' + set
        const items = bySlot.get(key) || []
        if (items.some((item) => item.cardNumber === cardNumber)) continue
        items.push({
          id: printing.key + ':' + language + ':' + set,
          cardNumber,
          name: observation?.name || '',
          language,
          setCode: formatSetCode(set),
          setName: product.name || '',
          rarity: printing.rarity || '',
          variant: printing.variant || '',
          imageUrl,
          source: officialUrl ? 'Bandai official image reference' : 'Koala Kollect image reference',
        })
        bySlot.set(key, items)
      }
    }
  }

  const items = []
  const missingSlots = []
  for (const set of expectedSets) {
    for (const language of LANGUAGES) {
      const candidates = (bySlot.get(language + ':' + set) || [])
        .sort((a, b) => a.cardNumber.localeCompare(b.cardNumber) || a.id.localeCompare(b.id))
      for (let slot = 0; slot < 2; slot += 1) {
        if (candidates[slot]) items.push({ ...candidates[slot], targetSet: formatSetCode(set), sampleSlot: slot + 1 })
        else missingSlots.push({ targetSet: formatSetCode(set), language, sampleSlot: slot + 1 })
      }
    }
  }
  return { expectedTotal: expectedSets.length * LANGUAGES.length * 2, items, missingSlots, checkedAt: new Date().toISOString() }
}

/** Card-number-first reference lookup shared by search, Quick Add and scanner. */
export async function getCatalogueImagesForCard(cardNumber, language = 'all') {
  const matches = await findCatalogueMatches(cardNumber)
  return matches
    .filter((match) => match.imageUrl && (language === 'all' || match.languageCode === language))
    .map((match) => ({
      id: match.id,
      cardNumber: match.cardNumber,
      name: match.name,
      language: match.language,
      languageCode: match.languageCode,
      setCode: match.setCode,
      rarity: match.rarity,
      variant: match.variant,
      imageUrl: match.imageUrl,
      source: match.imageSource || (match.imageUrl.includes('onepiece-cardgame.com') ? 'Bandai' : 'Catalogue source'),
    }))
}
