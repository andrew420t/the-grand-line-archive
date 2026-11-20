import { useState } from 'react'
import { AlertCircle, Check, PackagePlus, RotateCcw, Save, Search } from 'lucide-react'
import { CARD_FIELDS } from './cardParser'
import {
  ensurePhotoStorageReady,
  uploadProductPhotos,
} from './productStorage'
import { buildNewProductPayload, EXTENDED_CARD_COLUMNS } from './productSchema'
import { supabase } from '../lib/supabase'
import { findCatalogueMatches, catalogueMatchToForm } from './cardCatalogue'

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
  language: '',
  classification: '',
  condition: 'Near Mint',
  price_gbp: '',
  stock_quantity: '1',
  category_id: '',
  set_id: '',
  variant_label: '',
  featured: false,
})

const scannedValues = (fields) =>
  Object.fromEntries(
    CARD_FIELDS.map(([key]) => [key, fields?.[key]?.value || '']),
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
}) {
  const [form, setForm] = useState(() => {
    const extracted = scannedValues(scanFields)
    const matchingSet = sets.find(
      (set) => String(set.code || '').toUpperCase() === String(extracted.set_code || '').toUpperCase(),
    )
    return {
      ...initialProduct(),
      ...extracted,
      set_id: matchingSet?.id || '',
    }
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [duplicateMatches, setDuplicateMatches] = useState([])
  const [allowVariant, setAllowVariant] = useState(false)
  const [partialProductId, setPartialProductId] = useState('')
  const [catalogueMatches, setCatalogueMatches] = useState([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueError, setCatalogueError] = useState('')
  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
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
    const matchingSet = sets.find((set) => String(set.code || '').replace(/-/g, '').toUpperCase() === String(match.setCode || '').replace(/-/g, '').toUpperCase())
    const matchingCategory = categories.find((category) => String(category.name || '').toLowerCase() === String(match.category || '').toLowerCase())
    setForm((current) => ({
      ...current,
      ...details,
      set_id: matchingSet?.id || current.set_id,
      category_id: matchingCategory?.id || current.category_id,
    }))
    setCatalogueMatches([])
    setSuccess('Reference details filled in. Check the information against your physical card.')
  }

  const inferredSetId =
    form.set_id ||
    sets.find((set) => String(set.code || '').toUpperCase() === String(form.set_code || '').trim().toUpperCase())?.id ||
    ''

  const checkDuplicates = async (setId, includeVariantLabel) => {
    if (!form.card_number.trim()) return []
    let query = supabase
      .from('products')
      .select(`id,name,card_number,set_id${includeVariantLabel ? ',variant_label' : ''}`)
      .eq('card_number', form.card_number.trim())
    query = setId ? query.eq('set_id', setId) : query.is('set_id', null)
    const { data, error: queryError } = await query.limit(10)

    if (queryError) {
      throw new Error(
        `Could not check the card number and set code for duplicates: ${queryError.message}`,
      )
    }
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name || '',
      card_number: row.card_number,
      set_id: row.set_id,
      set_code: sets.find((set) => String(set.id) === String(row.set_id))?.code || '',
      variant_label: row.variant_label || '',
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

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (partialProductId) {
        await savePhotosForProduct(partialProductId)
        setSuccess(`Photographs linked to the saved product ${partialProductId}.`)
        setPartialProductId('')
        onSaved()
        return
      }

      const selectedSet = sets.find((set) => String(set.id) === String(form.set_id))
      const setFromCode = form.set_code
        ? sets.find((set) => String(set.code || '').toUpperCase() === form.set_code.trim().toUpperCase())
        : null
      const resolvedSetId = selectedSet?.id || setFromCode?.id || ''
      if (form.set_code.trim() && !resolvedSetId) {
        throw new Error(`No existing set matches code "${form.set_code}". Select the correct set or add it to the sets table first.`)
      }

      const optionalValues = {
        color: form.color.trim() || null,
        power: form.power === '' ? null : Number(form.power),
        cost: form.cost === '' ? null : Number(form.cost),
        card_type: form.card_type.trim() || null,
        effect_text: form.effect_text.trim() || null,
        language: form.language.trim() || null,
        classification: form.classification.trim() || null,
        variant_label: form.variant_label.trim() || null,
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

      const matches = await checkDuplicates(resolvedSetId, extendedColumnsReady)
      setDuplicateMatches(matches)
      if (matches.length && !allowVariant) {
        setError('A product with this card number and set already exists. Open that product for photos/stock, or confirm that this is a legitimate variant.')
        return
      }
      if (matches.length && allowVariant && !form.variant_label.trim()) {
        throw new Error('Enter a variant label before saving a duplicate card number and set.')
      }
      if (matches.length && allowVariant && !extendedColumnsReady) {
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
      onSaved()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
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
          <div className="duplicate-warning__heading"><Search size={16} /><strong>Matching card number and set code</strong></div>
          {duplicateMatches.map((product) => (
            <p key={product.id}>{product.name || 'Unnamed product'} · {product.card_number} · {product.set_code} · {product.variant_label || 'No variant label'} · ID {product.id}</p>
          ))}
          <label className="check-field"><input type="checkbox" checked={allowVariant} onChange={(event) => setAllowVariant(event.target.checked)} /><span>This is a distinct card variant. Save it as a separate product.</span></label>
        </div>
      )}

      <form className="quick-add-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="form-field form-field--wide"><span>Card name / character *</span><input required value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Monkey D. Luffy" /></label>
          <label className="form-field"><span>Card number</span><input value={form.card_number} onChange={(event) => setField('card_number', event.target.value)} placeholder="OP05-119" /></label>
          <div className="form-field form-field--wide catalogue-lookup-control">
            <button className="button button--outline" type="button" disabled={!form.card_number.trim() || catalogueLoading} onClick={lookupCard}>
              <Search size={14} /> {catalogueLoading ? 'Searching English and Japanese cards…' : 'Look up card details'}
            </button>
            <small>Reference images are for identification only. Your uploaded stock photographs are not changed.</small>
            {catalogueError && <span className="form-error">{catalogueError}</span>}
            {catalogueMatches.map((match) => (
              <article className="catalogue-match-card" key={match.id}>
                {match.imageUrl ? <img src={match.imageUrl} alt={match.name + ' reference image'} loading="lazy" /> : <div className="catalogue-match-card__no-image">No reference image</div>}
                <div className="catalogue-match-card__details">
                  <strong>{match.name || 'Card name unavailable'}</strong>
                  <span>{match.language} · {match.setCode || 'Promo / set not listed'} · {match.rarity || 'Rarity not listed'} · {match.variant || 'Base'}</span>
                  <small>{match.colors || 'Colour not listed'} · {match.category || 'Card'} · {match.power ? match.power + ' power' : 'No power'} · {match.cost !== '' ? match.cost + ' cost' : 'No cost'}</small>
                  {match.setName && <small>{match.setName}</small>}
                  <button className="button button--gold" type="button" onClick={() => applyCatalogueMatch(match)}>Use this printing</button>
                </div>
              </article>
            ))}
          </div>
          <label className="form-field"><span>Set code</span><input value={form.set_code} onChange={(event) => setField('set_code', event.target.value)} placeholder="OP05" /><small>Matched to the existing sets.code value.</small></label>
          <label className="form-field"><span>Rarity</span><select value={form.rarity} onChange={(event) => setField('rarity', event.target.value)}><option value="">Choose rarity</option>{[...new Set([...rarityOptions, ...products.map((product) => product.rarity).filter(Boolean)])].map((rarity) => <option key={rarity}>{rarity}</option>)}</select></label>
          <label className="form-field"><span>Colour</span><input value={form.color} onChange={(event) => setField('color', event.target.value)} placeholder="Red" /></label>
          <label className="form-field"><span>Power</span><input inputMode="numeric" value={form.power} onChange={(event) => setField('power', event.target.value.replace(/[^\d]/g, ''))} placeholder="5000" /></label>
          <label className="form-field"><span>Cost</span><input inputMode="numeric" value={form.cost} onChange={(event) => setField('cost', event.target.value.replace(/[^\d]/g, ''))} placeholder="5" /></label>
          <label className="form-field"><span>Card type</span><input value={form.card_type} onChange={(event) => setField('card_type', event.target.value)} placeholder="Character" /></label>
          <label className="form-field"><span>Classification</span><input value={form.classification} onChange={(event) => setField('classification', event.target.value)} placeholder="Character / Leader" /></label>
          <label className="form-field"><span>Language</span><select value={form.language} onChange={(event) => setField('language', event.target.value)}><option value="">Choose language</option>{languageOptions.map((language) => <option key={language}>{language}</option>)}</select></label>
          <label className="form-field"><span>Condition</span><select value={form.condition} onChange={(event) => setField('condition', event.target.value)}><option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option><option>Heavily Played</option><option>Damaged</option></select></label>
          <label className="form-field"><span>Category</span><select value={form.category_id} onChange={(event) => setField('category_id', event.target.value)}><option value="">Choose category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          <label className="form-field"><span>Collection / set</span><select value={inferredSetId} onChange={(event) => { const selected = sets.find((set) => String(set.id) === event.target.value); setForm((current) => ({ ...current, set_id: event.target.value, set_code: selected?.code || '' })); setError('') }}><option value="">Choose set</option>{sets.map((set) => <option value={set.id} key={set.id}>{set.name}{set.code ? ` · ${set.code}` : ''}</option>)}</select></label>
          <label className="form-field"><span>Variant label</span><input value={form.variant_label} onChange={(event) => setField('variant_label', event.target.value)} placeholder="Parallel / alternate art, if applicable" /></label>
          <label className="check-field"><input type="checkbox" checked={form.featured} onChange={(event) => setField('featured', event.target.checked)} /><span>Feature this product on the homepage</span></label>
          <label className="form-field form-field--wide"><span>Product description</span><textarea rows="3" value={form.description} onChange={(event) => setField('description', event.target.value)} /></label>
          <label className="form-field form-field--wide"><span>Card effect / text</span><textarea rows="4" value={form.effect_text} onChange={(event) => setField('effect_text', event.target.value)} placeholder="Enter only text verified from the card." /></label>
          <label className="form-field"><span>Selling price · GBP *</span><div className="price-input"><span>£</span><input required type="number" min="0" step="0.01" value={form.price_gbp} onChange={(event) => setField('price_gbp', event.target.value)} placeholder="0.00" /></div></label>
          <label className="form-field"><span>Quantity *</span><input required type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => setField('stock_quantity', event.target.value)} /></label>
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
