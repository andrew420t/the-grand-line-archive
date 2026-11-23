import { useMemo, useState } from 'react'
import { AlertCircle, Check, FileSpreadsheet, Upload, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildNewProductPayload, EXTENDED_CARD_COLUMNS } from './productSchema'
import { findCatalogueMatches, catalogueMatchToForm } from './cardCatalogue'
import CatalogueMatchCard from './CatalogueMatchCard'
import { parseCsv } from './bulkImportCsv'

const TEMPLATE_HEADERS = ['name','card_number','set_code','rarity','variant_label','color','power','cost','card_type','classification','language','condition','price_gbp','stock_quantity','category_name','description','effect_text','counter','trigger_text','attributes']
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
  const [catalogueMatches, setCatalogueMatches] = useState({})
  const [catalogueLoadingRow, setCatalogueLoadingRow] = useState(null)

  const prepared = useMemo(() => rows.map((row, rowIndex) => {
    const matchingSet = sets.find((set) => String(set.code || '').toUpperCase() === String(row.set_code || '').toUpperCase())
    const matchingCategory = categories.find((category) => String(category.name || '').toLowerCase() === String(row.category_name || '').toLowerCase())
    const duplicate = products.find((product) =>
      String(product.raw?.card_number || '').toUpperCase() === String(row.card_number || '').toUpperCase() &&
      String(product.setCode || product.raw?.set_code || '').toUpperCase() === String(row.set_code || '').toUpperCase() &&
      String(product.raw?.variant_label || '').toLowerCase() === String(row.variant_label || '').toLowerCase()
    )
    const duplicateInFile = rows.slice(0, rowIndex).some((previous) =>
      String(previous.card_number || '').trim().toUpperCase() === String(row.card_number || '').trim().toUpperCase() &&
      String(previous.set_code || '').trim().toUpperCase() === String(row.set_code || '').trim().toUpperCase() &&
      String(previous.variant_label || '').trim().toLowerCase() === String(row.variant_label || '').trim().toLowerCase() &&
      String(previous.language || '').trim().toLowerCase() === String(row.language || '').trim().toLowerCase()
    )
    const issues = []
    if (!row.name.trim()) issues.push('Card name missing')
    if (row.set_code && !matchingSet) issues.push('Set code not found in site sets')
    if (row.price_gbp !== '' && (!Number.isFinite(Number(row.price_gbp)) || Number(row.price_gbp) < 0)) issues.push('Invalid price')
    if (row.stock_quantity !== '' && (!Number.isInteger(Number(row.stock_quantity)) || Number(row.stock_quantity) < 0)) issues.push('Invalid quantity')
    if (duplicate) issues.push('Possible duplicate already in stock')
    if (duplicateInFile) issues.push('Duplicate row earlier in this CSV')
    return { ...row, matchingSet, matchingCategory, duplicate, duplicateInFile, issues }
  }), [rows, products, sets, categories])

  // Unknown set codes are warnings, not blockers: cards can still be imported
  // without a linked set, and their card_number is retained.
  const readyRows = prepared.filter((row) => !row.issues.some((issue) => ['Card name missing', 'Invalid price', 'Invalid quantity'].includes(issue)) && (includeDuplicates || (!row.duplicate && !row.duplicateInFile)))


  const lookupRow = async (row) => {
    if (!row.card_number) return
    setCatalogueLoadingRow(row._row)
    setError('')
    try {
      const matches = await findCatalogueMatches(row.card_number)
      setCatalogueMatches((current) => ({ ...current, [row._row]: matches }))
      if (!matches.length) setError(`No catalogue match found for CSV row ${row._row} (${row.card_number}).`)
    } catch (lookupError) {
      setError(`Catalogue lookup failed for row ${row._row}: ${lookupError.message}`)
    } finally {
      setCatalogueLoadingRow(null)
    }
  }

  const applyRowMatch = (row, match) => {
    const details = catalogueMatchToForm(match)
    const index = rows.findIndex((item) => item._row === row._row)
    if (index < 0) return
    const matchingCategory = categories.find((category) => String(category.name || '').toLowerCase() === String(match.category || '').toLowerCase())
    setRows((current) => current.map((item) => item._row !== row._row ? item : ({
      ...item,
      name: details.name || item.name,
      card_number: details.card_number || item.card_number,
      set_code: details.set_code || item.set_code,
      rarity: details.rarity || item.rarity,
      variant_label: details.variant_label || item.variant_label,
      color: details.color || item.color,
      power: details.power || item.power,
      cost: details.cost || item.cost,
      card_type: details.card_type || item.card_type,
      classification: details.classification || item.classification,
      language: details.language || item.language,
      effect_text: details.effect_text || item.effect_text,
      counter: details.counter || item.counter,
      trigger_text: details.trigger_text || item.trigger_text,
      attributes: details.attributes || item.attributes,
      category_name: matchingCategory?.name || item.category_name,
    })))
    setCatalogueMatches((current) => ({ ...current, [row._row]: [] }))
  }

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
      const usesExtended = readyRows.some((row) => [row.color,row.power,row.cost,row.card_type,row.effect_text,row.language,row.classification,row.variant_label,row.counter,row.trigger_text,row.attributes].some((v) => String(v || '').trim()))
      if (usesExtended && !schemaReady) {
        const check = await supabase.from('products').select(EXTENDED_CARD_COLUMNS.join(',')).limit(0)
        if (check.error) throw new Error('Card-detail columns are unavailable. No rows were imported. Review the approved schema migration first: ' + check.error.message)
        setSchemaReady(true)
      }
      const result = { imported: 0, skipped: 0, failures: [] }
      for (const row of readyRows) {
        if ((row.duplicate || row.duplicateInFile) && !includeDuplicates) { result.skipped += 1; continue }
        const form = {
          name: row.name, description: row.description, card_number: row.card_number, rarity: row.rarity,
          color: row.color, power: row.power, cost: row.cost, card_type: row.card_type, effect_text: row.effect_text,
          language: row.language, classification: row.classification, counter: row.counter, trigger_text: row.trigger_text, attributes: row.attributes, condition: row.condition || 'Near Mint',
          price_gbp: row.price_gbp === '' ? '0' : row.price_gbp, stock_quantity: row.stock_quantity === '' ? '1' : row.stock_quantity,
          category_id: row.matchingCategory?.id || '', variant_label: row.variant_label, featured: false,
        }
        const payload = buildNewProductPayload(form, row.matchingSet?.id || '', usesExtended)
        if (Number(payload.price) === 0) payload.status = 'inactive'
        else payload.status = 'draft'
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
      <p className="admin-muted">Upload a CSV exported from Excel. This import creates product records and quantities; card images can be added later in Stock Photography. Rows with missing prices are saved as inactive at £0 so they are not published accidentally. Duplicate rows within the CSV and existing inventory matches are flagged for review.</p>
      <div className="bulk-import-actions">
        <button className="button button--outline" type="button" onClick={downloadTemplate}><Download size={15}/> Download CSV template</button>
        <label className="button button--gold bulk-import-file"><Upload size={15}/> Choose CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => loadFile(event.target.files?.[0])}/></label>
      </div>
      {fileName && <p className="admin-muted"><FileSpreadsheet size={14}/> {fileName} · {rows.length} rows detected</p>}
      {error && <div className="error-notice"><AlertCircle size={15}/><span>{error}</span></div>}
      {prepared.length > 0 && <>
        <div className="bulk-import-summary"><strong>{readyRows.length} ready</strong><span>{prepared.filter((row) => row.issues.length).length} flagged for review · {prepared.filter((row) => row.duplicate || row.duplicateInFile).length} possible duplicates</span></div>
        <label className="check-field"><input type="checkbox" checked={includeDuplicates} onChange={(event) => setIncludeDuplicates(event.target.checked)}/><span>Allow importing flagged duplicates (use only for different variants)</span></label>
        <div className="bulk-import-table-wrap"><table className="bulk-import-table"><thead><tr><th>Row</th><th>Card</th><th>Number</th><th>Set</th><th>Rarity</th><th>Qty</th><th>Price</th><th>Review</th></tr></thead><tbody>{prepared.map((row) => <tr key={row._row}><td>{row._row}</td><td>{row.name || '—'}</td><td>{row.card_number || '—'}</td><td>{row.matchingSet?.name || row.set_code || '—'}</td><td>{row.rarity || '—'}</td><td>{row.stock_quantity || '1'}</td><td>{row.price_gbp || '£0 inactive'}</td><td>{row.issues.length ? row.issues.join('; ') : 'Ready'}{row.card_number && <div className="bulk-catalogue-tools"><button className="text-button" type="button" disabled={catalogueLoadingRow === row._row} onClick={() => lookupRow(row)}>{catalogueLoadingRow === row._row ? 'Looking up…' : 'Find card details'}</button>{catalogueMatches[row._row]?.length > 0 && <div className="bulk-catalogue-match-list">{catalogueMatches[row._row].map((match) => <CatalogueMatchCard key={match.id} match={match} onUseDetails={() => applyRowMatch(row, match)} useLabel="Use details" compact />)}</div>}</div>}</td></tr>)}</tbody></table></div>
        <button className="button button--gold" type="button" disabled={busy || !readyRows.length} onClick={importRows}>{busy ? 'Importing…' : 'Import ' + readyRows.length + ' reviewed card(s)'}</button>
      </>}
      {report && <div className="success-notice"><Check size={15}/><span>Import complete: {report.imported} imported, {report.skipped} skipped.{report.failures.length ? ' ' + report.failures.length + ' failed.' : ''}</span></div>}
      {report?.failures?.length > 0 && <div className="error-notice"><AlertCircle size={15}/><span>{report.failures.map((failure) => 'Row ' + failure.row + ' (' + failure.name + '): ' + failure.error).join(' · ')}</span></div>}
    </section>
  )
}
