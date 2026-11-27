import { supabase } from '../lib/supabase'
import { resolveCatalogueImage } from './catalogueImageReference.js'
import { isDonCatalogueEntry, buildDonSetIndex } from './catalogueDonMetadata.js'
import { getOfficialCardlistUrl } from './officialCardlistUrl.js'
import { createOfficialImageOnlyMatch } from './officialImageOnlyFallback.js'
import { filterCatalogueImageEntries, getCatalogueImageFilterOptions, getCardNumberSetCode, dedupePrintingProducts, getCatalogueProductSetCode } from './catalogueImageFilters.js'
import { selectPrimaryCatalogueMatch } from './cataloguePrimaryMatch.js'
import { SUPPLEMENTAL_SAMPLE_CARDS, getSupplementalSampleMatches } from './catalogueSupplementalSamples.js'
import { OP18_OFFICIAL_PRINTINGS, OP18_BASE_CARD_NUMBERS, getOp18SupplementalMatches } from './op18OfficialCatalogue.js'
import { applyCatalogueImageCorrections } from './catalogueImageCorrections.js'

const DATA_ROOT = 'https://raw.githubusercontent.com/hotavocado/koala-kollect-data/main/data'
const MANIFEST_URL = 'https://raw.githubusercontent.com/hotavocado/koala-kollect-data/main/manifest.json'
const LANGUAGES = ['en', 'jp', 'cn']
const REFERENCE_TEST_LANGUAGES = ['en', 'jp']
const LANGUAGE_LABELS = { en: 'English', jp: 'Japanese', cn: 'Chinese (CN)', tcgcsv: 'English (promo/stamped)' }

const CACHE_TTL = 6 * 60 * 60 * 1000

let cataloguePromise
let loadedAt = 0
let imageCorrectionsPromise
let imageCorrectionsLoadedAt = 0

const normalizeCardNumber = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .replace(/^(OP|EB|ST|PRB)-(\d{2})-/, '$1$2-')
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
  const [cards, tcgcsvPrintings, donSetRows, ...languageData] = await Promise.all([
    readJsonLines('cards.jsonl'),
    readJsonLines('printings/tcgcsv.jsonl'),
    readJsonLines('don_sets.jsonl').catch(() => []),
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
  return { cards, languages, cardsByNumber, cardsByKey, indexes, donSetsByPrintingKey: buildDonSetIndex(donSetRows) }
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
  const value = String(code || '').trim()
  const normalized = value.toUpperCase()
  if (/^(OP|EB|ST|PRB)\d{2}$/.test(normalized)) return normalized.replace(/^(OP|EB|ST|PRB)(\d{2})$/, '$1-$2')
  if (/^OP\d{2}EB\d{2}$/.test(normalized)) return normalized.replace(/^(OP\d{2})(EB\d{2})$/, '$1-$2')
  if (/^(OP|EB|ST|PRB)\d{2}-/.test(normalized)) return normalized
  return value
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
        const imageReference = resolveCatalogueImage({ printing, index, printings: data.printings, language, cardNumber: card.number || '' })
        const productLinks = safeMapGet(index.printingProductsByPrinting, printing.key) || []
        const linkedProducts = dedupePrintingProducts(productLinks
          .map((link) => safeMapGet(index.productsByKey, link.product_key))
          .filter(Boolean))
        const products = linkedProducts.length ? linkedProducts : [null]

        for (const product of products) {
          const setCode = formatSetCode(product?.code || '')
          results.push({
            id: `${printing.key}:${language}:${product?.key || 'no-product'}`,
            cardKey: card.key,
            printingKey: printing.key,
            cardNumber: card.number || '',
            name: observation?.name || '',
            language: LANGUAGE_LABELS[printing.site === 'tcgcsv' ? 'tcgcsv' : language] || 'English',
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
            imageUrl: imageReference.imageUrl,
            imageUrls: imageReference.imageUrls || [imageReference.imageUrl, imageReference.fallbackImageUrl].filter(Boolean),
            fallbackImageUrl: imageReference.fallbackImageUrl,
            usesBaseImageFallback: imageReference.usesBaseImageFallback,
            usesAlternateOfficialFallback: imageReference.usesAlternateOfficialFallback,
            sourceText: value(printing, 'source_text'),
            setCode: formatSetCode(getCatalogueProductSetCode(product, card.number || '')),
            setName: value(product, 'name'),
            productKind: value(product, 'kind'),
            releaseDate: value(product, 'release_date'),
            sourceUrl: value(product, 'product_url'),
            blockIcon: value(printing, 'block_icon'),
            source: imageReference.source,
            officialCardlistUrl: language === 'cn' || printing.site === 'tcgcsv' ? '' : getOfficialCardlistUrl(setCode, language, false, card.number || ''),
          })
        }
      }
    }
  }

  // Add only explicitly identified recent-set sample printings when the upstream
  // feed has not supplied the exact card/set/language identity. These are clearly
  // labelled samples, not a claim that the complete set has been imported.
  for (const sample of getSupplementalSampleMatches(requestedNumber)) {
    const exists = results.some((match) => match.id === sample.id)
    if (!exists) results.push(sample)
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

  // The current local feed may omit newer cards or one language. Add a
  // clearly labelled Bandai base-image-only reference only where there is no
  // existing image for that language. Never guess details or variant identity.
  for (const languageCode of LANGUAGES) {
    const hasLanguageImage = results.some((match) =>
      match.languageCode === languageCode && Boolean(match.imageUrl),
    )
    if (!hasLanguageImage) {
      const fallback = createOfficialImageOnlyMatch(requestedNumber, languageCode)
      if (fallback) results.push(fallback)
    }
  }

  return results.sort((a, b) =>
    a.language.localeCompare(b.language) ||
    a.setCode.localeCompare(b.setCode) ||
    a.variant.localeCompare(b.variant) ||
    a.id.localeCompare(b.id),
  )
}


/** Search catalogue entries by either card number or the card name. */
export async function findCatalogueSearchMatches(query, { limit = 12 } = {}) {
  const rawQuery = String(query || '').trim()
  if (!rawQuery) return []
  const cardNumber = baseCardNumber(rawQuery)
  if (cardNumber) return findCatalogueMatches(cardNumber)

  const normalized = normalizeSearchText(rawQuery)
  if (normalized.length < 2) return []
  const catalogue = await getCatalogue()
  const matchedNumbers = new Map()
  for (const language of LANGUAGES) {
    const index = catalogue.indexes?.[language] || {}
    for (const card of catalogue.cards || []) {
      const observations = safeMapGet(index.observationsByCard, card.key) || []
      const nameMatches = observations.some((observation) =>
        !observation.superseded_at && normalizeSearchText(observation.name).includes(normalized),
      )
      if (!nameMatches || !card.number) continue
      const number = baseCardNumber(card.number)
      if (number && !matchedNumbers.has(number)) matchedNumbers.set(number, card)
      if (matchedNumbers.size >= Math.max(1, Math.min(20, limit))) break
    }
    if (matchedNumbers.size >= Math.max(1, Math.min(20, limit))) break
  }
  const groups = await Promise.all([...matchedNumbers.keys()].map((number) => findCatalogueMatches(number)))
  return [...new Map(groups.flat().map((match) => [match.id, match])).values()]
    .slice(0, Math.max(1, Math.min(60, limit * 4)))
}

export function catalogueMatchToForm(match) {
  const category = String(match.category || '').toLowerCase()
  // Image-only references are not verified printing identities. Keep their
  // image URL, but never persist the synthetic reference ID as a printing key.
  const verifiedMatchId = match.officialImageOnly ? '' : (match.id || '')
  const verifiedPrintingKey = match.officialImageOnly ? '' : (match.printingKey || '')
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
    reference_printing_key: verifiedPrintingKey,
    reference_match_id: verifiedMatchId,
    reference_image_source: match.source || match.imageSource || '',
    catalogue_match_id: verifiedMatchId,
    catalogue_printing_key: verifiedPrintingKey,
    catalogue_reference_image_url: match.imageUrl || '',
    catalogue_reference_image_source: match.source || match.imageSource || '',
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
    source: form.reference_image_source || 'Administrator-corrected image reference',
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
  imageCorrectionsPromise = null
  imageCorrectionsLoadedAt = 0
  return true
}

export function clearCatalogueCache() {
  cataloguePromise = null
  loadedAt = 0
  imageCorrectionsPromise = null
  imageCorrectionsLoadedAt = 0
}

async function readDonCardSetOverrides() {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('don_card_set_overrides')
    .select('printing_key,language,set_code,source_note')
  if (error) {
    // The optional review-only migration may not have been applied yet.
    if (error.code === '42P01' || error.code === 'PGRST205') return {}
    throw error
  }
  return Object.fromEntries((data || []).map((row) => [`${row.printing_key}:${row.language}`, row]))
}

export async function saveDonCardSetOverride({ printingKey, language, setCode, userId, sourceNote = '' }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!printingKey || !['en', 'jp'].includes(language) || !String(setCode || '').trim()) {
    throw new Error('Choose a source set and a valid DON!! printing before saving.')
  }
  const payload = {
    printing_key: printingKey,
    language,
    set_code: String(setCode).trim().toUpperCase(),
    source_note: sourceNote || 'Manually assigned in Grand Line Archive',
    updated_by: userId || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('don_card_set_overrides').upsert(payload, { onConflict: 'printing_key,language' })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('DON!! set assignments are not enabled yet. Review and apply supabase/review-only/don-card-set-overrides.sql in Supabase first.')
    }
    throw new Error('Could not save DON!! set assignment: ' + error.message)
  }
  return true
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

export async function findPrimaryCatalogueMatch(cardNumber, language = '', identity = {}) {
  const matches = await findCatalogueMatches(cardNumber)
  const selected = selectPrimaryCatalogueMatch(matches, { language, ...identity })
  if (selected) return selected
  // A reprint set may not be represented in the local feed yet. Retain an
  // official same-card base image rather than leave the product tile blank.
  return createOfficialImageOnlyMatch(cardNumber, language || 'en', identity.setCode || '')
}

/**
 * Read-only catalogue health summary for administrators. It reports what the
 * current source feed actually contains; it does not imply every Bandai set
 * has been imported or that an image URL has been live-checked.
 */
export async function getCatalogueCoverageReport() {
  const catalogue = await getCatalogue()
  const donOverrides = await readDonCardSetOverrides()
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
    donPrintings: 0,
    donWithoutSetLink: 0,
    withOfficialImage: 0,
    withFallbackImage: 0,
    withoutImageLocator: 0,
    missingImageTotal: 0,
    missingImageBySet: {},
    missingImageByLanguage: {},
    languages: {},
    sets: {},
    unassigned: { printings: 0, withImage: 0, withFallbackImage: 0, withoutImage: 0, withoutImageBySite: {} },
    expectedCoverage: {
      status: 'not-comparable',
      note: 'Set-by-set catalogue row totals are discovered feed records, not authoritative expected card/printing counts. Missing records cannot be counted without an independent expected inventory.',
      availableFeedRecordsBySet: {},
      authoritativeExpectedCounts: null,
      missingCatalogueRecords: null,
    },
    missingImageSamples: [],
    sources: ['Bandai official image URLs where a Bandai locator exists', 'Koala Kollect structured catalogue metadata', 'Bandai official OP-18 card list and OPBoxIndex printing-ID cross-check'],
    checkedAt: new Date().toISOString(),
    sourceGeneratedAt,
    sourceAgeDays,
    sourceIsStale: sourceAgeDays !== null && sourceAgeDays > 7,
    missingExpectedSets: [],
    supplementalSampleCards: {
      total: SUPPLEMENTAL_SAMPLE_CARDS.length,
      bySet: Object.fromEntries([...new Set(SUPPLEMENTAL_SAMPLE_CARDS.map((sample) => sample.setCode))].map((setCode) => [
        setCode,
        SUPPLEMENTAL_SAMPLE_CARDS.filter((sample) => sample.setCode === setCode).length,
      ])),
      scope: 'legacy sample supplements; complete OP-18 import is reported separately',
    },
    op18OfficialImport: {
      baseCardNumbers: OP18_BASE_CARD_NUMBERS.length,
      productPrintings: OP18_OFFICIAL_PRINTINGS.length,
      parallelPrintings: OP18_OFFICIAL_PRINTINGS.filter((printing) => printing.variant === 'Parallel').length,
      specialPrintings: OP18_OFFICIAL_PRINTINGS.filter((printing) => ['SP CARD', 'TREASURE RARE'].includes(printing.variant)).length,
      imageReferences: OP18_OFFICIAL_PRINTINGS.length * REFERENCE_TEST_LANGUAGES.length,
      languages: ['English', 'Japanese'],
      source: 'Bandai official product card list; parallel image IDs and Japanese names cross-checked against OPBoxIndex (2026-11-26)',
      liveImageVerification: 'pending full image audit',
    },
  }
  for (const language of LANGUAGES) {
    const data = catalogue.languages?.[language] || { printings: [] }
    const index = catalogue.indexes?.[language] || {}
    report.languages[language] = { printings: data.printings.length, withImage: 0, withFallbackImage: 0, withoutImage: 0 }
    for (const printing of data.printings) {
      report.printings += 1
      const locator = safeMapGet(index.locatorsByPrinting, printing.key + ':' + printing.site)
      const card = safeMapGet(catalogue.cardsByKey, printing.card_key)
      const cardNumber = card?.number || ''
      const imageReference = resolveCatalogueImage({ printing, index, printings: data.printings, language, cardNumber })
      const hasOfficialImage = Boolean(imageReference.imageUrl && imageReference.source.startsWith('Bandai official') && !imageReference.usesBaseImageFallback)
      const hasFallbackImage = imageReference.usesBaseImageFallback
      const imageUrl = imageReference.imageUrl
      const hasImage = Boolean(imageUrl)
      const products = safeMapGet(index.printingProductsByPrinting, printing.key) || []
      const linkedProducts = products
        .map((link) => safeMapGet(index.productsByKey, link.product_key))
        .filter(Boolean)
      const observations = safeMapGet(index.observationsByCard, printing.card_key) || []
      const observation = observations.reduce((latest, item) =>
        !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest, null)
      const isDon = isDonCatalogueEntry({ printing, card, observation })
      const donOverride = isDon ? donOverrides[printing.key + ':' + language] : null
      const donSourceSet = isDon ? catalogue.donSetsByPrintingKey?.[printing.key] : null
      const setCodes = donOverride?.set_code ? [donOverride.set_code] : donSourceSet?.set_codes?.length ? donSourceSet.set_codes : donSourceSet?.set_code ? [donSourceSet.set_code] : [...new Set(linkedProducts.map((product) => product.code).filter(Boolean))]
      const setLabels = setCodes.length ? setCodes.map(formatSetCode) : ['Unassigned']
      if (isDon) {
        report.donPrintings += 1
        if (!setCodes.length) report.donWithoutSetLink += 1
      }

      if (hasImage) {
        if (hasOfficialImage) report.withOfficialImage += 1
        if (hasFallbackImage) {
          report.withFallbackImage += 1
          report.languages[language].withFallbackImage += 1
        }
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
        if (hasFallbackImage) report.unassigned.withFallbackImage += 1
        if (!hasImage) {
          report.unassigned.withoutImage += 1
          const site = printing.site || 'unknown'
          report.unassigned.withoutImageBySite[site] = (report.unassigned.withoutImageBySite[site] || 0) + 1
        }
      }

      for (const setCode of setLabels) {
        const entry = report.sets[setCode] || { printings: 0, donPrintings: 0, withImage: 0, withFallbackImage: 0, withoutImage: 0 }
        entry.printings += 1
        if (isDon) entry.donPrintings += 1
        if (hasImage) entry.withImage += 1
        if (hasFallbackImage) entry.withFallbackImage += 1
        if (!hasImage) entry.withoutImage += 1
        report.sets[setCode] = entry
      }
    }
  }
  // These are counts discovered from the current metadata feed only. Keep them
  // explicitly separate from authoritative inventory totals: absence from this
  // feed is not proof that the corresponding card/printing does not exist.
  report.expectedCoverage.availableFeedRecordsBySet = Object.fromEntries(
    Object.entries(report.sets).map(([code, stats]) => [code, stats.printings]),
  )
  report.expectedCoverage.note += ' OP-18 official printing inventory is supplied separately; the OP-01–OP-17, EB, PRB, starter and promo sets still require independently sourced checklists.'
  report.missingExpectedSets = ['OP-18', 'EB-05'].filter((code) => !report.sets[code] || report.sets[code].printings === 0)
  report.missingImageSamples.sort((a, b) =>
    a.sourceSite.localeCompare(b.sourceSite) ||
    a.cardNumber.localeCompare(b.cardNumber) ||
    a.printingKey.localeCompare(b.printingKey),
  )
  return report
}


/** Paged view of catalogue image URLs; these remain remote references, not stored uploads. */
async function getCatalogueImageCorrections() {
  if (!supabase) return []
  const ttl = 60 * 1000
  if (!imageCorrectionsPromise || Date.now() - imageCorrectionsLoadedAt > ttl) {
    imageCorrectionsPromise = supabase
      .from('card_catalogue_overrides')
      .select('card_number,language,set_code,variant_label,printing_key,details,source')
      .then(({ data, error }) => {
        if (error) throw error
        imageCorrectionsLoadedAt = Date.now()
        return data || []
      })
      .catch((error) => {
        imageCorrectionsPromise = null
        throw new Error('Could not load saved catalogue image corrections: ' + (error.message || String(error)))
      })
  }
  return imageCorrectionsPromise
}

export async function getCatalogueImageGallery({
  offset = 0,
  limit = 60,
  query = '',
  cardNumber = '',
  sortBy = 'card-number-asc',
  language = 'all',
  set = 'all',
  cardNumberSet = 'all',
  rarity = 'all',
  cardType = 'all',
  color = 'all',
  variant = 'all',
  imageStatus = 'all',
} = {}) {
  const catalogue = await getCatalogue()
  const [donOverrides, imageCorrections] = await Promise.all([readDonCardSetOverrides(), getCatalogueImageCorrections()])
  const entries = []

  for (const siteLanguage of LANGUAGES) {
    const data = catalogue.languages?.[siteLanguage] || { printings: [] }
    const index = catalogue.indexes?.[siteLanguage] || {}
    for (const printing of data.printings || []) {
      const card = safeMapGet(catalogue.cardsByKey, printing.card_key)
      const observation = (safeMapGet(index.observationsByCard, printing.card_key) || [])
        .filter((item) => !item.superseded_at)
        .reduce((latest, item) => !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest, null)
      const isDon = isDonCatalogueEntry({ printing, card, observation })
      const imageReference = resolveCatalogueImage({
        printing,
        index,
        printings: data.printings,
        language: siteLanguage,
        cardNumber: card?.number || '',
      })
      const links = safeMapGet(index.printingProductsByPrinting, printing.key) || []
      // Duplicate link rows for the same printing/product must not create
      // duplicate gallery cards. Distinct product keys remain separate because
      // they represent genuinely different release products.
      const products = dedupePrintingProducts(links
        .map((link) => safeMapGet(index.productsByKey, link.product_key))
        .filter(Boolean))
      const productChoices = products.length ? products : [null]
      const setOverride = isDon ? donOverrides[printing.key + ':' + siteLanguage] : null
      const donSourceSet = isDon ? catalogue.donSetsByPrintingKey?.[printing.key] : null
      const sourceSetCodes = donSourceSet?.set_codes?.length
        ? donSourceSet.set_codes
        : donSourceSet?.set_code ? [donSourceSet.set_code] : []

      for (const product of productChoices) {
        const rawSetCode = setOverride?.set_code
          || (donSourceSet
            ? (sourceSetCodes.length === 1 ? sourceSetCodes[0] : '')
            : getCatalogueProductSetCode(product, card?.number || ''))
        const inferredSetCode = (card?.number || '').match(/^(OP\d{2}|EB\d{2}|ST\d{2}|PRB\d{2})-/)?.[1] || ''
        const setCode = formatSetCode(rawSetCode || inferredSetCode || (isDon ? 'DON!!' : ''))
        const displaySetCodes = setOverride?.set_code
          ? [setOverride.set_code]
          : sourceSetCodes.length ? sourceSetCodes : [getCatalogueProductSetCode(product, card?.number || '')].filter(Boolean)
        const formattedSetCodes = displaySetCodes.map(formatSetCode)
        const setName = setOverride
          ? 'Manually assigned set'
          : sourceSetCodes.length > 1
            ? 'Multiple source sets (DON!! source data)'
            : donSourceSet
              ? setCode + ' (DON!! source data)'
              : product?.name || ''
        const setAssignmentSource = setOverride?.source_note || (donSourceSet ? donSourceSet.source_note : product ? 'Catalogue product link' : '')
        const languageCode = printing.site === 'tcgcsv' ? 'tcgcsv' : siteLanguage
        const languageLabel = LANGUAGE_LABELS[languageCode] || languageCode.toUpperCase()
        const imageUrls = imageReference.imageUrls || [imageReference.imageUrl, imageReference.fallbackImageUrl].filter(Boolean)
        const imageStatus = !imageUrls.length
          ? 'missing'
          : imageReference.usesBaseImageFallback || imageReference.usesAlternateOfficialFallback
            ? 'fallback'
            : 'available'
        const colorValues = observation?.colors || card?.colors || []
        entries.push({
          id: printing.key + ':' + siteLanguage + ':' + (product?.key || 'no-product'),
          cardKey: printing.card_key || card?.key || '',
          printingKey: printing.key,
          cardNumber: card?.number || (isDon ? 'DON!!' : ''),
          name: observation?.name || '',
          language: languageLabel,
          languageCode,
          rarity: printing.rarity || '',
          variant: printing.variant || '',
          setCode,
          setCodes: formattedSetCodes,
          setName,
          setAssignmentSource,
          sourceText: printing.source_text || '',
          isDon,
          category: observation?.category || card?.category || (isDon ? 'DON!!' : ''),
          colors: Array.isArray(colorValues) ? colorValues.join(' / ') : String(colorValues || ''),
          colorValues: Array.isArray(colorValues) ? colorValues : String(colorValues || '').split('/').map((v) => v.trim()).filter(Boolean),
          cost: value(observation, 'cost') === '' ? value(card, 'cost') : value(observation, 'cost'),
          power: value(observation, 'power') === '' ? value(card, 'power') : value(observation, 'power'),
          counter: value(observation, 'counter') === '' ? value(card, 'counter') : value(observation, 'counter'),
          attributes: (observation?.attributes || card?.attributes || []).join(' / '),
          traits: (observation?.types || card?.types || []).join(' / '),
          effect: value(observation, 'effect'),
          trigger: value(observation, 'trigger'),
          variantLabel: value(printing, 'variant'),
          officialListUrl: siteLanguage === 'cn' || printing.site === 'tcgcsv'
            ? ''
            : setCode ? getOfficialCardlistUrl(setCode, siteLanguage, isDon, card?.number || '') : '',
          imageUrl: imageUrls[0] || '',
          imageUrls,
          fallbackImageUrl: imageUrls[1] || '',
          source: imageReference.source,
          usesBaseImageFallback: Boolean(imageReference.usesBaseImageFallback),
          usesAlternateOfficialFallback: Boolean(imageReference.usesAlternateOfficialFallback),
          hasImage: imageUrls.length > 0,
          imageStatus,
        })
      }
    }
  }

  // OP-18 is newer than the upstream Koala Kollect snapshot. Add its complete
  // Bandai product list (base cards, parallels and special reprints) to the
  // Image Library gallery using the official English/Japanese image hosts.
  for (const match of getOp18SupplementalMatches()) {
    const exists = entries.some((entry) =>
      entry.id === match.id ||
      (entry.cardNumber === match.cardNumber &&
        entry.languageCode === match.languageCode &&
        entry.setCode === 'OP-18' &&
        (entry.imageUrls || [entry.imageUrl]).includes(match.imageUrl)),
    )
    if (exists) continue
    const colorValues = String(match.colors || '').split('/').map((value) => value.trim()).filter(Boolean)
    entries.push({
      id: match.id,
      printingKey: match.printingKey,
      cardNumber: match.cardNumber,
      name: match.name,
      language: match.language,
      languageCode: match.languageCode,
      rarity: match.rarity,
      variant: match.variantLabel,
      setCode: 'OP-18',
      setCodes: ['OP-18'],
      setName: 'The Dominance of God [OP-18]',
      setAssignmentSource: 'Bandai official OP-18 product card list',
      sourceText: match.sourceText,
      isDon: false,
      category: match.category,
      colors: colorValues.join(' / '),
      colorValues,
      officialListUrl: match.officialCardlistUrl,
      imageUrl: match.imageUrl,
      imageUrls: match.imageUrls,
      fallbackImageUrl: match.fallbackImageUrl,
      source: match.source,
      usesBaseImageFallback: false,
      usesAlternateOfficialFallback: false,
      hasImage: Boolean(match.imageUrl),
      imageStatus: 'available',
      verificationStatus: 'pending-live-image-check',
      supplementalOfficial: true,
    })
  }

  // When a typed card number is absent from the feed entirely, try an official
  // English or Japanese base-image reference. Keep the result image-only.
  const normalizedNumber = baseCardNumber(cardNumber || query)
  if (normalizedNumber) {
    for (const languageCode of ['en', 'jp']) {
      const exists = entries.some((entry) => entry.cardNumber === normalizedNumber && entry.languageCode === languageCode)
      if (exists) continue
      const fallback = createOfficialImageOnlyMatch(normalizedNumber, languageCode)
      if (!fallback) continue
      entries.push({
        id: fallback.id,
        printingKey: '',
        cardNumber: fallback.cardNumber,
        name: '',
        language: fallback.language,
        languageCode,
        rarity: '',
        variant: fallback.variant,
        setCode: fallback.setCode,
        setCodes: [fallback.setCode],
        setName: fallback.setName,
        setAssignmentSource: '',
        sourceText: fallback.sourceText,
        isDon: false,
        category: '',
        colors: '',
        colorValues: [],
        officialListUrl: fallback.officialCardlistUrl,
        imageUrl: fallback.imageUrl,
        imageUrls: fallback.imageUrls || [fallback.imageUrl, fallback.fallbackImageUrl].filter(Boolean),
        fallbackImageUrl: fallback.fallbackImageUrl || '',
        source: fallback.source,
        usesBaseImageFallback: true,
        usesAlternateOfficialFallback: false,
        hasImage: Boolean(fallback.imageUrl),
        imageStatus: 'fallback',
        officialImageOnly: true,
      })
    }
  }

  const correctedEntries = applyCatalogueImageCorrections(entries, imageCorrections)
  for (const entry of correctedEntries) entry.cardNumberSet = getCardNumberSetCode(entry.cardNumber)
  const filterEntries = filterCatalogueImageEntries(correctedEntries, { query, cardNumber, sortBy, language, set, cardNumberSet, rarity, cardType, color, variant, imageStatus })
  const rawFilters = getCatalogueImageFilterOptions(correctedEntries)
  const filters = {
    languages: rawFilters.languages.map((value) => ({ value, label: LANGUAGE_LABELS[value] || value })),
    sets: rawFilters.sets.map((value) => ({ value, label: value })),
    cardNumberSets: (rawFilters.cardNumberSets || []).map((value) => ({ value, label: value })),
    rarities: rawFilters.rarities.map((value) => ({ value, label: value })),
    cardTypes: rawFilters.cardTypes.map((value) => ({ value, label: String(value).replace(/^./, (c) => c.toUpperCase()) })),
    colors: rawFilters.colors.map((value) => ({ value, label: value })),
    variants: rawFilters.variants.map((value) => ({ value, label: value })),
  }

  const start = Math.max(0, Number(offset) || 0)
  const pageSize = Math.min(120, Math.max(1, Number(limit) || 60))
  return {
    items: filterEntries.slice(start, start + pageSize),
    total: filterEntries.length,
    nextOffset: start + pageSize < filterEntries.length ? start + pageSize : null,
    filters,
  }
}

/**
 * Build the image audit matrix: two sample cards per language for every tracked
 * set, plus every OP-18 product printing (119 base, 33 parallel, 7 special)
 * in English and Japanese. This checks image loading, not OCR.
 */
/**
 * Return the complete available English or Japanese catalogue inventory for
 * live image auditing. This deliberately pages through the gallery rather than
 * using the sample smoke-test matrix. Entries without image URLs are retained.
 * The result is a discovered-feed inventory, not an authoritative expected-set
 * inventory; missing catalogue rows still require independent checklists.
 */
export async function getCatalogueImageAuditInventory(language) {
  if (!['en', 'jp'].includes(language)) throw new Error('Choose English (en) or Japanese (jp) for a catalogue image audit.')
  const pageSize = 120
  const records = []
  let offset = 0
  let total = null
  do {
    const page = await getCatalogueImageGallery({ offset, limit: pageSize, language, sortBy: 'card-number-asc' })
    total = page.total
    records.push(...(page.items || []))
    offset += pageSize
  } while (offset < (total || 0))
  const unique = new Map()
  for (const record of records) {
    if (record.languageCode !== language) continue
    const identity = [record.printingKey || record.id, record.languageCode, record.setCode || ''].join(':')
    if (!unique.has(identity)) unique.set(identity, record)
  }
  return {
    language,
    records: [...unique.values()],
    total: unique.size,
    discoveredAt: new Date().toISOString(),
    inventoryStatus: 'discovered-feed-not-authoritative',
    scope: 'Every available gallery catalogue entry for this language, including entries without image references and supplemental OP-18 printings.',
  }
}

export async function getCatalogueReferenceTestMatrix() {
  const catalogue = await getCatalogue()
  const expectedSets = [
    ...Array.from({ length: 18 }, (_, index) => 'OP' + String(index + 1).padStart(2, '0')),
    ...Array.from({ length: 5 }, (_, index) => 'EB' + String(index + 1).padStart(2, '0')),
    'PRB01', 'PRB02',
    ...Array.from({ length: 36 }, (_, index) => 'ST' + String(index + 1).padStart(2, '0')),
    ...Array.from({ length: 12 }, (_, index) => 'DP' + String(index + 1).padStart(2, '0')),
    'PROMO',
  ]
  const rows = new Map()
  const add = (item) => {
    const key = [item.language, item.targetSet, item.cardNumber, item.printingKey || item.id, item.variant || ''].join(':')
    if (!rows.has(key)) rows.set(key, item)
  }
  const normalizeCode = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const setFromProduct = (code, cardNumber) => {
    const normalized = normalizeCode(code)
    const numberPrefix = baseCardNumber(cardNumber).split('-')[0]
    if (normalized === 'OP14EB04' || normalized === 'OP15EB04') {
      return numberPrefix === 'EB04' ? 'EB04' : normalized.slice(0, 4)
    }
    return normalized.match(/^(OP\d{2}|EB\d{2}|PRB\d{2}|ST\d{2}|DP\d{2})/)?.[1] || (normalized === 'PROMO' ? 'PROMO' : '')
  }

  for (const language of REFERENCE_TEST_LANGUAGES) {
    const data = catalogue.languages?.[language] || { printings: [] }
    const index = catalogue.indexes?.[language] || {}
    for (const printing of data.printings || []) {
      if (printing.site !== language) continue
      const card = safeMapGet(catalogue.cardsByKey, printing.card_key)
      const cardNumber = card?.number || ''
      if (!cardNumber) continue
      const locator = safeMapGet(index.locatorsByPrinting, printing.key + ':' + printing.site)
      const reference = resolveCatalogueImage({ printing, index, printings: data.printings, language, cardNumber })
      const productLinks = safeMapGet(index.printingProductsByPrinting, printing.key) || []
      const products = [...new Map(productLinks
        .map((link) => safeMapGet(index.productsByKey, link.product_key))
        .filter(Boolean)
        .map((product) => [product.key, product])).values()]
      const observations = (safeMapGet(index.observationsByCard, printing.card_key) || []).filter((item) => !item.superseded_at)
      const observation = observations.reduce((latest, item) =>
        !latest || String(item.first_seen_at || '') > String(latest.first_seen_at || '') ? item : latest, null)
      for (const product of products) {
        const rawSet = setFromProduct(product.code, cardNumber)
        if (!expectedSets.includes(rawSet)) continue
        add({
          id: [printing.key, language, product.key].join(':'),
          printingKey: printing.key,
          cardNumber,
          name: observation?.name || '',
          language,
          targetSet: formatSetCode(rawSet),
          setCode: formatSetCode(rawSet),
          setName: product.name || '',
          rarity: printing.rarity || '',
          variant: printing.variant || '',
          imageUrl: reference.imageUrl || '',
          fallbackImageUrl: reference.fallbackImageUrl || '',
          imageId: locator?.image_id || '',
          source: reference.source,
        })
      }
      // Unlinked products are still meaningful catalogue printing records. Use
      // the card-number set as the explicitly qualified inferred release only
      // when there is no linked product assignment.
      if (!products.length) {
        const inferred = setFromProduct(baseCardNumber(cardNumber).split('-')[0], cardNumber)
        if (expectedSets.includes(inferred)) add({
          id: [printing.key, language, 'unlinked'].join(':'),
          printingKey: printing.key,
          cardNumber,
          name: observation?.name || '',
          language,
          targetSet: formatSetCode(inferred),
          setCode: formatSetCode(inferred),
          setName: 'Unlinked catalogue printing',
          rarity: printing.rarity || '',
          variant: printing.variant || '',
          imageUrl: reference.imageUrl || '',
          fallbackImageUrl: reference.fallbackImageUrl || '',
          imageId: locator?.image_id || '',
          source: reference.source,
        })
      }
    }
  }

  // Include every known official OP-18 printing ID, including parallels.
  for (const language of REFERENCE_TEST_LANGUAGES) {
    for (const printing of OP18_OFFICIAL_PRINTINGS) {
      const exactId = printing.imageId
      const exactUrl = buildOfficialImageProxyUrl(exactId, language)
        || (language === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com') + '/images/cardlist/card/' + encodeURIComponent(exactId) + '.png'
      const baseUrl = printing.imageId !== printing.cardNumber
        ? buildOfficialImageProxyUrl(printing.cardNumber, language)
        : ''
      add({
        id: 'op18-complete:' + language + ':' + printing.imageId,
        printingKey: 'op18:' + printing.imageId,
        imageId: printing.imageId,
        cardNumber: printing.cardNumber,
        name: language === 'jp' ? printing.japaneseName : printing.name,
        language,
        targetSet: 'OP-18',
        setCode: 'OP-18',
        setName: 'The Dominance of God [OP-18]',
        rarity: printing.rarity,
        variant: printing.variantLabel,
        imageUrl: exactUrl,
        fallbackImageUrl: baseUrl,
        source: 'Bandai official OP-18 ' + printing.variantLabel + ' artwork',
      })
    }
  }

  const items = [...rows.values()].filter((item) => item.imageUrl)
    .sort((a, b) => a.targetSet.localeCompare(b.targetSet) || a.language.localeCompare(b.language)
      || a.cardNumber.localeCompare(b.cardNumber, undefined, { numeric: true })
      || String(a.variant).localeCompare(String(b.variant)))
  const missingFromCatalogue = [...rows.values()].filter((item) => !item.imageUrl)
    .map((item) => ({ ...item, status: 'missing-url' }))
  const coverageBySetLanguage = {}
  for (const set of expectedSets) {
    for (const language of REFERENCE_TEST_LANGUAGES) {
      const key = formatSetCode(set) + ':' + language
      const matching = [...rows.values()].filter((item) => item.targetSet === formatSetCode(set) && item.language === language)
      coverageBySetLanguage[key] = { expected: matching.length, withImageUrl: matching.filter((item) => Boolean(item.imageUrl)).length, missingImageUrl: matching.filter((item) => !item.imageUrl).length }
    }
  }
  return {
    expectedTotal: items.length + missingFromCatalogue.length,
    items,
    missingSlots: missingFromCatalogue,
    coverageBySetLanguage,
    checkedAt: new Date().toISOString(),
    auditScope: 'All available catalogue printing/product links in English and Japanese for tracked OP, EB, PRB, ST, DP and promo sets; missing image URLs are reported separately.',
  }
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
      imageUrls: match.imageUrls || [match.imageUrl, match.fallbackImageUrl].filter(Boolean),
      fallbackImageUrl: match.fallbackImageUrl || '',
      source: match.source || match.imageSource || (match.imageUrl.includes('onepiece-cardgame.com') ? 'Bandai' : 'Catalogue source'),
    }))
}
