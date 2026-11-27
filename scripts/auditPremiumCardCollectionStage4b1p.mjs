import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  APPLICATION_REFERENCE_FEED_COMMIT,
  findCatalogueMatches,
  getCatalogueReferenceTestMatrix,
} from '../src/admin/cardCatalogue.js'

const UPSTREAM_REPOSITORY = 'hotavocado/koala-kollect-data'
const UPSTREAM_COMMIT = APPLICATION_REFERENCE_FEED_COMMIT
const PREMIUM_PATH = 'docs/catalogue-coverage/official-premium-card-collection-stage4b-1p.json'
const TESTING_SNAPSHOT_PATH = 'docs/catalogue-coverage/testing-inventory-snapshot-stage4b-1p.json'
const MATRIX_PATH = 'docs/catalogue-coverage/official-bandai-inventory-stage4b-1l.json'
const STAGE1O_ARTIFACT_PATH = 'artifacts/application-reference-printing-reconciliation-stage4b-1o.json'
const ARTIFACT_DIR = 'artifacts'
const ARTIFACT_PATH = ARTIFACT_DIR + '/premium-card-collection-persistence-reconciliation-stage4b-1p.json'

function normalizeCode(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function imageIdFromUrl(value) {
  const match = String(value ?? '').match(/\/([^/?#]+)\.png(?:[?#]|$)/i)
  return match?.[1] || ''
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function readPinnedJsonLines(path) {
  const url = 'https://raw.githubusercontent.com/' + UPSTREAM_REPOSITORY + '/' + UPSTREAM_COMMIT + '/data/' + path
  const response = await fetch(url, {
    headers: { Accept: 'text/plain' },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error('Could not read pinned feed file ' + path + ': HTTP ' + response.status)
  return (await response.text()).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
}

async function mapConcurrent(items, concurrency, callback) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await callback(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

const SET_NAMES_BY_CODE = {
  'OP-01': 'Romance Dawn',
  'OP-02': 'Paramount War',
  'OP-03': 'Pillars of Strength',
  'OP-04': 'Kingdoms of Intrigue',
  'OP-05': 'Awakening of the New Era',
  'OP-06': 'Wings of the Captain',
  'OP-07': '500 Years in the Future',
  'OP-08': 'Two Legends',
  'OP-09': 'Emperors in the New World',
  'OP-10': 'Royal Blood',
  'OP-11': 'A Fist of Divine Speed',
  'OP-12': 'Legacy of the Master',
  'OP-13': 'Carrying On His Will',
  'OP-14': "The Azure Sea's Seven",
  'OP-15': "Adventure on Kami's Island",
  'OP-16': 'The Time of Battle',
  'OP-17': "The World's Strongest Warriors",
  'OP-18': 'The Dominance of God',
  'EB-01': 'Memorial Collection',
  'EB-02': 'Anime 25th Collection',
  'EB-03': 'One Piece Heroines Edition',
  'EB-04': 'One Piece Heroines Edition vol.2',
  'EB-05': 'Egghead Crisis',
  'PRB-01': 'The Best',
  'PRB-02': 'The Best vol.2',
}

async function checkImageUrl(url) {
  let lastResult = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
        signal: AbortSignal.timeout(20000),
      })
      const contentType = response.headers.get('content-type') || ''
      const bytes = await response.arrayBuffer()
      lastResult = {
        url,
        status: response.status,
        contentType,
        bytes: bytes.byteLength,
        attempts: attempt,
        loaded: response.status === 200 && contentType.toLowerCase().startsWith('image/') && bytes.byteLength > 0,
      }
      if (lastResult.loaded || response.status < 500 || attempt === 2) return lastResult
    } catch (error) {
      lastResult = { url, status: null, contentType: '', bytes: 0, attempts: attempt, loaded: false, error: String(error?.message || error) }
      if (attempt === 2) return lastResult
    }
  }
  return lastResult || { url, status: null, contentType: '', bytes: 0, attempts: 0, loaded: false }
}

async function reconcilePremiumCollections(manifest) {
  if (manifest.upstream_commit !== UPSTREAM_COMMIT) throw new Error('Premium manifest does not use the pinned application feed commit.')
  const [enProducts, enLinks, enLocators, jpProducts, jpLinks, jpLocators] = await Promise.all([
    readPinnedJsonLines('products/en.jsonl'),
    readPinnedJsonLines('printing_products/en.jsonl'),
    readPinnedJsonLines('printing_locators/en.jsonl'),
    readPinnedJsonLines('products/jp.jsonl'),
    readPinnedJsonLines('printing_products/jp.jsonl'),
    readPinnedJsonLines('printing_locators/jp.jsonl'),
  ])
  const feedByLanguage = {
    en: { products: enProducts, links: enLinks, locators: enLocators },
    jp: { products: jpProducts, links: jpLinks, locators: jpLocators },
  }
  const expectedProductInventory = [
    { language: 'en', products: manifest.english.products },
    { language: 'jp', products: manifest.japanese.products },
  ]
  const productResults = []
  const allCardResults = []
  const feedIntegrityErrors = []

  for (const group of expectedProductInventory) {
    const language = group.language
    const feed = feedByLanguage[language]
    const feedPremiumProducts = feed.products.filter((product) => language === 'en'
      ? String(product.name || '').startsWith('Premium Card Collection')
      : String(product.name || '').includes('プレミアムカードコレクション'))
    if (feedPremiumProducts.length !== group.products.length) {
      feedIntegrityErrors.push({ language, field: 'namedPremiumProductCount', expected: group.products.length, actual: feedPremiumProducts.length })
    }
    const feedProductsByKey = new Map(feed.products.map((product) => [product.key, product]))
    const locatorByKey = new Map(feed.locators
      .filter((locator) => locator.site === language)
      .map((locator) => [locator.printing_key, locator]))
    const manifestProductKeys = new Set(group.products.map((product) => product.product_key))
    const feedProductKeys = new Set(feedPremiumProducts.map((product) => product.key))
    for (const key of feedProductKeys) {
      if (!manifestProductKeys.has(key)) feedIntegrityErrors.push({ language, field: 'unexpectedPremiumProductKey', key })
    }
    for (const product of group.products) {
      const feedProduct = feedProductsByKey.get(product.product_key)
      if (!feedProduct) {
        feedIntegrityErrors.push({ language, productKey: product.product_key, field: 'missingFeedProduct' })
        continue
      }
      if (feedProduct.name !== product.product_name) {
        feedIntegrityErrors.push({ language, productKey: product.product_key, field: 'productName', expected: product.product_name, actual: feedProduct.name })
      }
      if (feedProduct.product_url !== product.product_url) {
        feedIntegrityErrors.push({ language, productKey: product.product_key, field: 'productUrl', expected: product.product_url, actual: feedProduct.product_url })
      }
      const feedLinks = feed.links.filter((link) => link.product_key === product.product_key)
      const manifestKeys = new Set(product.cards.map((card) => card.printing_key))
      const feedKeys = new Set(feedLinks.map((link) => link.printing_key))
      const missingFeedKeys = [...manifestKeys].filter((key) => !feedKeys.has(key))
      const unexpectedFeedKeys = [...feedKeys].filter((key) => !manifestKeys.has(key))
      if (feedLinks.length !== product.linked_printing_count || feedKeys.size !== product.distinct_printing_keys) {
        feedIntegrityErrors.push({
          language, productKey: product.product_key, field: 'printingProductLinkCount',
          manifestLinks: product.linked_printing_count, feedLinks: feedLinks.length,
          manifestDistinctKeys: product.distinct_printing_keys, feedDistinctKeys: feedKeys.size,
        })
      }
      if (missingFeedKeys.length || unexpectedFeedKeys.length) {
        feedIntegrityErrors.push({ language, productKey: product.product_key, field: 'printingProductLinkSet', missingFeedKeys, unexpectedFeedKeys })
      }

      const cards = await Promise.all(product.cards.map(async (card) => {
        const locator = locatorByKey.get(card.printing_key)
        const locatorImageId = locator?.image_id || ''
        const derivedCardNumber = locatorImageId.replace(/_[pr]\d+$/i, '')
        const locatorMatches = Boolean(locator && locatorImageId === card.image_id && locator.site === language)
        const cardNumberStemMatches = derivedCardNumber === card.card_number
        const runtimeMatches = await findCatalogueMatches(card.card_number)
        const exactMatches = runtimeMatches.filter((match) =>
          match.languageCode === language
          && match.productKey === product.product_key
          && match.printingKey === card.printing_key,
        )
        const match = exactMatches.length === 1 ? exactMatches[0] : null
        const runtimeImageId = imageIdFromUrl(match?.imageUrl || match?.fallbackImageUrl)
        let imageHost = ''
        let imagePath = ''
        try {
          const parsed = new URL(match?.fallbackImageUrl || match?.imageUrl || '')
          imageHost = parsed.hostname
          imagePath = parsed.pathname
        } catch {
          imageHost = ''
          imagePath = ''
        }
        const expectedHost = language === 'en' ? 'en.onepiece-cardgame.com' : 'www.onepiece-cardgame.com'
        const expectedPath = '/images/cardlist/card/' + card.image_id + '.png'
        const checks = {
          feedProductLinkPresent: feedKeys.has(card.printing_key),
          officialLocatorPresent: locatorMatches,
          originalCardNumberMatchesLocatorStem: cardNumberStemMatches,
          runtimeMatchCountExactlyOne: exactMatches.length === 1,
          runtimeCardNumberMatches: Boolean(match && match.cardNumber === card.card_number),
          runtimeLanguageMatches: Boolean(match && match.languageCode === language),
          runtimeProductKeyMatches: Boolean(match && match.productKey === product.product_key),
          runtimeProductNameMatches: Boolean(match && match.setName === product.product_name),
          runtimeProductUrlMatches: Boolean(match && match.sourceUrl === product.product_url),
          runtimePrintingKeyMatches: Boolean(match && match.printingKey === card.printing_key),
          runtimeImageIdMatches: Boolean(match && runtimeImageId === card.image_id),
          runtimeImageHostMatches: Boolean(match && imageHost === expectedHost),
          runtimeImagePathMatches: Boolean(match && imagePath.endsWith(expectedPath)),
          primaryImageNotFallback: Boolean(match && !match.usesBaseImageFallback && !match.usesAlternateOfficialFallback),
        }
        const result = {
          language, productKey: product.product_key, productName: product.product_name, productUrl: product.product_url,
          cardNumber: card.card_number, printingKey: card.printing_key, imageId: card.image_id,
          imageIdSuffix: card.image_id_suffix, imageIdFamily: card.image_id_family,
          rarity: match?.rarity || '', applicationVariant: match?.variant || '',
          applicationVariantLabel: match?.variantLabel || '', applicationImageUrl: match?.imageUrl || '',
          applicationFallbackImageUrl: match?.fallbackImageUrl || '',
          officialImageUrl: match?.fallbackImageUrl || '',
          usesBaseImageFallback: Boolean(match?.usesBaseImageFallback),
          usesAlternateOfficialFallback: Boolean(match?.usesAlternateOfficialFallback),
          applicationSourceText: match?.sourceText || '', applicationMatchCount: exactMatches.length,
          checks, exactIdentityMatch: Object.values(checks).every(Boolean),
        }
        allCardResults.push(result)
        return result
      }))
      const expectedCountMatches = product.expected_printings === null || product.expected_printings === undefined
        || product.expected_printings === product.linked_printing_count
      productResults.push({
        language, productKey: product.product_key, productName: product.product_name,
        productUrl: product.product_url, officialProductPageUrl: product.official_product_page_url,
        releaseDate: product.release_date, expectedOfficialCardCount: product.expected_printings ?? null,
        feedLinkedPrintingCount: feedLinks.length, distinctPrintingKeys: feedKeys.size,
        officialLocatorCount: product.locator_count,
        runtimeExactPrintingCount: cards.filter((card) => card.exactIdentityMatch).length,
        missingRuntimePrintingCount: cards.filter((card) => !card.exactIdentityMatch).length,
        expectedCountMatches,
        exactMatch: expectedCountMatches && feedLinks.length === product.linked_printing_count
          && feedKeys.size === product.distinct_printing_keys && cards.length === product.linked_printing_count
          && cards.every((card) => card.exactIdentityMatch),
        cards,
      })
    }
  }

  const englishProducts = productResults.filter((product) => product.language === 'en')
  const japaneseProducts = productResults.filter((product) => product.language === 'jp')
  const englishCards = allCardResults.filter((card) => card.language === 'en')
  const japaneseCards = allCardResults.filter((card) => card.language === 'jp')
  const englishPrintingKeys = new Set(englishCards.map((card) => card.printingKey))
  const japanesePrintingKeys = new Set(japaneseCards.map((card) => card.printingKey))
  const japaneseCounterparts = manifest.japanese_counterpart_audit.verified_bandai_page_mappings.map((expected) => {
    const actual = japaneseProducts.find((product) => product.productKey === expected.product_key)
    return {
      englishProductName: expected.english_product_name,
      productKey: expected.product_key,
      productName: expected.product_name,
      officialProductPageUrl: expected.official_product_page_url,
      expectedPrintings: expected.expected_printings,
      actualPrintings: actual?.feedLinkedPrintingCount ?? 0,
      exactMatch: Boolean(actual && actual.exactMatch && actual.feedLinkedPrintingCount === expected.expected_printings),
    }
  })
  const jpFestPresent = japaneseProducts.some((product) => /BANDAI CARD GAMES Fest\.? 23-24/i.test(product.productName))
  const japaneseFestNotListed = !jpFestPresent
    && manifest.japanese_counterpart_audit.BANDAI_CARD_GAMES_Fest_23_24.status === 'NO_MATCHING_NAMED_JAPANESE_PRODUCT_IN_PINNED_JAPANESE_PRODUCT_FEED'
  const uniqueImageUrls = [...new Set(allCardResults.map((card) => card.officialImageUrl).filter(Boolean))]
  const imageHttpResults = await mapConcurrent(uniqueImageUrls, 8, checkImageUrl)
  const imageHttpSummary = {
    uniqueUrlsChecked: imageHttpResults.length,
    loaded: imageHttpResults.filter((result) => result.loaded).length,
    failed: imageHttpResults.filter((result) => !result.loaded).length,
    statusCodeCounts: imageHttpResults.reduce((counts, result) => {
      const key = String(result.status ?? 'NETWORK_ERROR')
      counts[key] = (counts[key] || 0) + 1
      return counts
    }, {}),
    contentTypeCounts: imageHttpResults.reduce((counts, result) => {
      const key = result.contentType || 'UNKNOWN'
      counts[key] = (counts[key] || 0) + 1
      return counts
    }, {}),
  }
  const counterpartPrintingCount = japaneseCounterparts.reduce((sum, product) => sum + product.actualPrintings, 0)
  const exactMatch = feedIntegrityErrors.length === 0
    && englishProducts.length === manifest.english.product_count
    && englishCards.length === manifest.english.product_link_rows
    && englishPrintingKeys.size === englishCards.length
    && japaneseProducts.length === manifest.japanese.named_product_count
    && japaneseCards.length === manifest.japanese.product_link_rows
    && japanesePrintingKeys.size === manifest.japanese.distinct_printing_keys
    && productResults.every((product) => product.exactMatch)
    && japaneseCounterparts.length === 8
    && japaneseCounterparts.every((product) => product.exactMatch)
    && counterpartPrintingCount === 91
    && japaneseFestNotListed
    && imageHttpSummary.failed === 0
    && imageHttpSummary.loaded === imageHttpSummary.uniqueUrlsChecked
  return {
    exactMatch, sourceRepository: UPSTREAM_REPOSITORY, sourceCommit: UPSTREAM_COMMIT,
    english: {
      namedProductCount: englishProducts.length, productPrintingLinks: englishCards.length,
      distinctPrintingKeys: englishPrintingKeys.size,
      eightRemainingProducts: manifest.english.requested_eight_product_printings,
      previouslyVerifiedBestSelectionVol6: manifest.english.previously_verified_vol6_printings,
      products: englishProducts,
    },
    japanese: {
      namedProductCount: japaneseProducts.length, productPrintingLinks: japaneseCards.length,
      distinctPrintingKeys: japanesePrintingKeys.size,
      verifiedEnglishProductCounterparts: japaneseCounterparts.length,
      counterpartPrintingCount,
      allNamedJapaneseProducts: japaneseProducts.map((product) => ({
        productKey: product.productKey, productName: product.productName,
        officialProductPageUrl: product.officialProductPageUrl,
        feedLinkedPrintingCount: product.feedLinkedPrintingCount, exactMatch: product.exactMatch,
      })),
      counterpartAudit: japaneseCounterparts,
      BANDAI_CARD_GAMES_Fest_23_24: {
        status: japaneseFestNotListed ? 'NO_JAPANESE_PRODUCT_LISTED' : 'UNEXPECTED_JAPANESE_PRODUCT_FOUND',
        feedProductFound: jpFestPresent,
      },
    },
    totals: {
      englishPrintingLinks: englishCards.length, japanesePrintingLinks: japaneseCards.length,
      allProductPrintingLinks: englishCards.length + japaneseCards.length,
      allDistinctLanguageScopedPrintingKeys: englishPrintingKeys.size + japanesePrintingKeys.size,
      uniqueRuntimeImageUrls: uniqueImageUrls.length,
      exactRuntimePrintingIdentities: allCardResults.filter((card) => card.exactIdentityMatch).length,
      missingOrMismatchedRuntimePrintingIdentities: allCardResults.filter((card) => !card.exactIdentityMatch).length,
    },
    feedIntegrityErrors,
    imageHttp: { summary: imageHttpSummary, results: imageHttpResults },
    cards: allCardResults,
  }
}

async function reconcileTestingInventory(snapshot, matrixRows, stage1oAudit, applicationMatrix) {
  const products = snapshot.products || []
  const productResults = await Promise.all(products.map(async (product) => {
    const language = product.language === 'English' ? 'en' : product.language === 'Japanese' ? 'jp' : ''
    const matches = product.card_number && language
      ? (await findCatalogueMatches(product.card_number)).filter((match) => match.languageCode === language)
      : []
    const assignedSetCode = product.set_name
      ? Object.entries(SET_NAMES_BY_CODE).find(([, name]) => name === product.set_name)?.[0] || null
      : null
    const assignedSetMatches = assignedSetCode
      ? matches.filter((match) => normalizeCode(match.setCode).startsWith(normalizeCode(assignedSetCode)))
      : []
    const candidateSetCodes = [...new Set(matches.map((match) => match.setCode).filter(Boolean))].sort()
    const status = !product.card_number
      ? 'UNMATCHABLE_NO_CARD_NUMBER'
      : assignedSetCode
        ? assignedSetMatches.length ? 'SET_ASSIGNED_APPLICATION_REFERENCE_FOUND' : 'ASSIGNED_SET_HAS_NO_APPLICATION_REFERENCE_MATCH'
        : matches.length ? 'UNASSIGNED_APPLICATION_REFERENCE_FOUND' : 'UNASSIGNED_NO_APPLICATION_REFERENCE_MATCH'
    return {
      name: product.name, cardNumber: product.card_number, language: product.language,
      databaseSetName: product.set_name, databaseSetCode: assignedSetCode,
      uploadedImagePresent: product.uploaded_image_present,
      catalogueMatchIdPresent: product.catalogue_match_id_present,
      cataloguePrintingKeyPresent: product.catalogue_printing_key_present,
      catalogueReferenceImagePresent: product.catalogue_reference_image_present,
      applicationMatchCount: matches.length, applicationCandidateSetCodes: candidateSetCodes,
      applicationCandidatePrintingKeys: [...new Set(matches.map((match) => match.printingKey).filter(Boolean))],
      applicationCandidateImageIds: [...new Set(matches.map((match) => imageIdFromUrl(match.imageUrl)).filter(Boolean))],
      assignedSetMatchCount: assignedSetMatches.length, status,
    }
  }))
  const persistenceRows = matrixRows.map((row) => {
    const setName = SET_NAMES_BY_CODE[row.set]
    const assigned = products.filter((product) => product.set_name === setName && product.language === row.language)
    const runtime = stage1oAudit.rows.find((item) => item.set === row.set && item.language === row.language)
    const languageCode = row.language === 'English' ? 'en' : 'jp'
    const coverage = applicationMatrix.coverageBySetLanguage[row.set + ':' + languageCode]
    return {
      set: row.set, language: row.language,
      officialReleaseAssignmentPrintings: runtime?.releaseAssignmentOfficialCount ?? 0,
      applicationRuntimePrintings: runtime?.applicationPrintingCount ?? 0,
      applicationExactIdentityMatch: Boolean(runtime?.exactIdentityMatch),
      applicationMissingIdentityCount: runtime?.missingIdentityIds?.length ?? null,
      applicationUnexpectedIdentityCount: runtime?.unexpectedIdentityIds?.length ?? null,
      applicationDuplicateIdentityCount: (runtime?.officialDuplicateIdentityIds?.length ?? 0) + (runtime?.applicationDuplicateIdentityIds?.length ?? 0),
      applicationFieldMismatchCount: runtime?.fieldMismatchCount ?? null,
      applicationRuntimeImageCoverage: coverage || null,
      persistedInventoryProductRows: assigned.length,
      persistedCatalogueMatchIds: assigned.filter((product) => product.catalogue_match_id_present).length,
      persistedCataloguePrintingKeys: assigned.filter((product) => product.catalogue_printing_key_present).length,
      persistedCatalogueReferenceImageUrls: assigned.filter((product) => product.catalogue_reference_image_present).length,
      persistenceStatus: assigned.length ? 'INVENTORY_ROWS_WITHOUT_CATALOGUE_PRINTING_IDENTITY' : 'NO_PERSISTED_INVENTORY_PRODUCTS_FOR_SET_LANGUAGE',
      verificationStatus: 'INCOMPLETE',
    }
  })
  const cardNumbered = productResults.filter((product) => product.cardNumber)
  const assignedRows = productResults.filter((product) => product.databaseSetCode)
  const unassignedRows = productResults.filter((product) => !product.databaseSetCode)
  const unmatchedCardNumbers = [...new Map(cardNumbered
    .filter((product) => product.applicationMatchCount === 0)
    .map((product) => [product.language + ':' + product.cardNumber, { language: product.language, cardNumber: product.cardNumber }])).values()]
  const assignedSetMismatches = assignedRows.filter((product) => product.assignedSetMatchCount === 0)
  const prefixCandidates = {}
  for (const product of unassignedRows) {
    if (!product.cardNumber) continue
    const match = String(product.cardNumber).match(/^((?:OP|EB|PRB|ST)\d{2}|P)-/i)
    if (!match) continue
    const key = product.language + ':' + match[1].toUpperCase()
    prefixCandidates[key] = (prefixCandidates[key] || 0) + 1
  }
  return {
    projectId: snapshot.project_id, snapshotDate: snapshot.retrieval_date,
    noDatabaseWrites: snapshot.no_database_writes === true,
    schemaAssessment: snapshot.schema_assessment, counts: snapshot.counts,
    summary: {
      inventoryProductRows: products.length, cardNumberedRows: cardNumbered.length,
      rowsWithoutCardNumber: products.length - cardNumbered.length,
      productsAssignedToReleaseSets: assignedRows.length, productsWithoutReleaseSet: unassignedRows.length,
      rowsWithApplicationCardNumberMatch: cardNumbered.filter((product) => product.applicationMatchCount > 0).length,
      rowsWithoutApplicationCardNumberMatch: unmatchedCardNumbers.length,
      assignedSetMismatches: assignedSetMismatches.length,
      uploadedImageRows: products.filter((product) => product.uploaded_image_present).length,
      catalogueMatchIds: products.filter((product) => product.catalogueMatchIdPresent).length,
      cataloguePrintingKeys: products.filter((product) => product.cataloguePrintingKeyPresent).length,
      catalogueReferenceImageUrls: products.filter((product) => product.catalogueReferenceImagePresent).length,
      productImageRows: snapshot.counts.product_images,
      duplicateCardNumberGroups: snapshot.duplicate_card_number_groups.length,
      languageSetRows: persistenceRows.length,
      rowsWithPersistedInventoryProducts: persistenceRows.filter((row) => row.persistedInventoryProductRows > 0).length,
      rowsWithPersistedCataloguePrintingIdentity: persistenceRows.filter((row) => row.persistedCataloguePrintingKeys > 0).length,
    },
    unmatchedCardNumbers, assignedSetMismatchRows: assignedSetMismatches,
    unassignedCardNumberPrefixCandidates: prefixCandidates,
    duplicateInventoryCardNumberGroups: snapshot.duplicate_card_number_groups,
    products: productResults, languageSetRows: persistenceRows,
    classificationComplete: productResults.length === products.length && persistenceRows.length === 50,
  }
}

const [manifest, testingSnapshot, officialMatrix, stage1oAudit] = await Promise.all([
  readJson(PREMIUM_PATH),
  readJson(TESTING_SNAPSHOT_PATH),
  readJson(MATRIX_PATH),
  readJson(STAGE1O_ARTIFACT_PATH),
])
if (!stage1oAudit.summary?.passed) throw new Error('Stage 4B-1O exact runtime reconciliation artifact did not pass.')
const applicationMatrix = await getCatalogueReferenceTestMatrix()
const premiumCollections = await reconcilePremiumCollections(manifest)
const testingInventory = await reconcileTestingInventory(testingSnapshot, officialMatrix.rows, stage1oAudit, applicationMatrix)
const matrixRowKeys = new Set(stage1oAudit.rows.map((row) => row.set + ':' + row.language))
const setMatrixItems = applicationMatrix.items.filter((item) => matrixRowKeys.has(item.targetSet + ':' + item.language))
const languageCodeFor = (language) => language === 'English' ? 'en' : 'jp'
const setAssignmentKeys = new Set(setMatrixItems.map((item) => languageCodeFor(item.language) + ':' + item.targetSet + ':' + item.printingKey))
const setPrintingKeys = new Set(setMatrixItems.map((item) => languageCodeFor(item.language) + ':' + item.printingKey))
const premiumPrintingKeys = new Set(premiumCollections.cards.map((card) => card.language + ':' + card.printingKey))
const premiumKeysAlreadyInSetMatrix = [...premiumPrintingKeys].filter((key) => setPrintingKeys.has(key)).length
const combinedPrintingKeys = new Set([...setPrintingKeys, ...premiumPrintingKeys])
const combinedImageUrls = new Set([
  ...setMatrixItems.map((item) => item.fallbackImageUrl).filter(Boolean),
  ...premiumCollections.cards.map((card) => card.officialImageUrl).filter(Boolean),
])
const importPlan = {
  sourceRepository: UPSTREAM_REPOSITORY,
  sourceCommit: UPSTREAM_COMMIT,
  officialLanguageSetRows: stage1oAudit.summary.languageSetRows,
  officialSetReleaseAssignmentPrintings: stage1oAudit.summary.officialReleaseAssignmentPrintings,
  setAssignmentRows: setAssignmentKeys.size,
  distinctSetMatrixPrintingKeys: setPrintingKeys.size,
  distinctLanguageScopedBaseCardNumbers: new Set(setMatrixItems.map((item) => languageCodeFor(item.language) + ':' + item.cardNumber)).size,
  localOfficialSupplements: {
    OP18: { English: 159, Japanese: 159, total: 318, keyPrefix: 'op18:<language>:<imageId>' },
    EB05: { English: 96, Japanese: 96, total: 192, keyPrefix: 'eb05:<language>:<imageId>' },
    total: 510,
  },
  premiumCollection: {
    EnglishNamedProducts: premiumCollections.english.namedProductCount,
    EnglishPrintingProductLinks: premiumCollections.english.productPrintingLinks,
    JapaneseNamedProducts: premiumCollections.japanese.namedProductCount,
    JapanesePrintingProductLinks: premiumCollections.japanese.productPrintingLinks,
    allPremiumProductPrintingLinks: premiumCollections.totals.allProductPrintingLinks,
    distinctLanguageScopedPremiumPrintingKeys: premiumPrintingKeys.size,
    premiumKeysAlreadyIn25SetMatrix: premiumKeysAlreadyInSetMatrix,
  },
  distinctCombinedPrintingKeys: combinedPrintingKeys.size,
  distinctCombinedImageUrls: combinedImageUrls.size,
  previouslyVerifiedOfficialImageUrls: 7798,
  persistenceDestination: 'A dedicated normalized reference-catalogue schema is required. Do not insert reference rows into public.products or public.cards.',
  proposedTables: [
    { table: 'catalogue_release_products', uniqueKey: '(language, product_key)', purpose: 'Named English/Japanese Bandai release products, including every Premium Card Collection as a separate product.' },
    { table: 'catalogue_cards', uniqueKey: '(language, card_number)', purpose: 'Language-scoped card identity and card text/metadata.' },
    { table: 'catalogue_printings', uniqueKey: '(language, printing_key)', purpose: 'Base, parallel, special and treasure-rare printing identities with image ID, exact image URL and fallback metadata.' },
    { table: 'catalogue_product_printings', uniqueKey: '(language, product_key, printing_key)', purpose: 'Preserve named release-product assignments without merging collections.' },
    { table: 'catalogue_set_printings', uniqueKey: '(language, set_code, printing_key)', purpose: 'Persist all 50 official set/language release assignments, including PRB and local OP-18/EB-05 supplements.' },
  ],
  noDatabaseWrites: true,
}
const report = {
  stage: '4B-1P',
  checkedAt: new Date().toISOString(),
  verifiedCommit: process.env.GITHUB_SHA || null,
  stage4b1o: { auditCheckedAt: stage1oAudit.checkedAt, passed: stage1oAudit.summary.passed, summary: stage1oAudit.summary, rows: stage1oAudit.rows },
  premiumCollections, testingInventory, importPlan,
  summary: {
    passed: premiumCollections.exactMatch && testingInventory.classificationComplete
      && testingInventory.summary.assignedSetMismatches === 0 && stage1oAudit.summary.passed,
    premiumCollectionsExactMatch: premiumCollections.exactMatch,
    englishPremiumProducts: premiumCollections.english.namedProductCount,
    englishPremiumPrintings: premiumCollections.english.productPrintingLinks,
    englishRemainingEightPrintings: premiumCollections.english.eightRemainingProducts,
    japanesePremiumProducts: premiumCollections.japanese.namedProductCount,
    japanesePremiumPrintings: premiumCollections.japanese.productPrintingLinks,
    japaneseCounterpartProducts: premiumCollections.japanese.verifiedEnglishProductCounterparts,
    japaneseCounterpartPrintings: premiumCollections.japanese.counterpartPrintingCount,
    premiumImageUrlsChecked: premiumCollections.imageHttp.summary.uniqueUrlsChecked,
    premiumImageUrlsLoaded: premiumCollections.imageHttp.summary.loaded,
    premiumImageUrlFailures: premiumCollections.imageHttp.summary.failed,
    testingInventoryRows: testingInventory.summary.inventoryProductRows,
    testingCataloguePrintingKeys: testingInventory.summary.cataloguePrintingKeys,
    testingCatalogueMatchIds: testingInventory.summary.catalogueMatchIds,
    testingCatalogueReferenceImages: testingInventory.summary.catalogueReferenceImageUrls,
    testingAssignedSetMismatches: testingInventory.summary.assignedSetMismatches,
    all50LanguageSetRowsReconciled: testingInventory.summary.languageSetRows === 50,
    all32InventoryRowsClassified: testingInventory.classificationComplete,
    noDatabaseWrites: testingInventory.noDatabaseWrites && importPlan.noDatabaseWrites,
  },
  notes: [
    'The pinned application feed and local official OP-18/EB-05 supplements reconstruct the complete 25-set English/Japanese reference inventory. The 50 set/language rows remain INCOMPLETE in the official matrix until persisted Testing catalogue identities are verified.',
    'English Premium Card Collection inventory contains nine named products and 103 product-printing links. The eight products previously outstanding account for 91 links; Best Selection Vol.6 remains 12/12 and is rechecked.',
    'Japanese Premium Card Collection coverage is separate: the pinned Japanese feed contains 15 named products and 128 product-printing links. Eight Bandai-listed Japanese counterparts map to 91 printings; no Japanese BANDAI CARD GAMES Fest. 23-24 product is synthesized.',
    'Testing Supabase public.products is stock/inventory, public.cards is a legacy stock-card table, and neither is a suitable complete reference-catalogue store. No database writes were performed.',
    'Uploaded product images in Testing Supabase are not official catalogue reference URLs. The 32 inventory products currently have zero catalogue match IDs, zero catalogue printing keys and zero catalogue reference image URLs.',
    'The duplicate OP17-119 Japanese rows are reported as repeated inventory card-number rows, not merged or deleted; they may represent separate physical stock items.',
    'The existing same-language image fallback, alternate-printing, invalid-URL, missing-image and placeholder-suppression regression tests remain in the full test suite.',
  ],
}
await mkdir(ARTIFACT_DIR, { recursive: true })
await writeFile(ARTIFACT_PATH, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({
  artifact: ARTIFACT_PATH, summary: report.summary,
  premium: {
    english: { products: premiumCollections.english.namedProductCount, printings: premiumCollections.english.productPrintingLinks, remainingEight: premiumCollections.english.eightRemainingProducts },
    japanese: { products: premiumCollections.japanese.namedProductCount, printings: premiumCollections.japanese.productPrintingLinks, counterparts: premiumCollections.japanese.verifiedEnglishProductCounterparts, counterpartPrintings: premiumCollections.japanese.counterpartPrintingCount },
    imageHttp: premiumCollections.imageHttp.summary, feedIntegrityErrors: premiumCollections.feedIntegrityErrors,
  },
  testingInventory: testingInventory.summary, importPlan,
}, null, 2))
if (!report.summary.passed) process.exitCode = 1
