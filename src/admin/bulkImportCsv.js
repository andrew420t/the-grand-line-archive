const aliases = {
  name: ['name','card name','card name / character','character'], card_number: ['card_number','card number','number'],
  set_code: ['set_code','set code','set'], rarity: ['rarity'], variant_label: ['variant_label','variant label','variant'],
  color: ['color','colour'], power: ['power'], cost: ['cost'], card_type: ['card_type','card type','type'],
  classification: ['classification'], language: ['language'], condition: ['condition'],
  price_gbp: ['price_gbp','price','selling price','selling price gbp'], stock_quantity: ['stock_quantity','quantity','stock','qty'],
  category_name: ['category_name','category'], description: ['description'], effect_text: ['effect_text','effect','card effect'],
  counter: ['counter'], trigger_text: ['trigger_text','trigger text','trigger'], attributes: ['attributes','attribute'],
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
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
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
