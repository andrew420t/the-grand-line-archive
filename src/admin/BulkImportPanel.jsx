import { useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, FileSpreadsheet, Upload, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildNewProductPayload, EXTENDED_CARD_COLUMNS, resolveSetIdForCode } from './productSchema'
import { findCatalogueMatches, catalogueMatchToForm } from './cardCatalogue'
import CatalogueMatchCard from './CatalogueMatchCard'
import { clearPersistentDraft, readPersistentDraft, savePersistentDraft } from './persistentDraftStorage'
import { parseCsv, isBulkImportDuplicate, validateBulkImportNumericFields, preferCatalogueValue, hasExtendedCardValues, buildBulkImportTemplateCsv } from './bulkImportCsv'

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([buildBulkImportTemplateCsv()], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'grand-line-archive-import-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function BulkImportPanel({ products, categories, sets, user, onSaved }) {
  const [savedDraft] = useState(() => readPersistentDraft(user?.id, 'bulk-import', null))
  const [rows, setRows] = useState(() => Array.isArray(savedDraft?.rows) ? savedDraft.rows : [])
  const [fileName, setFileName] = useState(() => String(savedDraft?.fileName || ''))
  const [busy, setBusy] = useState(false)
  const importLock = useRef(false)
  const [report, setReport] = useState(() => savedDraft?.report || null)
  const [error, setError] = useState('')
  const [includeDuplicates, setIncludeDuplicates] = useState(() => Boolean(savedDraft?.includeDuplicates))
  useEffect(() => {
    if (!user?.id) return
    if (!rows.length && !fileName && !report) {
      clearPersistentDraft(user.id, 'bulk-import')
      return
    }
    savePersistentDraft(user.id, 'bulk-import', { rows, fileName, report, includeDuplicates })
  }, [user?.id, rows, fileName, report, includeDuplicates])
  const [schemaReady, setSchemaReady] = useState(false)
  const [catalogueMatches, setCatalogueMatches] = useState({})
  const [catalogueLoadingRow, setCatalogueLoadingRow] = useState(null)

  const prepared = useMemo(() => rows.map((row, rowIndex) => {
    const matchingSetId = resolveSetIdForCode(sets, row.set_code)
    const matchingSet = sets.find((set) => String(set.id) === String(matchingSetId))
    const matchingCategory = categories.find((category) => String(category.name || '').toLowerCase() === String(row.category_name || '').toLowerCase())
    const duplicate = products.find((product) => isBulkImportDuplicate({
      card_number: product.raw?.card_number,
      set_code: product.setCode || product.raw?.set_code,
      variant_label: product.raw?.variant_label,
      language: product.raw?.language,
      catalogue_printing_key: product.raw?.catalogue_printing_key,
    }, row))
    const duplicateInFile = rows.slice(0, rowIndex).some((previous) => isBulkImportDuplicate(previous, row))
    const issues = []
    if (!row.name.trim()) issues.push('Card name missing')
    if (row.set_code && !matchingSet) issues.push('Set code not found in site sets')
    issues.push(...validateBulkImportNumericFields(row))
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
      name: preferCatalogueValue(details.name, item.name),
      card_number: preferCatalogueValue(details.card_number, item.card_number),
      set_code: preferCatalogueValue(details.set_code, item.set_code),
      rarity: preferCatalogueValue(details.rarity, item.rarity),
      variant_label: preferCatalogueValue(details.variant_label, item.variant_label),
      color: preferCatalogueValue(details.color, item.color),
      power: preferCatalogueValue(details.power, item.power),
      cost: preferCatalogueValue(details.cost, item.cost),
      card_type: preferCatalogueValue(details.card_type, item.card_type),
      classification: preferCatalogueValue(details.classification, item.classification),
      language: preferCatalogueValue(details.language, item.language),
      effect_text: preferCatalogueValue(details.effect_text, item.effect_text),
      counter: preferCatalogueValue(details.counter, item.counter),
      trigger_text: preferCatalogueValue(details.trigger_text, item.trigger_text),
      attributes: preferCatalogueValue(details.attributes, item.attributes),
      catalogue_match_id: preferCatalogueValue(details.catalogue_match_id, item.catalogue_match_id),
      catalogue_printing_key: preferCatalogueValue(details.catalogue_printing_key, item.catalogue_printing_key),
      catalogue_reference_image_url: preferCatalogueValue(details.catalogue_reference_image_url, item.catalogue_reference_image_url),
      catalogue_reference_image_source: preferCatalogueValue(details.catalogue_reference_image_source, item.catalogue_reference_image_source),
      category_name: preferCatalogueValue(matchingCategory?.name, item.category_name),
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
    if (importLock.current) return
    importLock.current = true
    setBusy(true); setError(''); setReport(null)
    try {
      const usesExtended = readyRows.some((row) => hasExtendedCardValues([row.color,row.power,row.cost,row.card_type,row.effect_text,row.language,row.classification,row.variant_label,row.counter,row.trigger_text,row.attributes,row.catalogue_match_id,row.catalogue_printing_key,row.catalogue_reference_image_url,row.catalogue_reference_image_source]))
      if (usesExtended && !schemaReady) {
        const check = await supabase.from('products').select(EXTENDED_CARD_COLUMNS.join(',')).limit(0)
        if (check.error) throw new Error('Card-detail columns are unavailable. No rows were imported. Review the approved schema migration first: ' + check.error.message)
        setSchemaReady(true)
      }
      // Re-check inventory at import time, not only against the component's
      // possibly stale catalogue snapshot. Paginate so large inventories don't
      // hide duplicates past the API's first page.
      const duplicateColumns = usesExtended
        ? 'id,card_number,set_id,variant_label,language,catalogue_match_id,catalogue_printing_key'
        : 'id,card_number,set_id'
      const existingRows = []
      let existingOffset = 0
      const existingPageSize = 1000
      while (true) {
        const existingResult = await supabase
          .from('products')
          .select(duplicateColumns)
          .order('id', { ascending: true })
          .range(existingOffset, existingOffset + existingPageSize - 1)
        if (existingResult.error) throw new Error('Could not refresh inventory duplicate checks before import: ' + existingResult.error.message)
        existingRows.push(...(existingResult.data || []))
        if (!existingResult.data || existingResult.data.length < existingPageSize) break
        existingOffset += existingPageSize
      }
      const existingForDuplicateCheck = existingRows.map((product) => ({
        card_number: product.card_number,
        set_code: sets.find((set) => String(set.id) === String(product.set_id))?.code || '',
        variant_label: product.variant_label || '',
        language: product.language || '',
        catalogue_match_id: product.catalogue_match_id || '',
        catalogue_printing_key: product.catalogue_printing_key || '',
      }))
      const result = { imported: 0, skipped: 0, failures: [], freshDuplicateRows: [] }
      for (const row of readyRows) {
        const freshDuplicate = existingForDuplicateCheck.some((product) => isBulkImportDuplicate(product, row))
        if (((row.duplicate || row.duplicateInFile) || freshDuplicate) && !includeDuplicates) {
          result.skipped += 1
          if (freshDuplicate && !row.duplicate && !row.duplicateInFile) result.freshDuplicateRows.push(row._row)
          continue
        }
        const form = {
          name: row.name, description: row.description, card_number: row.card_number, rarity: row.rarity,
          color: row.color, power: row.power === '-' ? '' : row.power, cost: row.cost === '-' ? '' : row.cost, card_type: row.card_type, effect_text: row.effect_text,
          language: row.language, classification: row.classification, counter: row.counter === '-' ? '' : row.counter, trigger_text: row.trigger_text, attributes: row.attributes, condition: row.condition || 'Near Mint',
          price_gbp: row.price_gbp === '' ? '0' : row.price_gbp, stock_quantity: row.stock_quantity === '' ? '1' : row.stock_quantity,
          category_id: row.matchingCategory?.id || '', variant_label: row.variant_label, featured: false,
          catalogue_match_id: row.catalogue_match_id || '', catalogue_printing_key: row.catalogue_printing_key || '',
          catalogue_reference_image_url: row.catalogue_reference_image_url || '', catalogue_reference_image_source: row.catalogue_reference_image_source || '',
        }
        const payload = buildNewProductPayload(form, row.matchingSet?.id || '', usesExtended)
        if (Number(payload.price) === 0) payload.status = 'inactive'
        else payload.status = 'inactive'
        const insert = await supabase.from('products').insert(payload)
        if (insert.error) result.failures.push({ row: row._row, name: row.name, error: insert.error.message })
        else {
          result.imported += 1
          existingForDuplicateCheck.push({
            card_number: row.card_number,
            set_code: row.matchingSet?.code || row.set_code,
            variant_label: row.variant_label || '',
            language: row.language || '',
            catalogue_match_id: row.catalogue_match_id || '',
            catalogue_printing_key: row.catalogue_printing_key || '',
          })
        }
      }
      setReport(result)
      if (result.imported) onSaved()
    } catch (e) { setError(e.message || 'Bulk import failed unexpectedly.') }
    finally { importLock.current = false; setBusy(false) }
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
        <label className="check-field"><input type="checkbox" checked={includeDuplicates} onChange={(event) => setIncludeDuplicates(event.target.checked)}/><span>Override duplicate checks (creates separate records; use only when intentional)</span></label>
        <div className="bulk-import-table-wrap"><table className="bulk-import-table"><thead><tr><th>Row</th><th>Card</th><th>Number</th><th>Set</th><th>Rarity</th><th>Qty</th><th>Price</th><th>Review</th></tr></thead><tbody>{prepared.map((row) => <tr key={row._row}><td>{row._row}</td><td>{row.name || '—'}</td><td>{row.card_number || '—'}</td><td>{row.matchingSet?.name || row.set_code || '—'}</td><td>{row.rarity || '—'}</td><td>{row.stock_quantity || '1'}</td><td>{row.price_gbp || '£0 inactive'}</td><td>{row.issues.length ? row.issues.join('; ') : 'Ready'}{row.card_number && <div className="bulk-catalogue-tools"><button className="text-button" type="button" disabled={catalogueLoadingRow === row._row} onClick={() => lookupRow(row)}>{catalogueLoadingRow === row._row ? 'Looking up…' : 'Find card details'}</button>{catalogueMatches[row._row]?.length > 0 && <div className="bulk-catalogue-match-list">{catalogueMatches[row._row].map((match) => <CatalogueMatchCard key={match.id} match={match} onUseDetails={() => applyRowMatch(row, match)} useLabel="Use details" compact />)}</div>}</div>}</td></tr>)}</tbody></table></div>
        <button className="button button--gold" type="button" disabled={busy || !readyRows.length} onClick={importRows}>{busy ? 'Importing…' : 'Import ' + readyRows.length + ' reviewed card(s)'}</button>
      </>}
      {report && <div className="success-notice"><Check size={15}/><span>Import complete: {report.imported} imported, {report.skipped} skipped.{report.freshDuplicateRows?.length ? ' Newly detected duplicates skipped on rows ' + report.freshDuplicateRows.join(', ') + '.' : ''}{report.failures.length ? ' ' + report.failures.length + ' failed.' : ''}</span></div>}
      {report?.failures?.length > 0 && <div className="error-notice"><AlertCircle size={15}/><span>{report.failures.map((failure) => 'Row ' + failure.row + ' (' + failure.name + '): ' + failure.error).join(' · ')}</span></div>}
    </section>
  )
}
