export const CATALOGUE_IDENTITY_FIELDS = [
  'catalogue_match_id',
  'catalogue_printing_key',
  'catalogue_reference_image_url',
  'catalogue_reference_image_source',
  'reference_image_url',
  'reference_printing_key',
  'reference_match_id',
  'reference_image_source',
]

export function normalizeSetCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function findSetCodeMatches(sets, code) {
  const normalized = normalizeSetCode(code)
  if (!normalized) return []
  return sets.filter((set) => normalizeSetCode(set.code) === normalized)
}

export function resolveSetIdForCode(sets, code) {
  const matches = findSetCodeMatches(sets, code)
  // Do not silently attach a product to an arbitrary set when legacy data
  // contains multiple rows whose codes normalize to the same value.
  return matches.length === 1 ? matches[0].id || '' : ''
}

export function buildQuickAddFieldUpdate(current, field, value, sets = []) {
  const identityChanged = ['card_number', 'set_code', 'language', 'variant_label'].includes(field)
    && String(current?.[field] || '').trim().toLocaleLowerCase() !== String(value || '').trim().toLocaleLowerCase()
  return {
    ...current,
    [field]: value,
    ...(field === 'set_code' ? { set_id: resolveSetIdForCode(sets, value) } : {}),
    ...(identityChanged ? Object.fromEntries(CATALOGUE_IDENTITY_FIELDS.map((key) => [key, ''])) : {}),
  }
}

export const EXTENDED_CARD_COLUMNS = [
  'color',
  'power',
  'cost',
  'card_type',
  'effect_text',
  'counter',
  'trigger_text',
  'attributes',
  'language',
  'classification',
  'variant_label',
  'catalogue_match_id',
  'catalogue_printing_key',
  'catalogue_reference_image_url',
  'catalogue_reference_image_source',
]


const normalizedIdentity = (value) => String(value || '').trim().toLocaleLowerCase()

const normalizedLanguage = (value) => {
  const language = normalizedIdentity(value)
  if (['en', 'eng', 'english'].includes(language)) return 'english'
  if (['ja', 'jp', 'jpn', 'japanese'].includes(language)) return 'japanese'
  if (['zh', 'cn', 'chinese'].includes(language)) return 'chinese'
  if (['ko', 'kr', 'korean'].includes(language)) return 'korean'
  return language
}

export function classifyPrintingDuplicate(existing, candidate) {
  const existingPrintingKey = normalizedIdentity(existing.catalogue_printing_key)
  const candidatePrintingKey = normalizedIdentity(candidate.catalogue_printing_key)
  const existingLanguage = normalizedLanguage(existing.language)
  const candidateLanguage = normalizedLanguage(candidate.language)

  if (existingPrintingKey && candidatePrintingKey) {
    if (existingPrintingKey !== candidatePrintingKey) return 'distinct'
    if (existingLanguage && candidateLanguage && existingLanguage !== candidateLanguage) return 'distinct'
    // A shared printing key without a known language is not enough to safely
    // block the add: legacy rows may represent another language printing.
    if (!existingLanguage || !candidateLanguage) return 'possible'
    return 'exact'
  }

  const existingMatchId = normalizedIdentity(existing.catalogue_match_id)
  const candidateMatchId = normalizedIdentity(candidate.catalogue_match_id)
  if (existingMatchId && candidateMatchId) {
    return existingMatchId === candidateMatchId ? 'exact' : 'distinct'
  }

  const existingVariant = normalizedIdentity(existing.variant_label)
  const candidateVariant = normalizedIdentity(candidate.variant_label)
  if (existingLanguage && candidateLanguage && existingLanguage !== candidateLanguage) return 'distinct'
  if (existingVariant && candidateVariant && existingVariant !== candidateVariant) return 'distinct'
  return 'possible'
}

const slugify = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')


// Keep the catalogue selection fields aligned with the scanner → QuickAdd handoff.
// Values are copied as reviewed form values, not silently treated as verified facts.

const REFERENCE_LIBRARY_SCAN_FIELDS = [
  'name', 'card_number', 'set_code', 'rarity', 'color', 'power', 'cost',
  'card_type', 'effect_text', 'language', 'classification', 'counter',
  'trigger_text', 'attributes', 'variant_label', 'catalogue_match_id',
  'catalogue_printing_key', 'catalogue_reference_image_url',
  'catalogue_reference_image_source', 'reference_image_url',
  'reference_printing_key', 'reference_match_id', 'reference_image_source',
]

export function buildReferenceLibraryScanFields(match = {}) {
  const category = String(match.category || '').trim()
  const formValues = {
    name: match.name || '',
    card_number: match.cardNumber || '',
    // This is the product/release set, intentionally not inferred from the
    // card-number prefix: a reprint can belong to a newer release set.
    set_code: match.setCode || '',
    rarity: match.rarity || '',
    color: match.colors || '',
    power: match.power ?? '',
    cost: match.cost ?? '',
    card_type: category ? category[0].toUpperCase() + category.slice(1) : '',
    effect_text: match.effect || '',
    language: match.language || '',
    classification: match.traits || '',
    counter: match.counter ?? '',
    trigger_text: match.trigger || '',
    attributes: match.attributes || '',
    variant_label: match.variantLabel || match.variant || '',
    catalogue_match_id: match.id || '',
    catalogue_printing_key: match.printingKey || '',
    catalogue_reference_image_url: match.imageUrl || '',
    catalogue_reference_image_source: match.source || '',
    reference_image_url: match.imageUrl || '',
    reference_printing_key: match.printingKey || '',
    reference_match_id: match.id || '',
    reference_image_source: match.source || '',
  }

  return Object.fromEntries(REFERENCE_LIBRARY_SCAN_FIELDS.map((key) => [
    key,
    {
      value: formValues[key] === null || formValues[key] === undefined ? '' : String(formValues[key]),
      confidence: 100,
      needsReview: true,
    },
  ]))
}

export function buildCatalogueScannerFields(values) {
  const fieldNames = [
    'name', 'card_number', 'set_code', 'rarity', 'color', 'cost', 'power',
    'card_type', 'classification', 'language', 'effect_text', 'variant_label',
    'counter', 'trigger_text', 'attributes', 'catalogue_match_id',
    'catalogue_printing_key', 'catalogue_reference_image_url',
    'catalogue_reference_image_source', 'reference_image_url',
    'reference_printing_key', 'reference_match_id', 'reference_image_source',
  ]
  return Object.fromEntries(fieldNames.map((key) => [key, values?.[key] ?? '']))
}

const CATALOGUE_SCANNER_IDENTITY_FIELDS = new Set([
  'catalogue_match_id',
  'catalogue_printing_key',
  'catalogue_reference_image_url',
  'catalogue_reference_image_source',
  'reference_image_url',
  'reference_printing_key',
  'reference_match_id',
  'reference_image_source',
])

// Prefer verified catalogue values, but do not discard useful OCR text when a
// catalogue observation is blank. Identity fields are always replaced so a
// previous printing can never remain attached to a newly selected card.
export function mergeCatalogueScannerFields(currentFields, values) {
  const catalogueValues = buildCatalogueScannerFields(values)
  return Object.fromEntries(Object.entries(catalogueValues).map(([key, catalogueValue]) => {
    const current = currentFields?.[key] || {}
    const hasCatalogueValue = catalogueValue !== '' && catalogueValue !== null && catalogueValue !== undefined
    const value = CATALOGUE_SCANNER_IDENTITY_FIELDS.has(key)
      ? (catalogueValue ?? '')
      : hasCatalogueValue ? catalogueValue : (current.value ?? '')
    return [key, {
      ...current,
      value,
      confidence: hasCatalogueValue ? 95 : (current.confidence || 0),
      needsReview: true,
    }]
  }))
}

export function buildNewProductPayload(form, setId, includeCardDetails) {
  const timestamp = new Date().toISOString()
  const id = globalThis.crypto.randomUUID()
  const slugBase = [form.name, form.card_number, form.variant_label]
    .map(slugify)
    .filter(Boolean)
    .join('-')
  const payload = {
    id,
    slug: `${slugBase || 'product'}-${id.slice(0, 8)}`,
    name: form.name.trim(),
    description: form.description.trim() || null,
    card_number: form.card_number.trim() || null,
    rarity: form.rarity.trim() || null,
    category_id: form.category_id || null,
    set_id: setId || null,
    price: Number(Number(form.price_gbp).toFixed(2)),
    stock_quantity: Number(form.stock_quantity),
    image_url: null,
    featured: Boolean(form.featured),
    condition: form.condition,
    status: 'draft',
    created_at: timestamp,
    updated_at: timestamp,
  }

  // Keep regular stock compatible with pre-migration databases. Only send
  // the new column when an administrator explicitly places this item in Bulk.
  if (form.is_bulk === true) payload.is_bulk = true

  if (includeCardDetails) {
    Object.assign(payload, {
      color: form.color.trim() || null,
      power: form.power === '' ? null : Number(form.power),
      cost: form.cost === '' ? null : Number(form.cost),
      card_type: form.card_type.trim() || null,
      effect_text: form.effect_text.trim() || null,
      counter: form.counter === '' ? null : Number(form.counter),
      trigger_text: form.trigger_text.trim() || null,
      attributes: form.attributes.trim() || null,
      language: form.language.trim() || null,
      classification: form.classification.trim() || null,
      variant_label: form.variant_label.trim() || null,
      catalogue_match_id: String(form.catalogue_match_id || '').trim() || null,
      catalogue_printing_key: String(form.catalogue_printing_key || '').trim() || null,
      catalogue_reference_image_url: String(form.catalogue_reference_image_url || '').trim() || null,
      catalogue_reference_image_source: String(form.catalogue_reference_image_source || '').trim() || null,
    })
  }

  return payload
}
