const aliases = {
  name: ['name','card name','card name / character','character'], card_number: ['card_number','card number','number'],
  set_code: ['set_code','set code','set'], rarity: ['rarity'], variant_label: ['variant_label','variant label','variant'],
  color: ['color','colour'], power: ['power'], cost: ['cost'], card_type: ['card_type','card type','type'],
  classification: ['classification'], language: ['language'], condition: ['condition'],
  price_gbp: ['price_gbp','price','selling price','selling price gbp'], stock_quantity: ['stock_quantity','quantity','stock','qty'],
  category_name: ['category_name','category'], description: ['description'], effect_text: ['effect_text','effect','card effect'],
  counter: ['counter'], trigger_text: ['trigger_text','trigger text','trigger'], attributes: ['attributes','attribute'],
}


const normalizeImportIdentity = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
const normalizeImportLanguage = (value) => {
  const language = String(value || '').trim().toLowerCase()
  if (['en', 'eng', 'english'].includes(language)) return 'en'
  if (['jp', 'ja', 'jpn', 'japanese'].includes(language)) return 'jp'
  if (['kr', 'ko', 'korean'].includes(language)) return 'kr'
  if (['zh', 'cn', 'chinese'].includes(language)) return 'zh'
  return language
}

export function isBulkImportDuplicate(existing, candidate) {
  const cardNumber = normalizeImportIdentity(existing?.card_number)
  const setCode = normalizeImportIdentity(existing?.set_code)
  const variant = normalizeImportIdentity(existing?.variant_label)
  if (!cardNumber || cardNumber !== normalizeImportIdentity(candidate?.card_number)) return false
  if (setCode !== normalizeImportIdentity(candidate?.set_code)) return false
  if (variant !== normalizeImportIdentity(candidate?.variant_label)) return false
  const existingLanguage = normalizeImportLanguage(existing?.language)
  const candidateLanguage = normalizeImportLanguage(candidate?.language)
  return !existingLanguage || !candidateLanguage || existingLanguage === candidateLanguage
}


export function validateBulkImportNumericFields(row = {}) {
  const issues = []
  if (row.price_gbp !== '' && (!Number.isFinite(Number(row.price_gbp)) || Number(row.price_gbp) < 0)) issues.push('Invalid price')
  if (row.stock_quantity !== '' && (!Number.isInteger(Number(row.stock_quantity)) || Number(row.stock_quantity) < 0)) issues.push('Invalid quantity')
  for (const [field, label] of [['power', 'power'], ['cost', 'cost'], ['counter', 'counter']]) {
    const value = String(row[field] ?? '').trim()
    if (value && value !== '-' && (!Number.isFinite(Number(value)) || Number(value) < 0 || !Number.isInteger(Number(value)))) issues.push('Invalid ' + label)
  }
  return issues
}

export function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1 }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"' && cell.trim() === '') {
      cell = ''
      quoted = true
    } else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); if (row.some((value) => value.trim()) || rows.length === 0) rows.push(row); row = []; cell = '' }
    else cell += char
  }
  if (quoted) throw new Error('CSV contains an unmatched quote. Check the file formatting and try again.')
  row.push(cell.replace(/\r$/, ''))
  if (row.some((value) => value.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('CSV must contain a header row and at least one card row.')
  const headers = rows[0].map((value) => value.trim().toLowerCase())
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index)
  if (duplicateHeaders.length) throw new Error('CSV contains duplicate column headers: ' + [...new Set(duplicateHeaders)].join(', '))
  return rows.slice(1).map((cells, index) => {
    const source = Object.fromEntries(headers.map((header, column) => [header, (cells[column] || '').trim()]))
    const record = {}
    for (const [field, candidates] of Object.entries(aliases)) {
      const header = candidates.find((candidate) => candidate in source)
      record[field] = header ? source[header] : ''
    }
    record._row = index + 2
    return record
  })
}
