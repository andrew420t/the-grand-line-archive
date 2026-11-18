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
  Image,
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
  { id: 'scan-card', label: 'Scan Card', icon: ScanLine },
  { id: 'photography', label: 'Stock Photography', icon: Camera },
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
  const visibleProducts = products.filter((product) =>
    [product.name, product.setName, product.category, product.rarity, product.raw?.card_number]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query.toLowerCase())),
  )

  const valueFor = (product, field) =>
    changes[product.id]?.[field] ?? String(product.raw?.[field] ?? '')

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
                <div className="inventory-item__details"><p className="eyebrow">{product.setName || product.category || 'CARD'}</p><h3>{product.name}</h3><span>{raw.card_number || 'Card number not recorded'} · {product.rarity || 'Rarity not recorded'}</span></div>
                <label className="form-field inventory-input"><span>GBP price</span><input type="number" min="0" step="0.01" value={valueFor(product, 'price') || raw.price || ''} onChange={(event) => setChanges((current) => ({ ...current, [product.id]: { ...current[product.id], price: event.target.value } }))} /></label>
                <label className="form-field inventory-input"><span>Quantity</span><input type="number" min="0" step="1" value={valueFor(product, 'stock') || raw.stock_quantity || 0} onChange={(event) => setChanges((current) => ({ ...current, [product.id]: { ...current[product.id], stock: event.target.value } }))} /></label>
                <button className="button button--outline inventory-save" type="button" disabled={busyId === String(product.id)} onClick={() => saveInventory(product)}>{busyId === String(product.id) ? 'Saving…' : 'Update stock'}</button>
                <div className="inventory-item__actions">
                  <button className="button button--outline" type="button" onClick={() => setEditingProduct(product)}><Pencil size={14} /> Edit card</button>
                  <button className="button button--danger" type="button" disabled={busyId === String(product.id)} onClick={() => deleteProduct(product)}><Trash2 size={14} /> Delete</button>
                </div>
              </article>
            )
          })}
        </div>
      ) : <EmptyAdminState icon={Package} heading="No products found." text={query ? 'Try another search.' : 'The products table currently has no visible rows. Add a card to start the inventory.'} />}
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
    const payload = {}
    fields.forEach((field) => {
      const value = values[field.key]
      if (field.numeric) payload[field.column] = value === '' ? null : Number(value)
      else if (field.checkbox) payload[field.column] = Boolean(value)
      else if (field.select && value === '') payload[field.column] = null
      else payload[field.column] = value
    })
    if ('updated_at' in raw) payload.updated_at = new Date().toISOString()
    if (fields.some((field) => field.key === 'name') && !String(values.name || '').trim()) {
      setError('Card name is required.')
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
            {['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'].map((condition) => <option key={condition}>{condition}</option>)}
          </select>
        </label>
      )
    }
    return (
      <label className={`form-field ${field.multiline ? 'form-field--wide' : ''}`} key={field.key}>
        <span>{field.label}</span>
        {field.multiline ? (
          <textarea rows="4" value={value ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
        ) : (
          <input required={field.required} type={field.numeric ? 'number' : 'text'} min={field.numeric ? '0' : undefined} step={field.key === 'price' ? '0.01' : field.numeric ? '1' : undefined} value={value ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />
        )}
      </label>
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

function CollectionsSection({ categories, sets, onRefresh }) {
  const [categoryName, setCategoryName] = useState('')
  const [setName, setSetName] = useState('')
  const [setCode, setSetCode] = useState('')
  const [setDescription, setSetDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
          <h3>Card sets <span>{sets.length}</span></h3>
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
        <Metric icon={Check} label="Completed / shipped" value={orders.filter((order) => ['completed', 'shipped'].includes(String(order.status).toLowerCase())).length} />
      </div>
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {loading ? <div className="loading-state"><span className="loader" />Loading order book…</div> : orders.length ? (
        <div className="admin-order-list">
          {orders.map((order) => {
            const items = orderItems.filter((item) => String(item.order_id) === String(order.id))
            return (
              <article className="admin-order" key={order.id}>
                <div className="admin-order__top"><div><span className="eyebrow">ORDER #{String(order.id).slice(-8).toUpperCase()}</span><strong>{formatMoney(order.total_amount ?? order.total ?? order.amount)}</strong></div><label className="select-field status-select"><span className="sr-only">Update order status</span><select value={order.status || 'pending'} disabled={action === order.id} onChange={(event) => onUpdateStatus(order.id, event.target.value)}><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><ChevronDown size={15} /></label></div>
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
  const sections = [
    ['trust', 'Trust strip'],
    ['featured', 'Featured cards'],
    ['browse', 'Shop callout'],
    ['values', 'Archive values'],
    ['shipping', 'Shipping information'],
  ]

  const update = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setError('')
    setNotice('')
  }

  const toggleFeaturedProduct = (productId) => {
    const id = String(productId)
    const current = draft.featured_product_ids || []
    update(
      'featured_product_ids',
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const toggleSection = (section) => {
    const current = draft.homepage_sections || []
    update(
      'homepage_sections',
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    )
  }

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await onSave(draft)
      setNotice('Website customisation saved and published.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-view customisation-view">
      <div className="admin-view-heading"><div><p className="eyebrow">WEBSITE CUSTOMISATION</p><h2>Keep the storefront on course.</h2></div></div>
      {settingsError && <div className="error-notice"><ShieldAlert size={15} /><span>Website settings are not ready in Supabase: {settingsError}. Review and approve the proposed site_settings migration before saving.</span></div>}
      {error && <div className="error-notice"><ShieldAlert size={15} /><span>{error}</span></div>}
      {notice && <div className="success-notice"><Check size={15} /><span>{notice}</span></div>}
      <form className="customisation-form" onSubmit={save}>
        <div className="customisation-group">
          <p className="eyebrow">HOMEPAGE</p>
          <label className="form-field"><span>Homepage heading</span><input value={draft.homepage_heading || ''} onChange={(event) => update('homepage_heading', event.target.value)} required /></label>
          <label className="form-field"><span>Homepage description</span><textarea rows="4" value={draft.homepage_description || ''} onChange={(event) => update('homepage_description', event.target.value)} /></label>
        </div>
        <div className="customisation-group">
          <p className="eyebrow">ANNOUNCEMENT BANNER</p>
          <label className="form-field"><span>Banner heading</span><input value={draft.announcement_headline || ''} onChange={(event) => update('announcement_headline', event.target.value)} /></label>
          <label className="form-field"><span>Banner message</span><input value={draft.announcement_text || ''} onChange={(event) => update('announcement_text', event.target.value)} /></label>
        </div>
        <div className="customisation-group">
          <p className="eyebrow">FEATURED CARDS</p>
          <label className="form-field"><span>Card of the Week</span><select value={draft.card_of_the_week_product_id || ''} onChange={(event) => update('card_of_the_week_product_id', event.target.value)}><option value="">Use the first featured card</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.id}</option>)}</select></label>
          {products.length ? (
            <div className="customisation-product-list">
              {products.map((product) => (
                <label className="check-field" key={product.id}>
                  <input type="checkbox" checked={(draft.featured_product_ids || []).includes(String(product.id))} onChange={() => toggleFeaturedProduct(product.id)} />
                  <span>{product.name}</span>
                </label>
              ))}
            </div>
          ) : <p className="admin-muted">Add products before selecting homepage features.</p>}
        </div>
        <div className="customisation-group">
          <p className="eyebrow">HOMEPAGE SECTIONS</p>
          <div className="customisation-section-list">
            {sections.map(([key, label]) => (
              <label className="check-field" key={key}>
                <input type="checkbox" checked={(draft.homepage_sections || []).includes(key)} onChange={() => toggleSection(key)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="customisation-group">
          <p className="eyebrow">STORE INFORMATION</p>
          <label className="form-field"><span>Shipping information</span><textarea rows="3" value={draft.shipping_information || ''} onChange={(event) => update('shipping_information', event.target.value)} /></label>
          <label className="form-field"><span>Contact information</span><input value={draft.contact_information || ''} onChange={(event) => update('contact_information', event.target.value)} placeholder="Email address or contact details" /></label>
        </div>
        <div className="customisation-form__footer">
          <p>Saving publishes these settings to the public homepage. Supabase RLS must allow public reads and restrict changes to administrators.</p>
          <button className="button button--gold" type="submit" disabled={busy || Boolean(settingsError)}>{busy ? 'Publishing…' : 'Save website settings'} <ArrowRight size={15} /></button>
        </div>
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
