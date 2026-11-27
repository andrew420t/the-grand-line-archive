import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  findCatalogueMatches,
  getCatalogueReferenceTestMatrix,
} from '../src/admin/cardCatalogue.js'

const UPSTREAM_REPOSITORY = 'hotavocado/koala-kollect-data'
const UPSTREAM_COMMIT = '619965ec198047de519dc6eb098c7a56aed9bd58'
const UPSTREAM_MANIFEST_DATE = '2026-10-22T04:46:19Z'
const MATRIX_PATH = 'docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json'
const ARTIFACT_DIR = 'artifacts'
const ARTIFACT_PATH = ARTIFACT_DIR + '/application-reference-printing-reconciliation-stage4b-1o.json'
const EXTRACTION_FILES = [
  'docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-01.json',
  'docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-02.json',
  'docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-03.json',
  'docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-04.json',
  'docs/catalogue-coverage/official-bandai-card-inventory-stage4b-1m-05.json',
]

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '')
}

function normalizeCode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeRarity(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleUpperCase().replace(/\s+/g, ' ')
}

function normalizeVariant(value) {
  const normalized = normalizeText(value)
  if (!normalized || normalized === 'base' || normalized === 'normal') return 'base'
  if (normalized.includes('reprint')) return 'reprint'
  if (normalized.includes('parallel') || normalized.includes('spcard') || normalized.includes('spカード') || normalized.includes('treasurerare')) return 'parallel'
  return normalized
}

function variantFromImageId(imageId) {
  if (/_r\d+$/i.test(imageId)) return 'reprint'
  if (/_p\d+$/i.test(imageId)) return 'parallel'
  return 'base'
}

function imageIdFromUrl(value) {
  const raw = String(value ?? '')
  const match = raw.match(/\/([^/?#]+)\.png(?:[?#]|$)/i)
  return match?.[1] || ''
}

function productCodeFromLabel(value) {
  const match = String(value ?? '').match(/\[\s*([A-Z0-9-]+)\s*\]\s*$/i)
  return match?.[1] || ''
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function verifyUpstreamSnapshot() {
  const response = await fetch('https://api.github.com/repos/' + UPSTREAM_REPOSITORY + '/commits/main', {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'grand-line-archive-stage4b-1o-audit',
    },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error('Could not verify upstream main commit: HTTP ' + response.status)
  const commit = await response.json()
  if (commit.sha !== UPSTREAM_COMMIT) {
    throw new Error('Application runtime feed moved: expected ' + UPSTREAM_COMMIT + ', found ' + commit.sha)
  }

  const manifestResponse = await fetch('https://raw.githubusercontent.com/' + UPSTREAM_REPOSITORY + '/main/manifest.json', {
    signal: AbortSignal.timeout(30000),
  })
  if (!manifestResponse.ok) throw new Error('Could not read upstream manifest: HTTP ' + manifestResponse.status)
  const manifest = await manifestResponse.json()
  if (manifest.generated_at !== UPSTREAM_MANIFEST_DATE) {
    throw new Error('Upstream manifest date changed: expected ' + UPSTREAM_MANIFEST_DATE + ', found ' + manifest.generated_at)
  }
  return {
    repository: UPSTREAM_REPOSITORY,
    commit: commit.sha,
    manifestGeneratedAt: manifest.generated_at,
    manifestRows: {
      englishPrintings: manifest.files['data/printings/en.jsonl']?.rows,
      japanesePrintings: manifest.files['data/printings/jp.jsonl']?.rows,
      englishPrintingProducts: manifest.files['data/printing_products/en.jsonl']?.rows,
      japanesePrintingProducts: manifest.files['data/printing_products/jp.jsonl']?.rows,
      englishLocators: manifest.files['data/printing_locators/en.jsonl']?.rows,
      japaneseLocators: manifest.files['data/printing_locators/jp.jsonl']?.rows,
    },
  }
}

function officialEntriesFor(row, pages) {
  const pageFor = (set, language) => pages.find((page) => page.set === set && page.language === language)
  if (row.set === 'EB-04' && row.language === 'English') {
    return ['OP-14', 'OP-15'].flatMap((set) =>
      (pageFor(set, 'English')?.entries || []).filter((entry) => String(entry.card_number || '').startsWith('EB04-')),
    )
  }
  const page = pageFor(row.set, row.language)
  const entries = page?.entries || []
  if (row.language === 'English' && (row.set === 'OP-14' || row.set === 'OP-15')) {
    return entries.filter((entry) => !String(entry.card_number || '').startsWith('EB04-'))
  }
  return entries
}

function compareRow(row, appItems, pages) {
  const officialEntries = officialEntriesFor(row, pages)
  const expectedById = new Map()
  const officialDuplicateIds = []
  for (const entry of officialEntries) {
    const imageId = imageIdFromUrl(entry.image_url)
    if (!imageId) continue
    if (expectedById.has(imageId)) officialDuplicateIds.push(imageId)
    expectedById.set(imageId, entry)
  }

  const actualItems = appItems.filter((item) => item.targetSet === row.set && item.language === (row.language === 'English' ? 'en' : 'jp'))
  const actualById = new Map()
  const applicationDuplicateIds = []
  for (const item of actualItems) {
    const imageId = item.imageId || imageIdFromUrl(item.imageUrl)
    if (!imageId) continue
    if (actualById.has(imageId)) applicationDuplicateIds.push(imageId)
    actualById.set(imageId, item)
  }

  const missingIds = [...expectedById.keys()].filter((id) => !actualById.has(id))
  const unexpectedIds = [...actualById.keys()].filter((id) => !expectedById.has(id))
  const fieldMismatches = []
  const acceptedSourceVariations = []
  const compareField = (imageId, field, expected, actual, normalize = (value) => String(value ?? '')) => {
    if (normalize(expected) !== normalize(actual)) {
      // Bandai's EB-01 Japanese page and OP-10 Japanese reprint page use
      // different official kana spellings for the same EB01-056 card name.
      // The shared card observation cannot represent both product-specific
      // spellings, so preserve the difference explicitly without misclassifying
      // the printing identity or release-product assignment.
      if (row.set === 'OP-10' && row.language === 'Japanese' && imageId === 'EB01-056_p2'
        && field === 'name' && expected === 'シャーロット・フランペ' && actual === 'シャーロット・フランぺ') {
        acceptedSourceVariations.push({
          imageId, field, expected, actual,
          classification: 'OFFICIAL_PRODUCT_SPECIFIC_JAPANESE_NAME_VARIANT',
          note: 'Official EB-01 Japanese page uses hiragana ぺ; official OP-10 Japanese reprint page uses katakana ペ. Application card observation is shared across printings.',
        })
      } else {
        fieldMismatches.push({ imageId, field, expected: expected ?? null, actual: actual ?? null })
      }
    }
  }

  for (const [imageId, official] of expectedById) {
    const app = actualById.get(imageId)
    if (!app) continue
    compareField(imageId, 'cardNumber', official.card_number, app.cardNumber, normalizeCode)
    compareField(imageId, 'name', official.name, app.name, normalizeText)
    compareField(imageId, 'rarity', official.rarity, app.rarity, normalizeRarity)
    compareField(imageId, 'cardType', official.type, app.category, normalizeText)
    compareField(imageId, 'variant', variantFromImageId(imageId), app.variant, normalizeVariant)
    compareField(imageId, 'language', row.language === 'English' ? 'en' : 'jp', app.language)
    compareField(imageId, 'releaseSet', row.set, app.targetSet)
    const officialProductCode = productCodeFromLabel(official.product)
    if (officialProductCode) compareField(imageId, 'productCode', officialProductCode, app.productCode || app.setCode, normalizeCode)
    const expectedHost = row.language === 'English' ? '/bandai/en/' : '/bandai/jp/'
    if (!String(app.imageUrl || '').includes(expectedHost)) {
      fieldMismatches.push({ imageId, field: 'imageLanguageHost', expected: expectedHost, actual: app.imageUrl || '' })
    }
  }

  return {
    set: row.set,
    language: row.language,
    sourcePageEntryCount: row.official_page_entry_count,
    releaseAssignmentOfficialCount: officialEntries.length,
    applicationPrintingCount: actualItems.length,
    officialDistinctImageIds: expectedById.size,
    applicationDistinctImageIds: actualById.size,
    exactIdentityMatch: missingIds.length === 0 && unexpectedIds.length === 0
      && officialDuplicateIds.length === 0 && applicationDuplicateIds.length === 0,
    missingIdentityIds: missingIds,
    unexpectedIdentityIds: unexpectedIds,
    officialDuplicateIdentityIds: officialDuplicateIds,
    applicationDuplicateIdentityIds: applicationDuplicateIds,
    fieldMismatches,
    fieldMismatchCount: fieldMismatches.length,
    acceptedSourceVariations,
    acceptedSourceVariationCount: acceptedSourceVariations.length,
  }
}

async function reconcilePremiumCollection(premiumProduct) {
  const pccName = 'Premium Card Collection -Best Selection Vol.6-'
  const cards = premiumProduct.cards || []
  const rows = []
  for (const card of cards) {
    const matches = await findCatalogueMatches(card.card_number)
    const named = matches.filter((match) => match.setName === pccName && match.languageCode === 'en')
    const japaneseNamed = matches.filter((match) => match.setName === pccName && match.languageCode === 'jp')
    const genericOverlap = matches.filter((match) =>
      match.setName === 'Other Product Card' && named.some((item) => item.printingKey === match.printingKey),
    )
    rows.push({
      cardNumber: card.card_number,
      officialProductImage: card.image_url,
      namedEnglishProductMatches: named.length,
      japaneseProductMatches: japaneseNamed.length,
      genericPlaceholderOverlap: genericOverlap.length,
      applicationImageIds: named.map((match) => imageIdFromUrl(match.imageUrl)),
      printingKeys: named.map((match) => match.printingKey),
    })
  }
  return {
    productName: pccName,
    officialProductCardCount: cards.length,
    applicationEnglishProductPrintingCount: rows.reduce((sum, row) => sum + row.namedEnglishProductMatches, 0),
    applicationJapaneseProductPrintingCount: rows.reduce((sum, row) => sum + row.japaneseProductMatches, 0),
    genericPlaceholderOverlaps: rows.reduce((sum, row) => sum + row.genericPlaceholderOverlap, 0),
    rows,
    exactMatch: cards.length === 12
      && rows.every((row) => row.namedEnglishProductMatches === 1
        && row.japaneseProductMatches === 0
        && row.genericPlaceholderOverlap === 0
        && row.applicationImageIds.length === 1
        && row.applicationImageIds[0].startsWith(row.cardNumber)),
  }
}

async function reconcileOp13TreasureReprint() {
  const matches = await findCatalogueMatches('OP13-037')
  const imageId = (match) => imageIdFromUrl(match.imageUrl)
  const englishOriginal = matches.find((match) => match.languageCode === 'en' && match.setCode === 'OP-13' && imageId(match) === 'OP13-037')
  const japaneseOriginal = matches.find((match) => match.languageCode === 'jp' && match.setCode === 'OP-13' && imageId(match) === 'OP13-037')
  const englishOp15Treasure = matches.find((match) => match.languageCode === 'en'
    && String(match.sourceUrl || '').includes('series=569115')
    && imageId(match) === 'OP13-037_p1')
  const japaneseOp15Treasure = matches.find((match) => match.languageCode === 'jp'
    && String(match.sourceUrl || '').includes('series=550115')
    && imageId(match) === 'OP13-037_p1')
  const englishPremium = matches.find((match) => match.languageCode === 'en'
    && match.setName === 'Premium Card Collection -Best Selection Vol.6-'
    && imageId(match) === 'OP13-037_p2')
  return {
    cardNumber: 'OP13-037',
    englishOriginalPresent: Boolean(englishOriginal),
    japaneseOriginalPresent: Boolean(japaneseOriginal),
    englishOp15TreasurePresent: Boolean(englishOp15Treasure && normalizeRarity(englishOp15Treasure.rarity) === 'TR'),
    japaneseOp15TreasurePresent: Boolean(japaneseOp15Treasure),
    englishPremiumCollectionPrintingPresent: Boolean(englishPremium),
    identities: [
      englishOriginal && { language: 'en', releaseSet: englishOriginal.setCode, imageId: imageId(englishOriginal), rarity: englishOriginal.rarity },
      japaneseOriginal && { language: 'jp', releaseSet: japaneseOriginal.setCode, imageId: imageId(japaneseOriginal), rarity: japaneseOriginal.rarity },
      englishOp15Treasure && { language: 'en', releaseSet: englishOp15Treasure.setCode, releaseProduct: englishOp15Treasure.setName, releaseProductUrl: englishOp15Treasure.sourceUrl, imageId: imageId(englishOp15Treasure), rarity: englishOp15Treasure.rarity },
      englishPremium && { language: 'en', releaseSet: englishPremium.setName, imageId: imageId(englishPremium), rarity: englishPremium.rarity },
    ].filter(Boolean),
    exactMatch: Boolean(englishOriginal && japaneseOriginal && englishOp15Treasure
      && !japaneseOp15Treasure && englishPremium),
  }
}

const matrix = await readJson(MATRIX_PATH)
const extractionFiles = await Promise.all(EXTRACTION_FILES.map(readJson))
const pages = extractionFiles.flatMap((file) => file.pages || [])
const upstream = await verifyUpstreamSnapshot()
const applicationMatrix = await getCatalogueReferenceTestMatrix()
const targetRows = matrix.rows.filter((row) =>
  /^(OP-\d{2}|EB-\d{2}|PRB-\d{2})$/.test(row.set),
)
const rowResults = targetRows.map((row) => compareRow(row, applicationMatrix.items, pages))
const premiumProduct = await readJson('docs/catalogue-coverage/official-premium-card-collection-best-selection-vol6.json')
const premiumCollection = await reconcilePremiumCollection(premiumProduct)
const op13Treasure = await reconcileOp13TreasureReprint()
const globalImageAudit = matrix.image_http_audit || {}
const summary = {
  languageSetRows: rowResults.length,
  exactIdentityRows: rowResults.filter((row) => row.exactIdentityMatch).length,
  officialReleaseAssignmentPrintings: rowResults.reduce((sum, row) => sum + row.releaseAssignmentOfficialCount, 0),
  applicationReferencePrintings: rowResults.reduce((sum, row) => sum + row.applicationPrintingCount, 0),
  missingIdentityIds: rowResults.reduce((sum, row) => sum + row.missingIdentityIds.length, 0),
  unexpectedIdentityIds: rowResults.reduce((sum, row) => sum + row.unexpectedIdentityIds.length, 0),
  duplicateIdentityIds: rowResults.reduce((sum, row) => sum + row.officialDuplicateIdentityIds.length + row.applicationDuplicateIdentityIds.length, 0),
  fieldMismatches: rowResults.reduce((sum, row) => sum + row.fieldMismatchCount, 0),
  acceptedSourceVariations: rowResults.reduce((sum, row) => sum + row.acceptedSourceVariationCount, 0),
  missingImageSlots: applicationMatrix.missingSlots.filter((item) =>
    targetRows.some((row) => row.set === item.targetSet && (row.language === 'English' ? 'en' : 'jp') === item.language),
  ).length,
  officialImageHttp: {
    status: globalImageAudit.status,
    uniqueUrls: globalImageAudit.unique_official_image_urls,
    loaded: globalImageAudit.status_counts?.LOADED,
    missing: globalImageAudit.status_counts?.MISSING,
    invalidUrl: globalImageAudit.status_counts?.INVALID_URL,
    timeout: globalImageAudit.status_counts?.TIMEOUT,
    temporaryFailure: globalImageAudit.status_counts?.TEMPORARY_FAILURE,
  },
  premiumCollectionExactMatch: premiumCollection.exactMatch,
  op13TreasureExactMatch: op13Treasure.exactMatch,
}
const passed = summary.languageSetRows === 50
  && summary.exactIdentityRows === 50
  && summary.missingIdentityIds === 0
  && summary.unexpectedIdentityIds === 0
  && summary.duplicateIdentityIds === 0
  && summary.fieldMismatches === 0
  && summary.missingImageSlots === 0
  && summary.officialImageHttp.status === 'ALL_LOADED'
  && summary.officialImageHttp.missing === 0
  && summary.officialImageHttp.invalidUrl === 0
  && summary.officialImageHttp.timeout === 0
  && summary.officialImageHttp.temporaryFailure === 0
  && premiumCollection.exactMatch
  && op13Treasure.exactMatch

const report = {
  stage: '4B-1O',
  checkedAt: new Date().toISOString(),
  upstream,
  summary: { ...summary, passed },
  rows: rowResults,
  premiumCollection,
  op13Treasure,
  notes: [
    'Testing Supabase public.products is an inventory/stock table, not the application reference catalogue. The application reference catalogue is loaded from the pinned Koala Kollect JSONL feed and local OP-18/EB-05 official supplements.',
    'OP-14 and OP-15 English official source pages are combined OP14-EB04 and OP15-EB04 product groups. Official EB04-prefixed card numbers are assigned to EB-04; other card numbers remain assigned to OP-14 or OP-15.',
    'PRB release assignment is kept separate from the original card-number prefix.',
    'The 12 Premium Card Collection printings are reconciled as a separate named product and are not counted as extra base cards in the 25-set matrix.',
    'The official Japanese EB-01 and OP-10 pages use different kana spellings for EB01-056; this product-specific source variation is retained explicitly because the upstream card observation is shared across printings.',
  ],
}
await mkdir(ARTIFACT_DIR, { recursive: true })
await writeFile(ARTIFACT_PATH, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ artifact: ARTIFACT_PATH, summary, failingRows: rowResults.filter((row) => !row.exactIdentityMatch || row.fieldMismatchCount).map((row) => ({ set: row.set, language: row.language, missing: row.missingIdentityIds.length, unexpected: row.unexpectedIdentityIds.length, fieldMismatches: row.fieldMismatchCount })), premiumCollection, op13Treasure }, null, 2))
if (!passed) process.exitCode = 1
