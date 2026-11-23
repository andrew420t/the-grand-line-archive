import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Box,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  Image,
  ImagePlus,
  Layers,
  LayoutDashboard,
  Package,
  PackagePlus,
  Palette,
  Pencil,
  Search,
  ScanLine,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CARD_FIELDS } from './cardParser'
import { getProductImagePaths, removeStoredPhotos } from './productStorage'
import CardScanner from './CardScanner'
import PhotoStudio from './PhotoStudio'
import QuickAddPanel from './QuickAddPanel'
import StockPhotographyPanel from './StockPhotographyPanel'
import ImageLibraryPanel from './ImageLibraryPanel'
import BulkImportPanel from './BulkImportPanel'
import { findCatalogueMatches, catalogueMatchToForm } from './cardCatalogue'
import CatalogueMatchCard from './CatalogueMatchCard'
import CatalogueLanguageButtons from './CatalogueLanguageButtons'
import { buildProductEditPayload } from './productEditPayload'

const blankScanFields = () =>
  Object.fromEntries(
    CARD_FIELDS.map(([key]) => [
      key,
      { value: '', confidence: 0, needsReview: true },
    ]),
  )

const adminSections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'add-stock', label: 'Add New Stock', icon: PackagePlus },
  { id: 'bulk-import', label: 'Bulk Import', icon: FileSpreadsheet },
  { id: 'scan-card', label: 'Scan Card', icon: ScanLine },
  { id: 'photography', label: 'Stock Photography', icon: Camera },
  { id: 'image-library', label: 'Image Library', icon: ImagePlus },
  { id: 'collections', label: 'Collections and Sets', icon: Layers },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'customisation', label: 'Website Customisation', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function AdminDashboard({
  user,
  isAdmin,
  profileError,
  products,
  categories,
  sets,
  siteSettings,
  siteSettingsError,
  orders,
  orderItems,
  loading,
  error,
  action,
  onSignIn,
  onReload,
  onUpdateStatus,
  onRefreshProducts,
  onSaveSiteSettings,
}) {
  const [activeSection, setActiveSection] = useState('overview')
  const [photos, setPhotos] = useState([])
  const [scanFields, setScanFields] = useState(blankScanFields)
  const [scanVersion, setScanVersion] = useState(0)
  const [rawText, setRawText] = useState('')

  const customerSummary = useMemo(() => {
    const customers = new Map()
    orders.forEach((order) => {
      const customerId = order.user_id || order.customer_id || order.profile_id
      if (!customerId) return
      const current = customers.get(String(customerId)) || { id: customerId, orders: 0 }
      current.orders += 1
      customers.set(String(customerId), current)
    })
    return [...customers.values()]
  }, [orders])

  if (!user) {
    return (
      <main className="page-width protected-page">
        <p className="eyebrow">ARCHIVE STAFF</p>
        <h1>Administrator<br /><em>sign in required.</em></h1>
        <button className="button button--gold" type="button" onClick={onSignIn}>Sign in <ArrowRight size={16} /></button>
      </main>
    )
  }
  if (!isAdmin) {
    return (
      <main className="page-width protected-page">
        <p className="eyebrow">RESTRICTED AREA</p>
        <h1>Admin access<br /><em>not permitted.</em></h1>
        <p>{profileError ? `The profile role could not be verified: ${profileError}` : 'This account does not have an administrator role.'}</p>
        <Link className="button button--outline" to="/account/orders">View your orders</Link>
      </main>
    )
  }

  const activeTab = adminSections.find((section) => section.id === activeSection) || adminSections[0]
  const pendingCount = orders.filter((order) =>
    ['pending', 'processing'].includes(String(order.status).toLowerCase()),
  ).length
  return (
    <main className="page-width admin-dashboard">
      <div className="admin-dashboard__heading">
        <div>
          <p className="eyebrow"><BadgeCheck size={14} /> GRAND LINE ARCHIVE · ADMIN</p>
          <h1>Archive <em>control.</em></h1>
          <p>Signed in as {user.email || user.id}</p>
        </div>
        <span className="admin-role"><Check size={14} /> Admin profile verified</span>
      </div>

      <div className="admin-dashboard__workspace">
        <nav className="admin-navigation" aria-label="Administrator sections">
          {adminSections.map(({ id, label, icon: Icon }) => (
            <button
              className={activeSection === id ? 'admin-navigation__item is-active' : 'admin-navigation__item'}
              type="button"
              key={id}
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={15} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-dashboard__main">
      {activeSection === 'overview' && (
        <section className="admin-view overview-view">
          <div className="admin-view-heading">
            <div><p className="eyebrow">OVERVIEW</p><h2>The vault, at a glance.</h2></div>
            <button className="button button--outline" type="button" onClick={() => { onReload(); onRefreshProducts() }}>Refresh dashboard</button>
          </div>
          <div className="overview-metrics">
            <Metric icon={Package} label="Products in the archive" value={products.length} />
            <Metric icon={ClipboardList} label="Orders" value={orders.length} />
            <Metric icon={AlertCircle} label="Orders needing attention" value={pendingCount} />
            <Metric icon={Users} label="Customers with orders" value={customerSummary.length} />
          </div>
          <div className="overview-actions">
            <button type="button" onClick={() => setActiveSection('add-stock')}><PackagePlus size={19} /><strong>Add stock</strong><span>Enter a card manually or use scan results.</span><ArrowRight size={15} /></button>
            <button type="button" onClick={() => setActiveSection('scan-card')}><ScanLine size={19} /><strong>Scan a card</strong><span>Photograph and review OCR before saving.</span><ArrowRight size={15} /></button>
            <button type="button" onClick={() => setActiveSection('photography')}><Camera size={19} /><strong>Stock photography</strong><span>Capture card fronts, backs, and details.</span><ArrowRight size={15} /></button>
          </div>
          <div className="admin-security-note"><ShieldAlert size={16} /><span>Admin screens are role-gated in the UI. Supabase Row Level Security must also protect every product write and Storage upload.</span></div>
        </section>
      )}

      {activeSection === 'products' && (
        <ProductsSection
          products={products}
          categories={categories}
          sets={sets}
          onRefresh={onRefreshProducts}
        />
      )}

      <div className="admin-hidden-panel" hidden={activeSection !== 'add-stock'}>
        <QuickAddPanel
          key={scanVersion}
          products={products}
          categories={categories}
          sets={sets}
          photos={photos}
          onPhotosChange={setPhotos}
          scanFields={scanFields}
          user={user}
          onSaved={() => {
            photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
            setPhotos([])
            setScanFields(blankScanFields())
            setScanVersion((current) => current + 1)
            setRawText('')
            onRefreshProducts()
          }}
          onResetScan={() => {
            setScanFields(blankScanFields())
            setScanVersion((current) => current + 1)
            setRawText('')
          }}
        />
      </div>

      <div className="admin-hidden-panel" hidden={activeSection !== 'bulk-import'}>
        <BulkImportPanel products={products} categories={categories} sets={sets} user={user} onSaved={onRefreshProducts} />
      </div>

      <div className="admin-hidden-panel" hidden={activeSection !== 'scan-card'}>
        <CardScanner
          photos={photos}
          fields={scanFields}
          setFields={setScanFields}
          rawText={rawText}
          setRawText={setRawText}
          onContinue={() => {
            setScanVersion((current) => current + 1)
            setActiveSection('add-stock')
          }}
        />
        <div className="admin-photo-workspace">
          <div className="admin-photo-workspace__heading"><p className="eyebrow">01 · CARD PHOTOGRAPH</p><h3>Capture or upload the card before scanning.</h3></div>
          <PhotoStudio photos={photos} onPhotosChange={setPhotos} />
        </div>
      </div>

      <div className="admin-hidden-panel" hidden={activeSection !== 'photography'}>
        <StockPhotographyPanel
          products={products}
          photos={photos}
          onPhotosChange={setPhotos}
          user={user}
          onSaved={onRefreshProducts}
        />
      </div>

      <div className="admin-hidden-panel" hidden={activeSection !== 'image-library'}>
        <ImageLibraryPanel user={user} />
      </div>

      {activeSection === 'collections' && (
        <CollectionsSection categories={categories} sets={sets} onRefresh={onRefreshProducts} />
      )}

      {activeSection === 'orders' && (
        <OrdersSection
          orders={orders}
          orderItems={orderItems}
          products={products}
          loading={loading}
          error={error}
          action={action}
          onReload={onReload}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {activeSection === 'customers' && (
        <CustomersSection customers={customerSummary} />
      )}

      {activeSection === 'customisation' && (
        <CustomisationSection
          key={JSON.stringify(siteSettings)}
          products={products}
          settings={siteSettings}
          settingsError={siteSettingsError}
          onSave={onSaveSiteSettings}
        />
      )}
      {activeSection === 'settings' && <SettingsSection user={user} />}
      <span className="sr-only" aria-live="polite">{activeTab.label} section selected</span>
        </div>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value }) {
  return <article className="overview-metric"><span className="overview-metric__icon"><Icon size={17} /></span><span>{label}</span><strong>{value}</strong></article>
}

function ProductsSection({ products, categories, sets, onRefresh }) {
  const [query, setQuery] = useState('')
  const [changes, setChanges] = useState({})
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [lookupProduct, setLookupProduct] = useState(null)
  const [lookupMatches, setLookupMatches] = useState([])
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupSaving, setLookupSaving] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const visibleProducts = products.filter((product) =>
    [product.name, product.setName, product.category, product.rarity, product.raw?.card_number]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  const valueFor = (product, field) =>
    changes[product.id]?.[field] ?? String(product.raw?.[field] ?? '')

  const lookupProductCard = async (product) => {
    const cardNumber = product.raw?.card_number
    if (!cardNumber) {
      setError('This product has no card number. Edit the card and add its card number first.')
      return
    }
    setLookupProduct(product)
    setLookupMatches([])
    setLookupError('')
    setLookupBusy(true)
    try {
      const matches = await findCatalogueMatches(cardNumber)
      setLookupMatches(matches)
      if (!matches.length) setLookupError('No matching catalogue records were found for this card number.')
    } catch (lookupFailure) {
      setLookupError(lookupFailure.message || 'Card lookup failed.')
    } finally {
      setLookupBusy(false)
    }
  }

  const applyProductCatalogueMatch = async (match) => {
    if (!lookupProduct || !supabase) return
    const raw = lookupProduct.raw || {}
    const details = catalogueMatchToForm(match)
    const payload = {}
    const mappings = {
      name: details.name, card_number: details.card_number, rarity: details.rarity,
      color: details.color, power: details.power, cost: details.cost,
      card_type: details.card_type, effect_text: details.effect_text,
      language: details.language, classification: details.classification,
      variant_label: details.variant_label, counter: details.counter,
      trigger_text: details.trigger_text, attributes: details.attributes,
      catalogue_match_id: details.catalogue_match_id,
      catalogue_printing_key: details.catalogue_printing_key,
      catalogue_reference_image_url: details.catalogue_reference_image_url,
      catalogue_reference_image_source: details.catalogue_reference_image_source,
      reference_image_url: details.reference_image_url,
      reference_printing_key: details.reference_printing_key,
    }
    Object.entries(mappings).forEach(([column, value]) => {
      const current = raw[column]
      const isEmpty = current === null || current === undefined || String(current).trim() === ''
      if (column in raw && isEmpty && value !== '' && value !== null && value !== undefined) {
        payload[column] = ['power', 'cost', 'counter'].includes(column) ? Number(value) : value
      }
    })
    const matchingSet = sets.find((set) =>
      String(set.code || '').replace(/-/g, '').toUpperCase() === String(match.setCode || '').replace(/-/g, '').toUpperCase()
    )
    if ('set_id' in raw && (raw.set_id === null || raw.set_id === '') && matchingSet) payload.set_id = matchingSet.id
    const matchingCategory = categories.find((category) =>
      String(category.name || '').toLowerCase() === String(match.category || '').toLowerCase()
    )
    if ('category_id' in raw && (raw.category_id === null || raw.category_id === '') && matchingCategory) payload.category_id = matchingCategory.id
    if ('updated_at' in raw) payload.updated_at = new Date().toISOString()
    if (!Object.keys(payload).length) {
      setLookupError('No missing catalogue fields could be added. Existing details and stock information were left unchanged.')
      return
    }
    setLookupSaving(true)
    setLookupError('')
    const result = await supabase.from('products').update(payload).eq('id', lookupProduct.id)
    setLookupSaving(false)
    if (result.error) {
      setLookupError('Product details were not updated: ' + result.error.message)
      return
    }
    setNotice('Missing card details filled from the catalogue. Your stock, price and uploaded photos were left unchanged.')
    setLookupProduct(null)
    setLookupMatches([])
    onRefresh()
  }

  const saveInventory = async (product) => {
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    const raw = product.raw || {}
    const values = changes[product.id] || {}
    const quantity = Number(values.stock ?? raw.stock_quantity)
    const price = Number(values.price ?? raw.price)
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) {
      setError('Enter a non-negative whole-number quantity and a valid price.')
      return
    }

    setBusyId(String(product.id))
    setError('')
    setNotice('')
    const result = await supabase
      .from('products')
      .update({ stock_quantity: quantity, price, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (result.error) {
      setError(`Stock was not updated: ${result.error.message}`)
    } else {
      setNotice(`${product.name} inventory updated.`)
      onRefresh()
    }
    setBusyId('')
  }

  const toggleArchivePublication = async (product) => {
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    const currentStatus = String(product.raw?.status || '').trim().toLowerCase()
    const willPublish = currentStatus !== 'active'
    const nextStatus = willPublish ? 'active' : 'draft'
    const actionLabel = willPublish ? 'post to the public Archive' : 'remove from the public Archive'
    if (!window.confirm(`Are you sure you want to ${actionLabel}: "${product.name}"?`)) return

    setBusyId(String(product.id))
    setError('')
    setNotice('')
    const result = await supabase
      .from('products')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', product.id)
    if (result.error) {
      setError(`Product publication was not updated: ${result.error.message}`)
    } else {
      setNotice(willPublish ? `${product.name} is now posted to the public Archive.` : `${product.name} is now private in the Inventory Book.`)
      onRefresh()
    }
    setBusyId('')
  }

  const deleteProduct = async (product) => {
    if (!window.confirm(`Permanently delete "${product.name}" from the archive?`)) return
    setBusyId(String(product.id))
    setError('')
    setNotice('')
    try {
      const imagePaths = await getProductImagePaths(product.id)
      const result = await supabase.from('products').delete().eq('id', product.id)
      if (result.error) {
        setError(`Product was not deleted: ${result.error.message}`)
        return
      }
      onRefresh()
      try {
        await removeStoredPhotos(imagePaths)
        setNotice(`${product.name} was deleted.`)
      } catch (cleanupError) {
        setError(`${product.name} was deleted, but its Storage images could not be removed: ${cleanupError.message}`)
      }
    } catch (deleteError) {
      setError(`Product was not deleted: ${deleteError.message}`)
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="admin-view">
      <div className="admin-view-heading"><div><p className="eyebrow">PRODUCTS</p><h2>Inventory book</h2></div><button className="button button--outline" type="button" onClick={onRefresh}>Refresh products</button></div>
      <label className="search-field admin-product-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, card number, rarity, set…" /></label>
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={15} /><span>{notice}</span></div>}
      {visibleProducts.length ? (
        <div className="inventory-list">
          {visibleProducts.map((product) => {
            const raw = product.raw || {}
            return (
              <article className="inventory-item" key={product.id}>
                <div className="inventory-item__photo">{product.image ? <img src={product.image} alt={product.name} /> : <Image size={22} />}</div>
                <div className="inventory-item__details"><p className="eyebrow">{product.setCode ? `${product.setCode} · ` : ''}{product.setName || product.category || 'CARD'}</p><h3>{product.name}</h3><span>{raw.card_number || 'Card number not recorded'} · {product.rarity || 'Rarity not recorded'}</span><span>{[raw.language, raw.variant_label].filter(Boolean).join(' · ') || 'Language / printing not recorded'}</span>{raw.catalogue_printing_key && <span className="admin-muted">Printing: {raw.catalogue_printing_key}</span>}<span className={String(raw.status || '').toLowerCase() === 'active' ? 'inventory-publication-status is-published' : 'inventory-publication-status'}>{String(raw.status || '').toLowerCase() === 'active' ? 'Published in Archive' : 'Private · Inventory only'}</span></div>
                <label className="form-field inventory-input"><span>GBP price</span><input type="number" min="0" step="0.01" value={valueFor(product, 'price') || raw.price || ''} onChange={(event) => setChanges((current) => ({ ...current, [product.id]: { ...current[product.id], price: event.target.value } }))} /></label>
                <label className="form-field inventory-input"><span>Quantity</span><input type="number" min="0" step="1" value={valueFor(product, 'stock') || raw.stock_quantity || 0} onChange={(event) => setChanges((current) => ({ ...current, [product.id]: { ...current[product.id], stock: event.target.value } }))} /></label>
                <button className="button button--outline inventory-save" type="button" disabled={busyId === String(product.id)} onClick={() => saveInventory(product)}>{busyId === String(product.id) ? 'Saving…' : 'Update stock'}</button>
                <div className="inventory-item__actions">
                  <button className={String(raw.status || '').toLowerCase() === 'active' ? 'button button--outline' : 'button button--gold'} type="button" disabled={busyId === String(product.id)} onClick={() => toggleArchivePublication(product)}>{busyId === String(product.id) ? 'Saving…' : String(raw.status || '').toLowerCase() === 'active' ? 'Remove from Archive' : 'Post to Archive'}</button>
                  <button className="button button--outline" type="button" onClick={() => setEditingProduct(product)}><Pencil size={14} /> Edit card</button>
                  <button className="button button--outline" type="button" disabled={busyId === String(product.id) || !raw.card_number} onClick={() => lookupProductCard(product)}><Search size={14} /> Look up card</button>
                  <button className="button button--danger" type="button" disabled={busyId === String(product.id)} onClick={() => deleteProduct(product)}><Trash2 size={14} /> Delete</button>
                </div>
              </article>
            )
          })}
        </div>
      ) : <EmptyAdminState icon={Package} heading="No products found." text={query ? 'Try another search.' : 'The products table currently has no visible rows. Add a card to start the inventory.'} />}
      {lookupProduct && (
        <div className="modal-backdrop product-edit-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !lookupSaving && !lookupBusy) setLookupProduct(null) }}>
          <section className="product-edit-modal catalogue-product-lookup" role="dialog" aria-modal="true" aria-labelledby="catalogue-product-lookup-title">
            <div className="product-edit-modal__heading">
              <div><p className="eyebrow">CARD CATALOGUE</p><h2 id="catalogue-product-lookup-title">Find missing details.</h2><p className="admin-muted">{lookupProduct.name} · {lookupProduct.raw?.card_number}</p></div>
              <button className="icon-button" type="button" aria-label="Close lookup" disabled={lookupSaving || lookupBusy} onClick={() => setLookupProduct(null)}><X size={18} /></button>
            </div>
            <p className="admin-muted">Choose the correct language, set and printing. Only blank card-detail fields will be filled. Price, quantity, condition, status and your uploaded product photos will not be changed.</p>
            {lookupBusy && <p className="admin-muted">Searching English and Japanese catalogue records…</p>}
            {lookupError && <p className="form-error" role="alert">{lookupError}</p>}
            <div className="catalogue-product-lookup__matches">
              {lookupMatches.map((match) => (
                <CatalogueMatchCard key={match.id} match={match} onUseDetails={() => applyProductCatalogueMatch(match)} useLabel={lookupSaving ? 'Filling missing details…' : 'Fill missing details'} disabled={lookupSaving} />
              ))}
            </div>
          </section>
        </div>
      )}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          sets={sets}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null)
            onRefresh()
          }}
        />
      )}
    </section>
  )
}

const productEditFields = [
  { key: 'name', label: 'Card name', columns: ['name'], required: true },
  { key: 'description', label: 'Product description', columns: ['description'], multiline: true },
  { key: 'card_number', label: 'Card number', columns: ['card_number'] },
  { key: 'rarity', label: 'Rarity', columns: ['rarity'], options: ['Leader', 'Common', 'Uncommon', 'Rare', 'Super Rare', 'Secret Rare', 'Special', 'Treasure Rare', 'Promo'] },
  { key: 'color', label: 'Colour', columns: ['color'] },
  { key: 'power', label: 'Power', columns: ['power'], numeric: true },
  { key: 'cost', label: 'Cost', columns: ['cost'], numeric: true },
  { key: 'card_type', label: 'Card type', columns: ['card_type'] },
  { key: 'effect_text', label: 'Card effect', columns: ['effect_text'], multiline: true },
  { key: 'counter', label: 'Counter', columns: ['counter'], numeric: true },
  { key: 'trigger_text', label: 'Trigger', columns: ['trigger_text'], multiline: true },
  { key: 'attributes', label: 'Attributes', columns: ['attributes'] },
  { key: 'language', label: 'Language', columns: ['language'], options: ['English', 'Japanese', 'Chinese', 'Korean'] },
  { key: 'classification', label: 'Classification', columns: ['classification'] },
  { key: 'condition', label: 'Condition', columns: ['condition'] },
  { key: 'price', label: 'GBP price', columns: ['price'], numeric: true },
  { key: 'stock', label: 'Stock quantity', columns: ['stock_quantity'], numeric: true },
  { key: 'category_id', label: 'Category', columns: ['category_id'], select: 'categories' },
  { key: 'set_id', label: 'Set', columns: ['set_id'], select: 'sets' },
  { key: 'featured', label: 'Featured product', columns: ['featured'], checkbox: true },
  { key: 'status', label: 'Status', columns: ['status'], options: ['active', 'draft', 'archived'] },
  { key: 'slug', label: 'Slug', columns: ['slug'] },
  { key: 'variant_label', label: 'Variant label', columns: ['variant_label'] },
]

function ProductEditModal({ product, categories, sets, onClose, onSaved }) {
  const raw = product.raw || {}
  const fields = productEditFields
    .map((field) => ({ ...field, column: field.columns.find((column) => column in raw) }))
    .filter((field) => field.column)
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.key, raw[field.column] ?? ''])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    const payload = buildProductEditPayload(fields, values, raw)
    if (fields.some((field) => field.key === 'name') && !String(values.name || '').trim()) {
      setError('Card name is required.')
      return
    }
    if (fields.some((field) => field.key === 'price' || field.key === 'stock') &&
        fields.some((field) => ['price', 'stock'].includes(field.key) && values[field.key] === '')) {
      setError('Price and stock quantity are required. Optional card details can be cleared.')
      return
    }
    if (Object.values(payload).some((value) => typeof value === 'number' && !Number.isFinite(value))) {
      setError('Enter valid numbers for price, power, cost, and stock.')
      return
    }

    setBusy(true)
    setError('')
    const result = await supabase.from('products').update(payload).eq('id', product.id)
    if (result.error) {
      setError(`Product was not updated: ${result.error.message}`)
      setBusy(false)
      return
    }
    setBusy(false)
    onSaved()
  }

  const renderField = (field) => {
    const value = values[field.key]
    if (field.checkbox) {
      return (
        <label className="check-field" key={field.key}>
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))} />
          <span>{field.label}</span>
        </label>
      )
    }
    if (field.select) {
      const options = field.select === 'sets' ? sets : categories
      return (
        <label className="form-field" key={field.key}>
          <span>{field.label}</span>
          <select value={value ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
            <option value="">No {field.label.toLowerCase()}</option>
            {options.map((option) => <option value={option.id} key={option.id}>{field.select === 'sets' && option.code ? `${option.name} · ${option.code}` : option.name || option.title || option.id}</option>)}
          </select>
        </label>
      )
    }
    if (field.options) {
      const options = [...new Set([value, ...field.options].filter(Boolean))]
      return (
        <label className="form-field" key={field.key}>
          <span>{field.label}</span>
          <select value={value || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
            <option value="">— Clear field —</option>
            {options.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        </label>
      )
    }
    if (field.key === 'condition') {
      return (
        <label className="form-field" key={field.key}>
          <span>{field.label}</span>
          <select value={value || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
            <option value="">— Clear field —</option>
            {['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'].map((condition) => <option key={condition}>{condition}</option>)}
          </select>
        </label>
      )
    }
    return (
      <div className={`form-field ${field.multiline ? 'form-field--wide' : ''}`} key={field.key}>
        <span>{field.label}</span>
        {field.multiline ? (
          <textarea aria-label={field.label} rows="4" value={value ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
        ) : (
          <input aria-label={field.label} required={field.required} type={field.numeric ? 'number' : 'text'} min={field.numeric ? '0' : undefined} step={field.key === 'price' ? '0.01' : field.numeric ? '1' : undefined} value={value ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
        )}
        {['name', 'effect_text', 'classification'].includes(field.key) && (
          <CatalogueLanguageButtons cardNumber={values.card_number || raw.card_number} fieldKey={field.key} onApply={(nextValue) => setValues((current) => ({ ...current, [field.key]: nextValue }))} />
        )}
      </div>
    )
  }

  return (
    <div className="modal-backdrop product-edit-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="product-edit-modal" role="dialog" aria-modal="true" aria-labelledby="product-edit-title">
        <div className="product-edit-modal__heading">
          <div><p className="eyebrow">PRODUCT MANAGEMENT</p><h2 id="product-edit-title">Edit card details.</h2></div>
          <button className="icon-button" type="button" aria-label="Close editor" disabled={busy} onClick={onClose}><X size={18} /></button>
        </div>
        <p className="admin-muted">Only fields present in this product row are editable. This uses the table’s returned column names and does not add schema assumptions.</p>
        <form className="product-edit-form" onSubmit={submit}>
          {fields.map(renderField)}
          {error && <p className="form-error form-field--wide" role="alert">{error}</p>}
          <div className="product-edit-modal__actions">
            <button className="button button--outline" type="button" disabled={busy} onClick={onClose}>Cancel</button>
            <button className="button button--gold" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'} <ArrowRight size={15} /></button>
          </div>
        </form>
      </section>
    </div>
  )
}

const ONE_PIECE_OP_EB_SETS = [
  { code: 'OP-01', name: 'Romance Dawn' },
  { code: 'OP-02', name: 'Paramount War' },
  { code: 'OP-03', name: 'Pillars of Strength' },
  { code: 'OP-04', name: 'Kingdoms of Intrigue' },
  { code: 'OP-05', name: 'Awakening of the New Era' },
  { code: 'OP-06', name: 'Wings of the Captain' },
  { code: 'OP-07', name: '500 Years in the Future' },
  { code: 'OP-08', name: 'Two Legends' },
  { code: 'OP-09', name: 'Emperors in the New World' },
  { code: 'OP-10', name: 'Royal Blood' },
  { code: 'OP-11', name: 'A Fist of Divine Speed' },
  { code: 'OP-12', name: 'Legacy of the Master' },
  { code: 'OP-13', name: 'Carrying On His Will' },
  { code: 'OP14-EB04', name: "The Azure Sea's Seven" },
  { code: 'OP15-EB04', name: "Adventure on Kami's Island" },
  { code: 'OP-16', name: 'The Time of Battle' },
  { code: 'OP-17', name: "The World's Strongest Warriors" },
  { code: 'OP-18', name: 'The Dominance of God' },
  { code: 'EB-01', name: 'Memorial Collection' },
  { code: 'EB-02', name: 'Anime 25th Collection' },
  { code: 'EB-03', name: 'One Piece Heroines Edition' },
  { code: 'EB-04', name: 'Egghead Crisis' },
  { code: 'EB-05', name: 'One Piece Heroines Edition vol.2' },
  { code: 'PRB-01', name: 'Premium Booster -The Best-' },
  { code: 'PRB-02', name: 'Premium Booster -The Best- Vol. 2' },
]
function CollectionsSection({ categories, sets, onRefresh }) {
  const [categoryName, setCategoryName] = useState('')
  const [setName, setSetName] = useState('')
  const [setCode, setSetCode] = useState('')
  const [setDescription, setSetDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importingSets, setImportingSets] = useState(false)

  const importOfficialSets = async () => {
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    setImportingSets(true)
    setError('')
    setNotice('')
    try {
      const existing = await supabase.from('sets').select('id,name,code')
      if (existing.error) throw new Error('Could not read existing card sets: ' + existing.error.message)
      const knownCodes = new Set((existing.data || []).map((item) => String(item.code || '').replace(/-/g, '').toUpperCase()).filter(Boolean))
      const knownNames = new Set((existing.data || []).map((item) => String(item.name || '').trim().toLowerCase()).filter(Boolean))
      const missing = ONE_PIECE_OP_EB_SETS.filter((item) =>
        !knownCodes.has(item.code.replace(/-/g, '').toUpperCase()) && !knownNames.has(item.name.toLowerCase())
      )
      if (!missing.length) {
        setNotice('All 25 OP, EB and PRB sets are already in Card Sets. Nothing needed adding.')
        return
      }
      const result = await supabase.from('sets').insert(missing.map((item) => ({
        id: globalThis.crypto.randomUUID(),
        name: item.name,
        code: item.code,
        description: 'One Piece Card Game ' + item.code + ' set',
        created_at: new Date().toISOString(),
      })))
      if (result.error) throw new Error('Could not add the card sets: ' + result.error.message)
      setNotice('Added ' + missing.length + ' missing OP, EB and PRB sets. ' + (ONE_PIECE_OP_EB_SETS.length - missing.length) + ' were already present.')
      onRefresh()
    } catch (importError) {
      setError(importError.message || 'Could not import the official OP, EB and PRB sets.')
    } finally {
      setImportingSets(false)
    }
  }

  const addCategory = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const duplicate = await supabase.from('categories').select('id').eq('name', categoryName.trim()).limit(1)
    if (duplicate.error) {
      setError(`Could not check the category name: ${duplicate.error.message}`)
      setBusy(false)
      return
    }
    if (duplicate.data?.length) {
      setError('A category with that name already exists.')
      setBusy(false)
      return
    }
    const result = await supabase.from('categories').insert({
      id: globalThis.crypto.randomUUID(),
      name: categoryName.trim(),
      created_at: new Date().toISOString(),
    })
    if (result.error) {
      setError(`Category was not saved: ${result.error.message}`)
    } else {
      setCategoryName('')
      setNotice('Category added.')
      onRefresh()
    }
    setBusy(false)
  }

  const addSet = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const duplicate = await supabase.from('sets').select('id').eq('name', setName.trim()).limit(1)
    if (duplicate.error) {
      setError(`Could not check the set name: ${duplicate.error.message}`)
      setBusy(false)
      return
    }
    if (duplicate.data?.length) {
      setError('A set with that name already exists.')
      setBusy(false)
      return
    }
    const result = await supabase.from('sets').insert({
      id: globalThis.crypto.randomUUID(),
      name: setName.trim(),
      code: setCode.trim() || null,
      description: setDescription.trim() || null,
      created_at: new Date().toISOString(),
    })
    if (result.error) {
      setError(`Set was not saved: ${result.error.message}`)
    } else {
      setSetName('')
      setSetCode('')
      setSetDescription('')
      setNotice('Set added.')
      onRefresh()
    }
    setBusy(false)
  }

  return (
    <section className="admin-view">
      <div className="admin-view-heading"><div><p className="eyebrow">COLLECTIONS AND SETS</p><h2>Organise the archive.</h2></div></div>
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={15} /><span>{notice}</span></div>}
      <div className="collection-columns">
        <div>
          <h3>Categories <span>{categories.length}</span></h3>
          {categories.length ? categories.map((item) => <p className="collection-row" key={item.id}><Layers size={15} />{item.name}</p>) : <p className="admin-muted">No categories are visible.</p>}
          <form className="collection-add-form" onSubmit={addCategory}>
            <label className="form-field"><span>New category</span><input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label>
            <button className="button button--outline" type="submit" disabled={busy}>Add category</button>
          </form>
        </div>
        <div>
          <div className="collection-heading-row"><h3>Card sets <span>{sets.length}</span></h3><button className="button button--outline" type="button" onClick={importOfficialSets} disabled={importingSets}>{importingSets ? 'Adding sets…' : 'Add all OP, EB & PRB sets'}</button></div>
          <p className="admin-muted">Imports the English OP-01 to OP-18, EB-01 to EB-05 and PRB-01 to PRB-02 set list. Existing sets are kept and duplicates are skipped.</p>
          {sets.length ? sets.map((item) => <p className="collection-row" key={item.id}><Box size={15} />{item.name}{item.code ? ` · ${item.code}` : ''}</p>) : <p className="admin-muted">No sets are visible yet.</p>}
          <form className="collection-add-form" onSubmit={addSet}>
            <label className="form-field"><span>Set name</span><input required value={setName} onChange={(event) => setSetName(event.target.value)} /></label>
            <label className="form-field"><span>Set code</span><input value={setCode} onChange={(event) => setSetCode(event.target.value)} /></label>
            <label className="form-field"><span>Set description</span><textarea rows="3" value={setDescription} onChange={(event) => setSetDescription(event.target.value)} /></label>
            <button className="button button--outline" type="submit" disabled={busy}>Add set</button>
          </form>
        </div>
      </div>
      <p className="admin-muted">These forms use the confirmed categories and sets columns; existing RLS policies remain responsible for administrator authorization.</p>
    </section>
  )
}

function OrdersSection({ orders, orderItems, products, loading, error, action, onReload, onUpdateStatus }) {
  const pendingCount = orders.filter((order) => ['pending', 'processing'].includes(String(order.status).toLowerCase())).length
  return (
    <section className="admin-view">
      <div className="admin-view-heading"><div><p className="eyebrow">ORDERS</p><h2>Dispatch control</h2></div><button className="button button--outline" type="button" onClick={onReload}>Refresh orders</button></div>
      <div className="overview-metrics overview-metrics--compact">
        <Metric icon={ClipboardList} label="All orders" value={orders.length} />
        <Metric icon={AlertCircle} label="Needs attention" value={pendingCount} />
        <Metric icon={Check} label="Completed / picked up" value={orders.filter((order) => ['completed', 'shipped'].includes(String(order.status).toLowerCase())).length} />
      </div>
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {loading ? <div className="loading-state"><span className="loader" />Loading order book…</div> : orders.length ? (
        <div className="admin-order-list">
          {orders.map((order) => {
            const items = orderItems.filter((item) => String(item.order_id) === String(order.id))
            return (
              <article className="admin-order" key={order.id}>
                <div className="admin-order__top"><div><span className="eyebrow">ORDER #{String(order.id).slice(-8).toUpperCase()}</span><strong>{formatMoney(order.total_amount ?? order.total ?? order.amount)}</strong></div><label className="select-field status-select"><span className="sr-only">Update order status</span><select value={order.status || 'pending'} disabled={action === order.id} onChange={(event) => onUpdateStatus(order.id, event.target.value)}><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Ready for pickup</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><ChevronDown size={15} /></label></div>
                <div className="admin-order__meta"><span>{order.created_at ? new Date(order.created_at).toLocaleString('en-GB') : 'Date not recorded'}</span><span>Customer: {order.user_id || order.customer_id || 'Not recorded'}</span><span>{items.length} line items</span></div>
                <div className="order-lines">{items.length ? items.map((item) => {
                  const product = products.find((entry) => String(entry.id) === String(item.product_id))
                  return <div className="order-line" key={item.id || `${item.order_id}-${item.product_id}`}><span>{product?.name || `Card ${item.product_id}`} <small>× {item.quantity}</small></span><strong>{formatMoney(Number(item.unit_price ?? item.price ?? 0) * Number(item.quantity || 0))}</strong></div>
                }) : <p className="order-lines__empty">No line items are available.</p>}</div>
              </article>
            )
          })}
        </div>
      ) : <EmptyAdminState icon={ClipboardList} heading="No orders to manage." text="New customer orders will appear here." />}
    </section>
  )
}

function CustomersSection({ customers }) {
  return (
    <section className="admin-view">
      <div className="admin-view-heading"><div><p className="eyebrow">CUSTOMERS</p><h2>Customer order activity.</h2></div></div>
      <div className="admin-security-note"><ShieldAlert size={16} /><span>Customer IDs below are derived from orders only. No profile email or personal data is queried here.</span></div>
      {customers.length ? <div className="customer-list">{customers.map((customer) => <article key={customer.id}><span className="customer-avatar"><Users size={16} /></span><div><strong>Customer {String(customer.id).slice(0, 8)}</strong><span>{customer.orders} order{customer.orders === 1 ? '' : 's'}</span></div></article>)}</div> : <EmptyAdminState icon={Users} heading="No customer activity yet." text="Customer summaries will appear after orders are created." />}
    </section>
  )
}

function CustomisationSection({ products, settings, settingsError, onSave }) {
  const [draft, setDraft] = useState(settings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState('homepage')
  const sections = [['trust','Trust strip'],['featured','Featured cards'],['browse','Shop callout'],['values','Archive values'],['shipping','Pickup information']]
  const update = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setError(''); setNotice('') }
  const toggleFeaturedProduct = (id) => {
    const current = draft.featured_product_ids || []
    update('featured_product_ids', current.includes(String(id)) ? current.filter((item) => item !== String(id)) : [...current, String(id)])
  }
  const toggleSection = (key) => {
    const current = draft.homepage_sections || []
    update('homepage_sections', current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await onSave(draft); setNotice('Your storefront changes have been saved and published.') }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  const resetAppearance = () => {
    setDraft((current) => ({ ...current, theme_preset:'original', site_background:'#11110f', site_text:'#e7e1d3', site_heading:'#e7e1d3', site_accent:'#c9a866', site_divider:'#c9a866', site_button_text:'#18150e', site_font_scale:'100', card_image_filter:'original', card_image_fit:'cover', storefront_background_image:'', homepage_background_image:'', homepage_background_position:'center center', announcement_enabled:true }))
    setNotice('Appearance controls reset to the original look. Save to publish this reset.')
  }
  const field = (label, key, type='text', placeholder='') => <label className="form-field" key={key}><span>{label}</span><input type={type} value={draft[key] ?? ''} placeholder={placeholder} onChange={(event) => update(key,event.target.value)} /></label>
  return (
    <section className="admin-view customisation-view">
      <div className="admin-view-heading"><div><p className="eyebrow">WEBSITE CUSTOMISATION</p><h2>Make the archive feel new.</h2><p className="admin-muted">Refresh the customer-facing storefront without changing inventory or admin controls.</p></div></div>
      {settingsError && <div className="error-notice"><ShieldAlert size={15}/><span>Website settings are not ready in Supabase: {settingsError}</span></div>}
      {error && <div className="error-notice"><ShieldAlert size={15}/><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={15}/><span>{notice}</span></div>}
      <form className="customisation-form" onSubmit={save}>
        <div className="customisation-console">
          <label className="form-field"><span>Choose a website area</span><select value={panel} onChange={(event)=>setPanel(event.target.value)}>
            <option value="homepage">Homepage Customisation</option><option value="archive">Archive / Shop Customisation</option><option value="colours">Colours & Typography</option><option value="images">Images & Visual Effects</option>
          </select></label>
          <p className="admin-muted">Choose a section to reveal its controls. Your admin panel is not affected.</p>
        </div>
        {panel === 'homepage' && <>
          <div className="customisation-group"><p className="eyebrow">HOMEPAGE CONTENT & ANNOUNCEMENTS</p>
            {field('Homepage heading','homepage_heading')}
            <label className="form-field"><span>Homepage description</span><textarea rows="4" value={draft.homepage_description || ''} onChange={(event)=>update('homepage_description',event.target.value)}/></label>
            {field('Homepage background image URL (optional)','homepage_background_image','url','https://…')}
            {field('Announcement headline','announcement_headline')}
            {field('Announcement message','announcement_text')}
            <label className="check-field"><input type="checkbox" checked={draft.announcement_enabled !== false} onChange={(event)=>update('announcement_enabled',event.target.checked)}/><span>Show announcement bar</span></label>
          </div>
          <div className="customisation-group"><p className="eyebrow">FEATURED CARDS & CARD OF THE WEEK</p>
            <label className="form-field"><span>Card of the Week</span><select value={draft.card_of_the_week_product_id || ''} onChange={(event)=>update('card_of_the_week_product_id',event.target.value)}><option value="">Use the first featured card</option>{products.map((p)=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
            <div className="customisation-product-list">{products.map((p)=><label className="check-field" key={p.id}><input type="checkbox" checked={(draft.featured_product_ids || []).includes(String(p.id))} onChange={()=>toggleFeaturedProduct(p.id)}/><span>{p.name}</span></label>)}</div>
          </div>
          <div className="customisation-group"><p className="eyebrow">SHOW OR HIDE HOMEPAGE SECTIONS</p><div className="customisation-section-list">{sections.map(([key,label])=><label className="check-field" key={key}><input type="checkbox" checked={(draft.homepage_sections || []).includes(key)} onChange={()=>toggleSection(key)}/><span>{label}</span></label>)}</div></div>
        </>}
        {panel === 'archive' && <div className="customisation-group"><p className="eyebrow">ARCHIVE PAGE CONTENT & CARD LAYOUT</p>
          {field('Archive heading','archive_heading')}
          <label className="form-field"><span>Archive introduction</span><textarea rows="3" value={draft.archive_description || ''} onChange={(event)=>update('archive_description',event.target.value)}/></label>
          <label className="form-field"><span>Card image fit</span><select value={draft.card_image_fit || 'cover'} onChange={(event)=>update('card_image_fit',event.target.value)}><option value="cover">Fill card area</option><option value="contain">Show full image</option></select></label>
          <label className="form-field"><span>Archive card image effect</span><select value={draft.card_image_filter || 'original'} onChange={(event)=>update('card_image_filter',event.target.value)}><option value="original">Original colour</option><option value="grayscale">Black & white</option><option value="sepia">Vintage sepia</option><option value="contrast">High contrast</option><option value="soft">Soft / muted</option></select></label>
          <p className="admin-muted">Effects change the display only; original uploaded card photographs remain untouched.</p>
        </div>}
        {panel === 'colours' && <div className="customisation-group"><p className="eyebrow">COLOURS & TYPOGRAPHY</p>
          <label className="form-field"><span>Theme preset</span><select value={draft.theme_preset || 'original'} onChange={(event)=>{const v=event.target.value; update('theme_preset',v); const themes={original:['#11110f','#e7e1d3','#e7e1d3','#c9a866','#c9a866','#18150e'],ocean:['#0d1b22','#e5f0ef','#f0f5ee','#55b9c2','#55b9c2','#071619'],parchment:['#e8dfc9','#28251e','#242018','#9a6b32','#9a6b32','#fff8e9']}; if(themes[v]) {const t=themes[v]; update('theme_preset',v); update('site_background',t[0]); update('site_text',t[1]); update('site_heading',t[2]); update('site_accent',t[3]); update('site_divider',t[4]); update('site_button_text',t[5]);}}}><option value="original">Original Grand Line</option><option value="ocean">Deep Ocean</option><option value="parchment">Antique Parchment</option><option value="custom">Custom colours</option></select></label>
          {field('Website background','site_background','color')}{field('Main text','site_text','color')}{field('Headings','site_heading','color')}{field('Highlights & buttons','site_accent','color')}{field('Divider lines & borders','site_divider','color')}{field('Button text','site_button_text','color')}
          <label className="form-field"><span>Overall font size: {draft.site_font_scale || '100'}%</span><input type="range" min="85" max="120" value={Number(draft.site_font_scale || 100)} onChange={(event)=>update('site_font_scale',event.target.value)}/></label>
        </div>}
        {panel === 'images' && <div className="customisation-group"><p className="eyebrow">IMAGES, BACKGROUNDS & EFFECTS</p>
          {field('Storefront background image URL (optional)','storefront_background_image','url','https://…')}
          <label className="form-field"><span>Background image position</span><select value={draft.homepage_background_position || 'center center'} onChange={(event)=>update('homepage_background_position',event.target.value)}><option value="center center">Centre</option><option value="center top">Top</option><option value="center bottom">Bottom</option><option value="left center">Left</option><option value="right center">Right</option></select></label>
          <label className="form-field"><span>Card of the Week image effect</span><select value={draft.card_image_filter || 'original'} onChange={(event)=>update('card_image_filter',event.target.value)}><option value="original">Original colour</option><option value="grayscale">Black & white</option><option value="sepia">Vintage sepia</option><option value="contrast">High contrast</option><option value="soft">Soft / muted</option></select></label>
          <p className="admin-muted">Use direct HTTPS image URLs. Background images never replace your stored card photos.</p>
        </div>}
        <div className="customisation-form__footer"><div><p>Saving publishes these settings to the customer-facing website only.</p><button className="button button--outline" type="button" onClick={resetAppearance}>Reset appearance to original</button></div><button className="button button--gold" type="submit" disabled={busy || Boolean(settingsError)}>{busy?'Publishing…':'Save website settings'} <ArrowRight size={15}/></button></div>
      </form>
    </section>
  )
}
function SettingsSection({ user }) {
  return (
    <section className="admin-view">
      <div className="admin-view-heading"><div><p className="eyebrow">SETTINGS</p><h2>Storage and access.</h2></div></div>
      <div className="settings-card"><span className="settings-card__icon"><Camera size={18} /></span><div><strong>Card image storage</strong><p>Expected bucket: <code>product-card-images</code></p><span>Read-only discovery found no bucket visible to the publishable key. Upload stays disabled until an authorised bucket and policies are configured.</span></div></div>
      <div className="settings-card"><span className="settings-card__icon"><ShieldAlert size={18} /></span><div><strong>Row Level Security</strong><p>Admin role verified for this session.</p><span>Storage and inventory writes must still be enforced by database and Storage RLS policies; client-side checks are not a security boundary.</span></div></div>
      <div className="settings-card"><span className="settings-card__icon"><Users size={18} /></span><div><strong>Signed-in administrator</strong><p>{user.email || user.id}</p><span>No service-role key is used in this browser app.</span></div></div>
    </section>
  )
}

function EmptyAdminState({ icon: Icon, heading, text }) {
  return <div className="empty-admin-state"><Icon size={24} /><h3>{heading}</h3><p>{text}</p></div>
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value) || 0)
}
