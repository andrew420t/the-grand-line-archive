import { useMemo, useState } from 'react'
import { AlertCircle, Check, FileSpreadsheet, Upload, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildNewProductPayload, EXTENDED_CARD_COLUMNS } from './productSchema'

const TEMPLATE_HEADERS = ['name','card_number','set_code','rarity','variant_label','color','power','cost','card_type','classification','language','condition','price_gbp','stock_quantity','category_name','description','effect_text']
const aliases = {
  name: ['name','card name','card name / character','character'], card_number: ['card_number','card number','number'],
  set_code: ['set_code','set code','set'], rarity: ['rarity'], variant_label: ['variant_label','variant label','variant'],
  color: ['color','colour'], power: ['power'], cost: ['cost'], card_type: ['card_type','card type','type'],
  classification: ['classification'], language: ['language'], condition: ['condition'],
  price_gbp: ['price_gbp','price','selling price','selling price gbp'], stock_quantity: ['stock_quantity','quantity','stock','qty'],
  category_name: ['category_name','category'], description: ['description'], effect_text: ['effect_text','effect','card effect'],
}

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1 }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += char
  }
  row.push(cell.replace(/\r$/, ''))
  if (row.some((value) => value.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('CSV must contain a header row and at least one card row.')
  const headers = rows[0].map((value) => value.trim().toLowerCase())
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

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE_HEADERS.join(',') + '\n'], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'grand-line-archive-import-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function BulkImportPanel({ products, categories, sets, user, onSaved }) {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [schemaReady, setSchemaReady] = useState(false)

  const prepared = useMemo(() => rows.map((row) => {
    const matchingSet = sets.find((set) => String(set.code || '').toUpperCase() === String(row.set_code || '').toUpperCase())
    const matchingCategory = categories.find((category) => String(category.name || '').toLowerCase() === String(row.category_name || '').toLowerCase())
    const duplicate = products.find((product) =>
      String(product.raw?.card_number || '').toUpperCase() === String(row.card_number || '').toUpperCase() &&
      String(product.setCode || product.raw?.set_code || '').toUpperCase() === String(row.set_code || '').toUpperCase() &&
      String(product.raw?.variant_label || '').toLowerCase() === String(row.variant_label || '').toLowerCase()
    )
    const issues = []
    if (!row.name.trim()) issues.push('Card name missing')
    if (row.set_code && !matchingSet) issues.push('Set code not found in site sets')
    if (row.price_gbp !== '' && (!Number.isFinite(Number(row.price_gbp)) || Number(row.price_gbp) < 0)) issues.push('Invalid price')
    if (row.stock_quantity !== '' && (!Number.isInteger(Number(row.stock_quantity)) || Number(row.stock_quantity) < 0)) issues.push('Invalid quantity')
    if (duplicate) issues.push('Possible duplicate already in stock')
    return { ...row, matchingSet, matchingCategory, duplicate, issues }
  }), [rows, products, sets, categories])

  // Unknown set codes are warnings, not blockers: cards can still be imported
  // without a linked set, and their card_number is retained.
  const readyRows = prepared.filter((row) => !row.issues.some((issue) => ['Card name missing', 'Invalid price', 'Invalid quantity'].includes(issue)) && (includeDuplicates || !row.duplicate))

  const loadFile = async (file) => {
    setError(''); setReport(null)
    try {
      if (!file || !file.name.toLowerCase().endsWith('.csv')) throw new Error('Please upload a CSV file. In Excel, use Save As → CSV.')
      const parsed = parseCsv(await file.text())
      setRows(parsed); setFileName(file.name)
    } catch (e) { setError(e.message); setRows([]); setFileName('') }
  }

  const importRows = async () => {
    if (!supabase || !user) { setError('Administrator sign-in is required.'); return }
    if (!readyRows.length) { setError('There are no valid rows ready to import.'); return }
    setBusy(true); setError(''); setReport(null)
    try {
      const usesExtended = readyRows.some((row) => [row.color,row.power,row.cost,row.card_type,row.effect_text,row.language,row.classification,row.variant_label].some((v) => String(v || '').trim()))
      if (usesExtended && !schemaReady) {
        const check = await supabase.from('products').select(EXTENDED_CARD_COLUMNS.join(',')).limit(0)
        if (check.error) throw new Error('Card-detail columns are unavailable. No rows were imported. Review the approved schema migration first: ' + check.error.message)
        setSchemaReady(true)
      }
      const result = { imported: 0, skipped: 0, failures: [] }
      for (const row of readyRows) {
        if (row.duplicate && !includeDuplicates) { result.skipped += 1; continue }
        const form = {
          name: row.name, description: row.description, card_number: row.card_number, rarity: row.rarity,
          color: row.color, power: row.power, cost: row.cost, card_type: row.card_type, effect_text: row.effect_text,
          language: row.language, classification: row.classification, condition: row.condition || 'Near Mint',
          price_gbp: row.price_gbp === '' ? '0' : row.price_gbp, stock_quantity: row.stock_quantity === '' ? '1' : row.stock_quantity,
          category_id: row.matchingCategory?.id || '', variant_label: row.variant_label, featured: false,
        }
        const payload = buildNewProductPayload(form, row.matchingSet?.id || '', usesExtended)
        if (Number(payload.price) === 0) payload.status = 'draft'
        const insert = await supabase.from('products').insert(payload)
        if (insert.error) result.failures.push({ row: row._row, name: row.name, error: insert.error.message })
        else result.imported += 1
      }
      setReport(result)
      if (result.imported) onSaved()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return (
    <section className="admin-view bulk-import-view">
      <div className="admin-view-heading"><div><p className="eyebrow">BULK INVENTORY IMPORT</p><h2>Bring cards into the archive.</h2></div></div>
      <p className="admin-muted">Upload a CSV exported from Excel. This import creates product records and quantities; card images can be added later in Stock Photography. Rows with missing prices are saved as drafts at £0 so they are not published accidentally.</p>
      <div className="bulk-import-actions">
        <button className="button button--outline" type="button" onClick={downloadTemplate}><Download size={15}/> Download CSV template</button>
        <label className="button button--gold bulk-import-file"><Upload size={15}/> Choose CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => loadFile(event.target.files?.[0])}/></label>
      </div>
      {fileName && <p className="admin-muted"><FileSpreadsheet size={14}/> {fileName} · {rows.length} rows detected</p>}
      {error && <div className="error-notice"><AlertCircle size={15}/><span>{error}</span></div>}
      {prepared.length > 0 && <>
        <div className="bulk-import-summary"><strong>{readyRows.length} ready</strong><span>{prepared.filter((row) => row.issues.length).length} flagged for review · {prepared.filter((row) => row.duplicate).length} possible duplicates</span></div>
        <label className="check-field"><input type="checkbox" checked={includeDuplicates} onChange={(event) => setIncludeDuplicates(event.target.checked)}/><span>Allow importing flagged duplicates (use only for different variants)</span></label>
        <div className="bulk-import-table-wrap"><table className="bulk-import-table"><thead><tr><th>Row</th><th>Card</th><th>Number</th><th>Set</th><th>Rarity</th><th>Qty</th><th>Price</th><th>Review</th></tr></thead><tbody>{prepared.map((row) => <tr key={row._row}><td>{row._row}</td><td>{row.name || '—'}</td><td>{row.card_number || '—'}</td><td>{row.matchingSet?.name || row.set_code || '—'}</td><td>{row.rarity || '—'}</td><td>{row.stock_quantity || '1'}</td><td>{row.price_gbp || '£0 draft'}</td><td>{row.issues.length ? row.issues.join('; ') : 'Ready'}</td></tr>)}</tbody></table></div>
        <button className="button button--gold" type="button" disabled={busy || !readyRows.length} onClick={importRows}>{busy ? 'Importing…' : 'Import ' + readyRows.length + ' reviewed card(s)'}</button>
      </>}
      {report && <div className="success-notice"><Check size={15}/><span>Import complete: {report.imported} imported, {report.skipped} skipped.{report.failures.length ? ' ' + report.failures.length + ' failed.' : ''}</span></div>}
      {report?.failures?.length > 0 && <div className="error-notice"><AlertCircle size={15}/><span>{report.failures.map((failure) => 'Row ' + failure.row + ' (' + failure.name + '): ' + failure.error).join(' · ')}</span></div>}
    </section>
  )
}
