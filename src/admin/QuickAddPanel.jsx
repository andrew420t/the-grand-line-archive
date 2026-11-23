import { useRef, useState } from 'react'
import { AlertCircle, Check, PackagePlus, RotateCcw, Save, Search } from 'lucide-react'
import { CARD_FIELDS } from './cardParser'
import {
  ensurePhotoStorageReady,
  uploadProductPhotos,
} from './productStorage'
import { buildNewProductPayload, buildQuickAddFieldUpdate, classifyPrintingDuplicate, EXTENDED_CARD_COLUMNS, resolveSetIdForCode } from './productSchema'
import { supabase } from '../lib/supabase'
import { findCatalogueMatches, catalogueMatchToForm, saveCatalogueOverride } from './cardCatalogue'
import CatalogueMatchCard from './CatalogueMatchCard'
import CatalogueLanguageButtons from './CatalogueLanguageButtons'
import PhotoStudio from './PhotoStudio'

const initialProduct = () => ({
  name: '',
  description: '',
  card_number: '',
  set_code: '',
  rarity: '',
  color: '',
  power: '',
  cost: '',
  card_type: '',
  effect_text: '',
  counter: '',
  trigger_text: '',
  attributes: '',
  language: '',
  classification: '',
  condition: 'Near Mint',
  price_gbp: '',
  stock_quantity: '1',
  category_id: '',
  set_id: '',
  variant_label: '',
  catalogue_match_id: '',
  catalogue_printing_key: '',
  catalogue_reference_image_url: '',
  catalogue_reference_image_source: '',
  reference_image_url: '',
  reference_printing_key: '',
  featured: false,
})

const scannedValues = (fields) =>
  Object.fromEntries(
    [
      ...CARD_FIELDS.map(([key]) => [key, fields?.[key]?.value || '']),
      ['counter', fields?.counter?.value || ''],
      ['trigger_text', fields?.trigger_text?.value || ''],
      ['attributes', fields?.attributes?.value || ''],
      ['variant_label', fields?.variant_label?.value || ''],
      ['catalogue_match_id', fields?.catalogue_match_id?.value || ''],
      ['catalogue_printing_key', fields?.catalogue_printing_key?.value || ''],
      ['catalogue_reference_image_url', fields?.catalogue_reference_image_url?.value || ''],
      ['catalogue_reference_image_source', fields?.catalogue_reference_image_source?.value || ''],
      ['reference_image_url', fields?.reference_image_url?.value || ''],
      ['reference_printing_key', fields?.reference_printing_key?.value || ''],
    ],
  )

const rarityOptions = [
  'Leader',
  'Common',
  'Uncommon',
  'Rare',
  'Super Rare',
  'Secret Rare',
  'Special',
  'Treasure Rare',
  'Promo',
  'C', 'UC', 'R', 'SR', 'SEC', 'L', 'P', 'SP', 'TR', 'DON',
]
const languageOptions = ['English', 'Japanese', 'Chinese', 'Korean']
export default function QuickAddPanel({
  products,
  categories,
  sets,
  photos,
  scanFields,
  user,
  onSaved,
  onResetScan,
  onPhotosChange,
}) {
  const [form, setForm] = useState(() => {
    const extracted = scannedValues(scanFields)
    const matchingSet = sets.find(
      (set) => String(set.code || '').toUpperCase() === String(extracted.set_code || '').toUpperCase(),
    )
    return {
      ...initialProduct(),
      ...extracted,
      set_id: matchingSet?.id || resolveSetIdForCode(sets, extracted.set_code),
    }
  })
  const [busy, setBusy] = useState(false)
  const submitLock = useRef(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [duplicateMatches, setDuplicateMatches] = useState([])
  const [allowVariant, setAllowVariant] = useState(false)
  const [partialProductId, setPartialProductId] = useState('')
  const [catalogueMatches, setCatalogueMatches] = useState([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueError, setCatalogueError] = useState('')
  const [librarySaving, setLibrarySaving] = useState(false)
  const setField = (field, value) => {
    setForm((current) => buildQuickAddFieldUpdate(current, field, value, sets))
    // Any change to the candidate card invalidates a prior manual duplicate
    // confirmation. Require the administrator to review the new match again.
    setAllowVariant(false)
    setDuplicateMatches([])
    setError('')
    setSuccess('')
  }

  const lookupCard = async () => {
    if (!form.card_number.trim()) return
    setCatalogueLoading(true)
    setCatalogueError('')
    setCatalogueMatches([])
    try {
      const matches = await findCatalogueMatches(form.card_number)
      setCatalogueMatches(matches)
      if (!matches.length) setCatalogueError('No matching card was found. You can still enter the details manually.')
    } catch (lookupError) {
      setCatalogueError(lookupError.message)
    } finally {
      setCatalogueLoading(false)
    }
  }

  const applyCatalogueMatch = (match) => {
    const details = catalogueMatchToForm(match)
    const matchingSetId = resolveSetIdForCode(sets, match.setCode)
    const matchingCategory = categories.find((category) => String(category.name || '').toLowerCase() === String(match.category || '').toLowerCase())
    setForm((current) => ({
      ...current,
      ...details,
      // Never carry the previous set selection onto a catalogue match for a
      // different/unrecognised set code. That could silently assign the card
      // to the wrong set when saving.
      set_id: matchingSetId || (match.setCode ? '' : current.set_id),
      category_id: matchingCategory?.id || current.category_id,
    }))
    setAllowVariant(false)
    setDuplicateMatches([])
    setCatalogueMatches([])
    setSuccess('Reference details filled in. Check the information against your physical card.')
  }


  const saveCurrentCardToLibrary = async () => {
    setLibrarySaving(true)
    setError('')
    setSuccess('')
    try {
      await saveCatalogueOverride({ form, userId: user?.id })
      setSuccess('Card details saved to the shared catalogue. They will be reused in future lookups and imports.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setLibrarySaving(false)
    }
  }

  const inferredSetId =
    form.set_id ||
    sets.find((set) => String(set.code || '').toUpperCase() === String(form.set_code || '').trim().toUpperCase())?.id ||
    ''

  const checkDuplicates = async (setId, includeVariantMetadata) => {
    if (!form.card_number.trim()) return []
    const buildQuery = () => {
      let query = supabase
        .from('products')
        .select(`id,name,card_number,set_id${includeVariantMetadata ? ',variant_label,language,catalogue_match_id,catalogue_printing_key' : ''}`)
        .eq('card_number', form.card_number.trim())
        .order('id', { ascending: true })
      return setId ? query.eq('set_id', setId) : query.is('set_id', null)
    }
    // Paginate rather than silently inspecting only the first 50 rows. A large
    // inventory must not hide an exact duplicate later in the result set.
    const pageSize = 1000
    let offset = 0
    const data = []
    while (true) {
      const { data: page, error: queryError } = await buildQuery().range(offset, offset + pageSize - 1)
      if (queryError) {
        throw new Error(
          `Could not check the card number and set code for duplicates: ${queryError.message}`,
        )
      }
      data.push(...(page || []))
      if (!page || page.length < pageSize) break
      offset += pageSize
    }
    return data.map((row) => ({
      id: row.id,
      name: row.name || '',
      card_number: row.card_number,
      set_id: row.set_id,
      set_code: sets.find((set) => String(set.id) === String(row.set_id))?.code || '',
      variant_label: row.variant_label || '',
      language: row.language || '',
      catalogue_match_id: row.catalogue_match_id || '',
      catalogue_printing_key: row.catalogue_printing_key || '',
    }))
  }

  const savePhotosForProduct = async (productId) => {
    if (!photos.length) return
    await uploadProductPhotos({
      productId,
      userId: user.id,
      photos,
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase || !user) {
      setError('Sign in with an authorised administrator account to add inventory.')
      return
    }
    if (!form.name.trim()) {
      setError('Card name is required.')
      return
    }
    if (!Number.isFinite(Number(form.price_gbp)) || Number(form.price_gbp) < 0) {
      setError('Enter a valid selling price in GBP.')
      return
    }
    if (!Number.isInteger(Number(form.stock_quantity)) || Number(form.stock_quantity) < 0) {
      setError('Quantity must be a whole number of zero or more.')
      return
    }

    if (submitLock.current) return
    submitLock.current = true
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (partialProductId) {
        await savePhotosForProduct(partialProductId)
        setSuccess(`Photographs linked to the saved product ${partialProductId}.`)
        setPartialProductId('')
        onSaved({ uploadedPhotoIds: photos.map((photo) => photo.id) })
        return
      }

      const selectedSet = sets.find((set) => String(set.id) === String(form.set_id))
      const setFromCodeId = resolveSetIdForCode(sets, form.set_code)
      const resolvedSetId = selectedSet?.id || setFromCodeId
      if (form.set_code.trim() && !resolvedSetId) {
        throw new Error(`No existing set matches code "${form.set_code}". Select the correct set or add it to the sets table first.`)
      }

      const optionalValues = {
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
        catalogue_match_id: form.catalogue_match_id.trim() || null,
        catalogue_printing_key: form.catalogue_printing_key.trim() || null,
        catalogue_reference_image_url: form.catalogue_reference_image_url.trim() || null,
        catalogue_reference_image_source: form.catalogue_reference_image_source.trim() || null,
      }
      const hasExtendedValues = Object.values(optionalValues).some((value) => value !== null)
      let extendedColumnsReady = false
      if (hasExtendedValues) {
        const schemaCheck = await supabase
          .from('products')
          .select(EXTENDED_CARD_COLUMNS.join(','))
          .limit(0)
        if (schemaCheck.error) {
          throw new Error(`Card detail columns are not available in products. No product was saved. Review the proposed schema migration first: ${schemaCheck.error.message}`)
        }
        extendedColumnsReady = true
      }

      const existingProducts = await checkDuplicates(resolvedSetId, extendedColumnsReady)
      const candidatePrinting = {
        catalogue_match_id: form.catalogue_match_id,
        catalogue_printing_key: form.catalogue_printing_key,
        language: form.language,
        variant_label: form.variant_label,
      }
      const matches = existingProducts
        .map((product) => ({ ...product, matchType: classifyPrintingDuplicate(product, candidatePrinting) }))
        .filter((product) => product.matchType !== 'distinct')
      const exactMatches = matches.filter((product) => product.matchType === 'exact')
      const possibleMatches = matches.filter((product) => product.matchType === 'possible')
      setDuplicateMatches(matches)
      if (exactMatches.length) {
        throw new Error('This exact catalogue printing is already in your inventory. Open the existing product to update its quantity, price or photographs instead of creating a duplicate.')
      }
      if (possibleMatches.length && !allowVariant) {
        setError('A product with this card number and set may already exist, but its exact printing identity is not recorded. Check the existing entry before confirming this is a separate printing.')
        return
      }
      if (possibleMatches.length && allowVariant && !form.variant_label.trim()) {
        throw new Error('Enter a variant label before saving a possible duplicate as a separate printing.')
      }
      if (possibleMatches.length && allowVariant && !extendedColumnsReady) {
        const schemaCheck = await supabase
          .from('products')
          .select('variant_label')
          .limit(0)
        if (schemaCheck.error) {
          throw new Error(`Variant labels require the reviewed products migration. No product was saved: ${schemaCheck.error.message}`)
        }
        extendedColumnsReady = true
      }

      if (photos.length) await ensurePhotoStorageReady()
      const payload = buildNewProductPayload(form, resolvedSetId, extendedColumnsReady)
      const result = await supabase
        .from('products')
        .insert(payload)
        .select('*')
        .single()
      if (result.error) {
        throw new Error(`Product was not saved: ${result.error.message}`)
      }

      if (photos.length) {
        try {
          await savePhotosForProduct(result.data.id)
        } catch (photoError) {
          setPartialProductId(result.data.id)
          setError(`Product ${result.data.id} was saved, but its photographs were not fully linked: ${photoError.message}. Keep this form open and retry the photo upload to avoid creating a duplicate product.`)
          return
        }
      }

      setForm(initialProduct())
      setDuplicateMatches([])
      setAllowVariant(false)
      setSuccess('Product and stock saved.')
      onSaved({ uploadedPhotoIds: photos.map((photo) => photo.id) })
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      submitLock.current = false
      setBusy(false)
    }
  }

  const resetManual = () => {
    setForm(initialProduct())
    setError('')
    setSuccess('')
    setDuplicateMatches([])
    setAllowVariant(false)
    setPartialProductId('')
    onResetScan()
  }

  return (
    <section className="quick-add-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow"><PackagePlus size={14} /> QUICK ADD INVENTORY</p>
          <h2>One card.<br /><em>One clean record.</em></h2>
          <p>Use scanner results or enter a card manually. Every value remains editable before saving.</p>
        </div>
        <button className="button button--outline" type="button" onClick={resetManual}>
          <RotateCcw size={14} /> Manual entry
        </button>
      </div>

      {error && <div className="error-notice"><AlertCircle size={16} /><span>{error}</span></div>}
      {success && <div className="success-notice"><Check size={16} /><span>{success}</span></div>}

      {duplicateMatches.length > 0 && (
        <div className="duplicate-warning">
          <div className="duplicate-warning__heading"><Search size={16} /><strong>Existing products with this card number and set</strong></div>
          {duplicateMatches.map((product) => (
            <p key={product.id}>{product.name || 'Unnamed product'} · {product.card_number} · {product.set_code} · {product.variant_label || 'No variant label'} · {product.language || 'Language unknown'} · {product.matchType === 'exact' ? 'Exact printing' : 'Identity needs checking'} · ID {product.id}</p>
          ))}
          {duplicateMatches.some((product) => product.matchType === 'possible') && <label className="check-field"><input type="checkbox" checked={allowVariant} onChange={(event) => setAllowVariant(event.target.checked)} /><span>I checked the existing entry; this is a separate printing. Save it separately.</span></label>}
        </div>
      )}

      <form className="quick-add-form" onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field form-field--wide"><span>Card name / character *</span><input required value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Monkey D. Luffy" /><CatalogueLanguageButtons cardNumber={form.card_number} fieldKey="name" onApply={(value) => setForm((current) => ({ ...current, name: value }))} /></div>
          <label className="form-field"><span>Card number</span><input value={form.card_number} onChange={(event) => setField('card_number', event.target.value)} placeholder="OP05-119" /></label>
          <div className="form-field form-field--wide catalogue-lookup-control">
            <button className="button button--outline" type="button" disabled={!form.card_number.trim() || catalogueLoading} onClick={lookupCard}>
              <Search size={14} /> {catalogueLoading ? 'Searching English and Japanese cards…' : 'Look up card details'}
            </button>
            <small>Reference images are for identification only; your uploaded stock photographs are never changed. Reference data: Koala Kollect (CC BY 4.0). Card artwork remains Bandai's.</small>
            {form.card_number.trim() && form.name.trim() && (
              <button className="text-button" type="button" disabled={librarySaving} onClick={saveCurrentCardToLibrary}>
                {librarySaving ? 'Saving to shared library…' : 'Save these details to the shared card library'}
              </button>
            )}
            {catalogueError && <span className="form-error">{catalogueError}</span>}
            {catalogueMatches.map((match) => (
              <CatalogueMatchCard key={match.id} match={match} onUseDetails={() => applyCatalogueMatch(match)} useLabel="Use this printing" />
            ))}
          </div>
          <label className="form-field"><span>Set code</span><input value={form.set_code} onChange={(event) => setField('set_code', event.target.value)} placeholder="OP05" /><small>Matched to the existing sets.code value.</small></label>
          <label className="form-field"><span>Rarity</span><select value={form.rarity} onChange={(event) => setField('rarity', event.target.value)}><option value="">Choose rarity</option>{[...new Set([...rarityOptions, ...products.map((product) => product.rarity).filter(Boolean)])].map((rarity) => <option key={rarity}>{rarity}</option>)}</select></label>
          <label className="form-field"><span>Colour</span><input value={form.color} onChange={(event) => setField('color', event.target.value)} placeholder="Red" /></label>
          <label className="form-field"><span>Power</span><input inputMode="numeric" value={form.power} onChange={(event) => setField('power', event.target.value.replace(/[^\d]/g, ''))} placeholder="5000" /></label>
          <label className="form-field"><span>Cost</span><input inputMode="numeric" value={form.cost} onChange={(event) => setField('cost', event.target.value.replace(/[^\d]/g, ''))} placeholder="5" /></label>
          <label className="form-field"><span>Card type</span><input value={form.card_type} onChange={(event) => setField('card_type', event.target.value)} placeholder="Character" /></label>
          <div className="form-field"><span>Classification</span><input value={form.classification} onChange={(event) => setField('classification', event.target.value)} placeholder="Character / Leader" /><CatalogueLanguageButtons cardNumber={form.card_number} fieldKey="classification" onApply={(value) => setForm((current) => ({ ...current, classification: value }))} /></div>
          <label className="form-field"><span>Language</span><select value={form.language} onChange={(event) => setField('language', event.target.value)}><option value="">Choose language</option>{languageOptions.map((language) => <option key={language}>{language}</option>)}</select></label>
          <label className="form-field"><span>Condition</span><select value={form.condition} onChange={(event) => setField('condition', event.target.value)}><option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option><option>Heavily Played</option><option>Damaged</option></select></label>
          <label className="form-field"><span>Category</span><select value={form.category_id} onChange={(event) => setField('category_id', event.target.value)}><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          <label className="form-field"><span>Collection / set</span><select value={inferredSetId} onChange={(event) => { const selected = sets.find((set) => String(set.id) === event.target.value); setForm((current) => buildQuickAddFieldUpdate(current, 'set_code', selected?.code || '', sets)); setAllowVariant(false); setDuplicateMatches([]); setError('') }}><option value="">Choose set</option>{sets.map((set) => <option value={set.id} key={set.id}>{set.name}{set.code ? ` · ${set.code}` : ''}</option>)}</select></label>
          <label className="form-field"><span>Variant label</span><input value={form.variant_label} onChange={(event) => setField('variant_label', event.target.value)} placeholder="Parallel / alternate art, if applicable" /></label>
          <label className="check-field"><input type="checkbox" checked={form.featured} onChange={(event) => setField('featured', event.target.checked)} /><span>Feature this product on the homepage</span></label>
          <label className="form-field form-field--wide"><span>Product description</span><textarea rows="3" value={form.description} onChange={(event) => setField('description', event.target.value)} /></label>
          <div className="form-field form-field--wide"><span>Card effect / text</span><textarea rows="4" value={form.effect_text} onChange={(event) => setField('effect_text', event.target.value)} placeholder="Enter only text verified from the card." /><CatalogueLanguageButtons cardNumber={form.card_number} fieldKey="effect_text" onApply={(value) => setForm((current) => ({ ...current, effect_text: value }))} /></div>
          <label className="form-field"><span>Counter</span><input inputMode="numeric" value={form.counter} onChange={(event) => setField('counter', event.target.value.replace(/[^\d]/g, ''))} placeholder="1000" /></label>
          <label className="form-field"><span>Attributes</span><input value={form.attributes} onChange={(event) => setField('attributes', event.target.value)} placeholder="Slash / ..." /></label>
          <label className="form-field form-field--wide"><span>Trigger</span><textarea rows="2" value={form.trigger_text} onChange={(event) => setField('trigger_text', event.target.value)} placeholder="Trigger text, if any." /></label>
          <label className="form-field"><span>Selling price · GBP *</span><div className="price-input"><span>£</span><input required type="number" min="0" step="0.01" value={form.price_gbp} onChange={(event) => setField('price_gbp', event.target.value)} placeholder="0.00" /></div></label>
          <label className="form-field"><span>Quantity *</span><input required type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => setField('stock_quantity', event.target.value)} /></label>
        </div>
        <div className="quick-add-photo-section">
          <div className="admin-view-heading">
            <div>
              <p className="eyebrow">CARD PHOTOGRAPHS</p>
              <h3>Add photos to this stock item</h3>
              <p className="admin-muted">Upload or take the card photo here. Set the front image as the main catalogue picture; add a back or detail photo if needed.</p>
            </div>
          </div>
          <PhotoStudio photos={photos} onPhotosChange={onPhotosChange} />
        </div>
        <div className="quick-add-form__footer">
          <p>{photos.length} photograph{photos.length === 1 ? '' : 's'} will be linked to this product. Keep the front photograph in the photo review to show it in the public catalogue.</p>
          <button className="button button--gold" type="submit" disabled={busy}>
            <Save size={15} /> {busy ? 'Saving…' : partialProductId ? 'Retry photo linking' : 'Save product'}
          </button>
        </div>
      </form>

      {products.length > 0 && <p className="quick-add-note">{products.length} existing products available for duplicate checks.</p>}
    </section>
  )
}
