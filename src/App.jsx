import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  Box,
  Check,
  ChevronDown,
  CircleUserRound,
  Grid2X2,
  List,
  SlidersHorizontal,
  ClipboardList,
  LockKeyhole,
  Mail,
  Menu,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  MapPin,
  X,
} from 'lucide-react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import AdminDashboard from './admin/AdminDashboard'
import AdminAccess from './admin/AdminAccess'
import { findPrimaryCatalogueMatch } from './admin/cardCatalogue'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from './siteSettings'
import { buildCheckoutSnapshot } from './orderCheckout'
import { getPublicStorefrontProducts } from './publicProducts'
import { isValidOrderStatus } from './orderStatus'
import './App.css'

const CART_KEY = 'grand-line-archive-cart'
const currentYear = new Date().getFullYear()
const supabaseSetupMessage =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart Vite.'
const money = (value) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    Number(value) || 0,
  )

const firstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== '')

const getName = (row) =>
  firstValue(row?.name, row?.title, row?.label, row?.category_name, row?.set_name)

const readCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function ProductImage({ product, className = '' }) {
  const [failed, setFailed] = useState(false)
  const [referenceImage, setReferenceImage] = useState('')
  const [referenceFailed, setReferenceFailed] = useState(false)

  useEffect(() => {
    let active = true
    if (!product.raw?.card_number) {
      setReferenceImage('')
      return () => { active = false }
    }
    findPrimaryCatalogueMatch(product.raw.card_number, product.raw.language)
      .then((match) => { if (active) setReferenceImage(match?.imageUrl || '') })
      .catch(() => { if (active) setReferenceImage('') })
    return () => { active = false }
  }, [product.image, product.raw?.card_number, product.raw?.language])

  const displayImage = product.image && !failed ? product.image
    : referenceImage && !referenceFailed ? referenceImage : ''
  if (!displayImage) {
    return (
      <div className={`product-image product-image--empty ${className}`}>
        <Anchor size={27} strokeWidth={1.2} />
        <span>Archive photograph</span>
      </div>
    )
  }

  return (
    <img
      className={`product-image ${className}`}
      src={displayImage}
      alt={product.name + (displayImage === referenceImage ? ' · catalogue reference image' : '')}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (displayImage === product.image) setFailed(true)
        else setReferenceFailed(true)
      }}
    />
  )
}

function ProductCard({ product, onAdd, viewMode = 'grid' }) {
  return (
    <article className={`product-card ${viewMode === 'list' ? 'product-card--list' : ''}`}>
      <div className="product-card__photo">
        <Link className="product-card__image-link" to={`/product/${encodeURIComponent(product.id)}`} aria-label={`View ${product.name} details`}>
          <ProductImage product={product} />
          <span className="product-card__rarity">{product.rarity || 'Trading card'}</span>
          {product.raw?.language && <span className="product-card__language">{String(product.raw.language).toLowerCase().startsWith('jp') ? 'JP' : String(product.raw.language).slice(0, 2).toUpperCase()}</span>}
        </Link>
        <button
          className="quick-add"
          type="button"
          onClick={() => onAdd(product)}
          disabled={product.stock < 1}
          aria-label={`Add ${product.name} to basket`}
        >
          <Plus size={18} />
        </button>
      </div>
      <Link className="product-card__body product-card__body-link" to={`/product/${encodeURIComponent(product.id)}`}>
        <p className="eyebrow product-card__set">{product.setCode ? `${product.setCode} · ` : ''}{product.setName || product.category}</p>
        <h3>{product.name}</h3>
        {product.raw?.card_number && <span className="product-card__number">{product.raw.card_number}</span>}
        <div className="product-card__tags">{product.raw?.condition && <span>{product.raw.condition}</span>}{product.raw?.variant_label && <span>{product.raw.variant_label}</span>}</div>
        <div className="product-card__meta">
          <strong>{money(product.price)}</strong>
          <span className={product.stock > 0 ? 'stock' : 'stock stock--empty'}>
            {product.stock > 0
              ? `${product.stock} ${product.stock === 1 ? 'copy' : 'copies'}`
              : 'Sold out'}
          </span>
        </div>
        <span className="product-card__view">View card details <ArrowRight size={12} /></span>
      </Link>
    </article>
  )
}

function ProductDetailPage({ products, onAdd }) {
  const { productId } = useParams()
  const product = products.find((item) => String(item.id) === String(productId))
  if (!product) {
    return (
      <main className="product-detail page-width">
        <Link className="text-link" to="/shop">← Back to the archive</Link>
        <div className="empty-catalogue"><h2>Card not found.</h2><p>This card may no longer be listed in the shop.</p><Link className="button button--gold" to="/shop">Browse cards</Link></div>
      </main>
    )
  }

  const raw = product.raw || {}
  const details = [
    ['Card number', raw.card_number],
    ['Set', product.setName || raw.set_code || product.setCode],
    ['Set code', raw.set_code || product.setCode],
    ['Category', product.category],
    ['Rarity', product.rarity],
    ['Variant', raw.variant_label],
    ['Colour', raw.color],
    ['Power', raw.power],
    ['Cost', raw.cost],
    ['Type', raw.card_type || raw.classification],
    ['Language', raw.language],
    ['Condition', raw.condition],
    ['Availability', product.stock > 0 ? 'In stock' : 'Sold out'],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')

  return (
    <main className="product-detail page-width">
      <Link className="product-detail__back" to="/shop">← Back to all cards</Link>
      <div className="product-detail__layout">
        <div className="product-detail__image-wrap">
          <ProductImage product={product} className="product-detail__image" />
        </div>
        <section className="product-detail__info">
          <p className="eyebrow">{product.setName || product.category || 'ONE PIECE CARD'}</p>
          <h1>{product.name}</h1>
          {raw.card_number && <p className="product-detail__number">{raw.card_number}</p>}
          <div className="product-detail__purchase">
            <strong>{money(product.price)}</strong>
            <span className={product.stock > 0 ? 'stock' : 'stock stock--empty'}>
              {product.stock > 0 ? `${product.stock} available` : 'Sold out'}
            </span>
            <button className="button button--gold" type="button" disabled={product.stock < 1} onClick={() => onAdd(product)}>
              <Plus size={16} /> Add to basket
            </button>
          </div>
          {raw.description && <div className="product-detail__description"><h2>About this card</h2><p>{raw.description}</p></div>}
          {details.length > 0 && (
            <div className="product-detail__specs">
              <h2>Card information</h2>
              <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>
            </div>
          )}
          {raw.effect_text && <div className="product-detail__description"><h2>Card effect</h2><p>{raw.effect_text}</p></div>}
        </section>
      </div>
    </main>
  )
}

function Storefront() {
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [sets, setSets] = useState([])
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS)
  const [siteSettingsError, setSiteSettingsError] = useState('')
  const [categoryNames, setCategoryNames] = useState([])
  const [setCount, setSetCount] = useState(0)
  const [catalogLoading, setCatalogLoading] = useState(hasSupabaseConfig)
  const [catalogError, setCatalogError] = useState(
    hasSupabaseConfig ? '' : supabaseSetupMessage,
  )
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [cart, setCart] = useState(readCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [rarityFilter, setRarityFilter] = useState('All rarities')
  const [setFilter, setSetFilter] = useState('All sets')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [languageFilter, setLanguageFilter] = useState('All languages')
  const [conditionFilter, setConditionFilter] = useState('All conditions')
  const [variantFilter, setVariantFilter] = useState('All variants')
  const [availabilityFilter, setAvailabilityFilter] = useState('In stock')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid')
  const [pageSize, setPageSize] = useState('24')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [orderAction, setOrderAction] = useState('')
  const checkoutLock = useRef(false)
  const orderStatusLocks = useRef(new Set())
  const [adminAccessGranted, setAdminAccessGranted] = useState(false)

  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin'

  const loadCatalog = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) return
    setCatalogLoading(true)
    setCatalogError('')
    const [productsResult, categoriesResult, setsResult] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('sets').select('*'),
    ])

    const failedResult = [productsResult, categoriesResult, setsResult].find(
      (result) => result.error,
    )
    if (failedResult) {
      setCatalogError(failedResult.error.message)
      setProducts([])
      setCatalogLoading(false)
      return
    }

    const categoryRows = categoriesResult.data || []
    const setRows = setsResult.data || []
    const categoriesById = new Map(
      categoryRows.map((item) => [String(item.id), getName(item)]),
    )
    const setsById = new Map(
      setRows.map((item) => [String(item.id), { name: item.name, code: item.code || '' }]),
    )
    const normalized = (productsResult.data || []).map((row) => {
      const set = setsById.get(String(row.set_id))
      return {
        id: row.id,
        name: row.name || 'Untitled card',
        price: Number(row.price || 0),
        stock: Math.max(0, Number(row.stock_quantity || 0)),
        image: row.image_url || '',
        description: row.description || '',
        category: categoriesById.get(String(row.category_id)) || 'Uncategorised',
        setName: set?.name || '',
        setCode: set?.code || '',
        rarity: row.rarity || '',
        raw: row,
      }
    })
    setProducts(normalized)
    setCategories(categoryRows)
    setSets(setRows)
    setCategoryNames(
      [...new Set(categoryRows.map(getName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    )
    setSetCount(setRows.length)
    setCatalogLoading(false)
  }, [])

  const loadSiteSettings = useCallback(async () => {
    if (!supabase) return
    const result = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 'homepage')
      .maybeSingle()
    if (result.error) {
      setSiteSettingsError(result.error.message)
      return
    }
    setSiteSettings(normalizeSiteSettings(result.data?.settings))
    setSiteSettingsError('')
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return undefined

    void Promise.resolve().then(loadCatalog)
    const channel = supabase
      .channel('archive-product-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadCatalog)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadCatalog])

  useEffect(() => {
    void Promise.resolve().then(loadSiteSettings)
  }, [loadSiteSettings])

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthMessage(error.message)
      setUser(data.session?.user || null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setProfile(null)
      setProfileError('')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      return
    }

    let active = true
    const loadProfile = async () => {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (!active) return
      if (result.error) {
        setProfileError(result.error.message)
        setProfile(null)
      } else {
        setProfile(result.data)
        setProfileError('')
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [user])

  const storefrontProducts = useMemo(
    () => getPublicStorefrontProducts(products),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return storefrontProducts.filter((product) => {
      const matchesSearch =
        !needle ||
        [product.name, product.category, product.setName, product.setCode, product.rarity, product.raw?.card_number, product.raw?.variant_label]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      const matchesSet = setFilter === 'All sets' || `${product.setCode} — ${product.setName}` === setFilter
      const matchesCategory =
        categoryFilter === 'All categories' || product.category === categoryFilter
      const matchesRarity =
        rarityFilter === 'All rarities' || product.rarity === rarityFilter
      const language = String(product.raw?.language || '').toLowerCase()
      const condition = String(product.raw?.condition || '').trim()
      const variant = String(product.raw?.variant_label || '').trim()
      const matchesLanguage = languageFilter === 'All languages' || (languageFilter === 'Japanese' ? language.startsWith('jp') || language.includes('japanese') : language.startsWith('en') || language.includes('english'))
      const matchesCondition = conditionFilter === 'All conditions' || condition === conditionFilter
      const matchesVariant = variantFilter === 'All variants' || variant === variantFilter
      const matchesAvailability = availabilityFilter === 'All stock' || (availabilityFilter === 'In stock' ? product.stock > 0 : product.stock < 1)
      const matchesMin = minPrice === '' || product.price >= Number(minPrice)
      const matchesMax = maxPrice === '' || product.price <= Number(maxPrice)
      return matchesSearch && matchesSet && matchesCategory && matchesRarity && matchesLanguage && matchesCondition && matchesVariant && matchesAvailability && matchesMin && matchesMax
    })
  }, [storefrontProducts, search, setFilter, categoryFilter, rarityFilter, languageFilter, conditionFilter, variantFilter, availabilityFilter, minPrice, maxPrice])

  const sortedProducts = useMemo(() => [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price
    if (sortBy === 'price-high') return b.price - a.price
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'card-number') return String(a.raw?.card_number || '').localeCompare(String(b.raw?.card_number || ''), undefined, { numeric: true })
    return new Date(b.raw?.created_at || 0) - new Date(a.raw?.created_at || 0)
  }), [filteredProducts, sortBy])
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / Number(pageSize)))
  const visibleProducts = sortedProducts.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize))

  useEffect(() => { setCurrentPage(1) }, [search, setFilter, categoryFilter, rarityFilter, languageFilter, conditionFilter, variantFilter, availabilityFilter, minPrice, maxPrice, sortBy, pageSize])

  const setOptions = useMemo(
    () => [...new Set(storefrontProducts.map((product) => `${product.setCode} — ${product.setName}`.trim()).filter((value) => value !== '—'))].sort((a, b) => a.localeCompare(b)),
    [storefrontProducts],
  )
  const rarities = useMemo(
    () => [...new Set(storefrontProducts.map((product) => product.rarity).filter(Boolean))].sort(),
    [storefrontProducts],
  )
  const conditions = useMemo(() => [...new Set(storefrontProducts.map((product) => String(product.raw?.condition || '').trim()).filter(Boolean))].sort(), [storefrontProducts])
  const variants = useMemo(() => [...new Set(storefrontProducts.map((product) => String(product.raw?.variant_label || '').trim()).filter(Boolean))].sort(), [storefrontProducts])
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  )
  const configuredFeatured = siteSettings.featured_product_ids
    .map((id) => storefrontProducts.find((product) => String(product.id) === id))
    .filter(Boolean)
  const markedFeatured = storefrontProducts.filter((product) => product.raw?.featured === true)
  const featuredProducts = (
    configuredFeatured.length ? configuredFeatured : markedFeatured.length ? markedFeatured : storefrontProducts
  ).slice(0, 4)
  const cardOfTheWeek =
    storefrontProducts.find(
      (product) => String(product.id) === siteSettings.card_of_the_week_product_id,
    ) ||
    storefrontProducts.find((product) => product.raw?.featured === true) ||
    storefrontProducts[0]
  const homepageSections = new Set(siteSettings.homepage_sections)

  const notify = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  const addToCart = (product) => {
    if (product.stock < 1) return
    setCart((current) => {
      const existing = current.find((item) => String(item.product.id) === String(product.id))
      if (!existing) return [...current, { product, quantity: 1 }]
      return current.map((item) =>
        String(item.product.id) === String(product.id)
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
          : item,
      )
    })
    setCartOpen(true)
  }

  const changeCartQuantity = (productId, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          String(item.product.id) === String(productId)
            ? {
                ...item,
                quantity: Math.min(
                  Math.max(0, item.quantity + delta),
                  item.product.stock,
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const loadOrders = useCallback(async (adminView = false) => {
    if (!supabase || !user) return
    setOrdersLoading(true)
    setOrdersError('')
    try {
    let result
    if (adminView) {
      result = await supabase.from('orders').select('*')
    } else {
      const [userOrders, customerOrders] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id),
        supabase.from('orders').select('*').eq('customer_id', user.id),
      ])
      const successfulResults = [userOrders, customerOrders].filter(
        (queryResult) => !queryResult.error,
      )
      result = successfulResults.length
        ? {
            data: [
              ...new Map(
                successfulResults
                  .flatMap((queryResult) => queryResult.data || [])
                  .map((order) => [String(order.id), order]),
              ).values(),
            ],
            error: null,
          }
        : userOrders
    }
    if (result.error) {
      setOrdersError(result.error.message)
      setOrders([])
      setOrderItems([])
      return
    }

    const orderRows = (result.data || []).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    )
    setOrders(orderRows)
    if (orderRows.length) {
      const ids = orderRows.map((order) => order.id)
      const itemsResult = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', ids)
      if (itemsResult.error) {
        setOrdersError(itemsResult.error.message)
        setOrderItems([])
      } else {
        setOrderItems(itemsResult.data || [])
      }
    } else {
      setOrderItems([])
    }
    setOrdersLoading(false)
  }, [user])

  useEffect(() => {
    if (location.pathname === '/account/orders' && user) {
      void Promise.resolve().then(() => loadOrders(false))
    }
    if (location.pathname === '/admin' && user && isAdmin) {
      void Promise.resolve().then(() => loadOrders(true))
    }
  }, [location.pathname, user, isAdmin, loadOrders])

  const placeOrder = async () => {
    if (checkoutLock.current) return
    if (!user) {
      setAuthOpen(true)
      setAuthMessage('Sign in to place your order.')
      return
    }
    if (!cart.length || !supabase) return
    checkoutLock.current = true
    setOrderAction('placing')
    setOrdersError('')
    let createdOrderId = null
    let itemsSaved = false
    try {

    const latestProductsResult = await supabase
      .from('products')
      .select('id,name,price,stock_quantity,status')
      .in('id', cart.map((item) => item.product.id))
    if (latestProductsResult.error) {
      setOrdersError(`Could not verify current stock and prices: ${latestProductsResult.error.message}`)
      setOrderAction('')
      return
    }
    const checkout = buildCheckoutSnapshot(cart, latestProductsResult.data || [])
    if (!checkout.ok) {
      setCart(checkout.items)
      const priceChanged = checkout.issues.some((issue) => issue.reason === 'price-changed')
      const issueText = checkout.issues.map((issue) => {
        if (issue.reason === 'unavailable') return `${issue.name} is no longer available`
        if (issue.reason === 'insufficient-stock') return `${issue.name} only has ${issue.stock} in stock`
        if (issue.reason === 'price-changed') return `${issue.name} price has changed`
        return `${issue.name} has an invalid price`
      }).join('; ')
      setOrdersError(`Please review your basket before continuing. ${issueText}${priceChanged ? ' Updated prices have been applied to your basket.' : ''}`)
      setOrderAction('')
      return
    }

    const orderResult = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        total_amount: checkout.total,
      })
      .select('*')
      .single()

    if (orderResult.error) {
      setOrdersError(`Could not create the order: ${orderResult.error.message}`)
      setOrderAction('')
      return
    }

    createdOrderId = orderResult.data.id
    const rows = checkout.items.map((item) => ({
      order_id: orderResult.data.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
    }))
    const itemsResult = await supabase.from('order_items').insert(rows)
    if (itemsResult.error) {
      const cleanupResult = await supabase.from('orders').delete().eq('id', orderResult.data.id)
      const cleanupMessage = cleanupResult.error
        ? ` The pending order could not be removed: ${cleanupResult.error.message}`
        : ' The empty pending order was removed.'
      setOrdersError(
        `Order items could not be saved: ${itemsResult.error.message}.${cleanupMessage}`,
      )
      setOrderAction('')
      return
    }

    setCart([])
    setCartOpen(false)
    setOrderAction('')
    notify('Your order has been placed.')
    navigate('/account/orders')
    } catch (error) {
      let cleanupMessage = ''
      if (createdOrderId && !itemsSaved) {
        try {
          const cleanup = await supabase.from('orders').delete().eq('id', createdOrderId)
          if (cleanup.error) cleanupMessage = ` The pending order could not be removed: ${cleanup.error.message}`
        } catch (cleanupError) {
          cleanupMessage = ` The pending order cleanup failed: ${cleanupError?.message || 'unknown error'}`
        }
      }
      setOrdersError(`Checkout failed unexpectedly: ${error?.message || 'Please try again.'}${cleanupMessage}`)
    } finally {
      checkoutLock.current = false
      setOrderAction('')
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    if (!supabase || !isAdmin) return
    if (!isValidOrderStatus(status)) {
      setOrdersError('Invalid order status. Choose a valid status from the order controls.')
      return
    }
    const lockKey = String(orderId)
    if (orderStatusLocks.current.has(lockKey)) return
    orderStatusLocks.current.add(lockKey)
    setOrderAction(orderId)
    try {
      const result = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
      if (result.error) {
        setOrdersError(`Could not update order status: ${result.error.message}`)
      } else {
        await loadOrders(true)
        notify('Order status updated.')
      }
    } catch (error) {
      setOrdersError(`Order status update failed unexpectedly: ${error?.message || 'Please try again.'}`)
    } finally {
      orderStatusLocks.current.delete(lockKey)
      setOrderAction('')
    }
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setAuthMessage(error.message)
    else {
      setAuthOpen(false)
      setProfile(null)
      setAdminAccessGranted(false)
      notify('Signed out.')
    }
  }

  const saveSiteSettings = async (settings) => {
    if (!supabase || !user) throw new Error('Sign in before saving website customisation.')
    const result = await supabase
      .from('site_settings')
      .upsert(
        {
          id: 'homepage',
          settings,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: 'id' },
      )
      .select('settings')
      .single()
    if (result.error) {
      throw new Error(`Website customisation was not saved: ${result.error.message}`)
    }
    const savedSettings = normalizeSiteSettings(result.data.settings)
    setSiteSettings(savedSettings)
    setSiteSettingsError('')
    return savedSettings
  }

  const openAccount = () => {
    setMobileMenuOpen(false)
    if (user) navigate('/account/orders')
    else setAuthOpen(true)
  }

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('All categories')
    setSetFilter('All sets')
    setRarityFilter('All rarities')
    setMinPrice('')
    setMaxPrice('')
    setLanguageFilter('All languages')
    setConditionFilter('All conditions')
    setVariantFilter('All variants')
    setAvailabilityFilter('In stock')
    setSortBy('newest')
    setCurrentPage(1)
  }

  const imageFilter = { original:'none', grayscale:'grayscale(1)', sepia:'sepia(.78)', contrast:'contrast(1.3) saturate(.85)', soft:'saturate(.68) brightness(1.08)' }[siteSettings.card_image_filter] || 'none'
  const storefrontPage = !['/admin', '/admin/access'].includes(location.pathname)
  const storefrontStyle = storefrontPage ? {
    '--ink': siteSettings.site_background || '#11110f',
    '--cream': siteSettings.site_text || '#e7e1d3',
    '--gold': siteSettings.site_accent || '#c9a866',
    '--gold-light': siteSettings.site_accent || '#d7bd7f',
    '--line': siteSettings.site_divider || '#c9a866',
    '--site-heading': siteSettings.site_heading || '#e7e1d3',
    '--site-font-scale': String(Number(siteSettings.site_font_scale || 100) / 100),
    '--card-image-filter': imageFilter,
    '--card-image-fit': siteSettings.card_image_fit || 'cover',
  } : undefined
  const bg = location.pathname === '/' ? siteSettings.homepage_background_image : siteSettings.storefront_background_image
  const safeBg = typeof bg === 'string' && /^https:\/\//i.test(bg) ? bg : ''
  return (
    <div className="site-shell" style={storefrontPage ? { ...storefrontStyle, backgroundImage: safeBg ? 'linear-gradient(rgba(17,17,15,.88), rgba(17,17,15,.92)), url("' + safeBg + '")' : undefined, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : undefined}>
      {siteSettings.announcement_enabled !== false && <div className="announcement">
        <span>{siteSettings.announcement_headline}</span>
        <i />
        <span>{siteSettings.announcement_text}</span>
        <MapPin size={14} />
      </div>}

      <header className="site-header">
        <Link className="brand" to="/" aria-label="Grand Line Archive home">
          <span className="brand__mark"><Anchor size={22} strokeWidth={1.45} /></span>
          <span className="brand__name">
            <strong>GRAND LINE</strong>
            <small>ARCHIVE · TCG</small>
          </span>
        </Link>

        <button
          className="mobile-menu-button icon-button"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={mobileMenuOpen ? 'main-nav main-nav--open' : 'main-nav'}>
          <Link
            className={location.pathname === '/' ? 'nav-link nav-link--active' : 'nav-link'}
            to="/"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            className={location.pathname === '/shop' ? 'nav-link nav-link--active' : 'nav-link'}
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
          >
            The archive
          </Link>
          {isAdmin && (
            <Link
              className={location.pathname === '/admin' ? 'nav-link nav-link--active' : 'nav-link'}
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="header-actions">
          <Link className="captains-button" to="/admin/access" aria-label="Captain's Quarters administrator access">
            <Anchor size={15} strokeWidth={1.7} />
            <span>CAPTAIN'S QUARTERS</span>
          </Link>
          <button
            className="icon-button account-button"
            type="button"
            aria-label={user ? 'View orders' : 'Sign in'}
            onClick={openAccount}
          >
            <CircleUserRound size={19} />
            <span>{user ? 'Account' : 'Sign in'}</span>
          </button>
          <button
            className="basket-button"
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open basket, ${cartCount} items`}
          >
            <ShoppingBag size={18} />
            <span className="basket-label">Basket</span>
            <span className="basket-count">{cartCount}</span>
          </button>
        </div>
      </header>

      {catalogError && (
        <div className="connection-banner" role="status">
          <span><ShieldCheck size={16} /> Catalogue connection issue: {catalogError}</span>
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <Routes>
        <Route
          path="/admin/access"
          element={
            <AdminAccess
              user={user}
              isAdmin={isAdmin}
              profile={profile}
              onAuthenticated={(authenticatedUser, authenticatedProfile) => {
                setUser(authenticatedUser)
                setProfile(authenticatedProfile)
                setProfileError('')
                setAdminAccessGranted(true)
                navigate('/admin', { replace: true })
              }}
            />
          }
        />
        <Route
          path="/"
          element={
            <main>
              <section className="hero-section page-width">
                <div className="hero-copy">
                  <p className="eyebrow hero-kicker"><span /> ONE PIECE TCG · COLLECTOR INVENTORY</p>
                  <h1>{siteSettings.homepage_heading === DEFAULT_SITE_SETTINGS.homepage_heading ? <>Cards worth<br /><em>a bounty.</em></> : siteSettings.homepage_heading}</h1>
                  <p className="hero-description">{siteSettings.homepage_description}</p>
                  <div className="hero-actions">
                    <Link className="button button--gold" to="/shop">
                      Shop the archive <ArrowRight size={16} />
                    </Link>
                    {homepageSections.has('featured') && <a className="text-link" href="#featured">Discover the collection</a>}
                  </div>
                  <div className="hero-stats">
                    <div><strong>{catalogLoading ? '—' : storefrontProducts.length}</strong><span>Cards in stock</span></div>
                    <div><strong>{catalogLoading ? '—' : setCount}</strong><span>Sets covered</span></div>
                    <div><strong>GIBRALTAR</strong><span>Local pickup</span></div>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="hero-art__frame">
                    <div className="hero-art__image">
                      {cardOfTheWeek ? (
                        <Link to={`/product/${encodeURIComponent(cardOfTheWeek.id)}`} aria-label={`View ${cardOfTheWeek.name}`}><ProductImage product={cardOfTheWeek} className="card-of-week-image" /></Link>
                      ) : (
                        <div className="hero-art__placeholder"><Anchor size={68} strokeWidth={0.8} /></div>
                      )}
                    </div>
                    <div className="hero-art__seal"><Sparkles size={16} /><span>THE<br />VAULT</span></div>
                    <div className="hero-art__caption">
                      <span className="eyebrow">CARD OF THE WEEK · 01</span>
                      <strong>{cardOfTheWeek?.name || 'A new legend awaits'}</strong>
                      <span>{cardOfTheWeek ? money(cardOfTheWeek.price) : 'Curated for collectors'}</span>
                    </div>
                  </div>
                  <div className="hero-coordinate">N 36° 08&apos; · W 5° 21&apos;</div>
                </div>
                <div className="hero-watermark">G</div>
              </section>

              {homepageSections.has('trust') && <section className="trust-strip">
                <div><BadgeCheck size={18} /><span>Inspected by hand</span></div>
                <i />
                <div><Box size={18} /><span>Sleeved & top-loaded</span></div>
                <i />
                <div><MapPin size={18} /><span>{siteSettings.shipping_information || 'Local pickup in Gibraltar only. Collection is arranged after ordering.'}</span></div>
              </section>}

              {homepageSections.has('featured') && <section className="content-section page-width" id="featured">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">THE FEATURED HAUL</p>
                    <h2>Cards selected<br className="desktop-break" /> for the archive.</h2>
                  </div>
                  <p className="section-note">Hand-picked from the current vault. Each card is a single physical piece — once it sells, it&apos;s gone.</p>
                </div>
                {catalogLoading ? (
                  <div className="loading-state"><span className="loader" />Opening the archive…</div>
                ) : featuredProducts.length ? (
                  <div className="product-grid product-grid--featured">
                    {featuredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={addToCart} />
                    ))}
                  </div>
                ) : (
                  <EmptyCatalogue error={catalogError} />
                )}
                <div className="section-footer">
                  <Link className="button button--outline" to="/shop">View all cards <ArrowRight size={16} /></Link>
                </div>
              </section>}

              {homepageSections.has('browse') && <section className="archive-callout">
                <div className="archive-callout__inner page-width">
                  <div className="archive-callout__seal"><Anchor size={28} /></div>
                  <div>
                    <p className="eyebrow">THE SHOP</p>
                    <h2>Straight from<br /><em>the vault floor.</em></h2>
                    <p>{siteSettings.shipping_information}</p>
                    <Link className="button button--gold" to="/shop">Browse the full archive <ArrowRight size={16} /></Link>
                  </div>
                  <div className="callout-cards">
                    {storefrontProducts.slice(1, 3).map((product, index) => (
                      <div className={`callout-card callout-card--${index + 1}`} key={product.id}>
                        <ProductImage product={product} />
                        <span>{product.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>}

              {homepageSections.has('values') && <section className="promise-section page-width">
                <div className="promise-heading">
                  <p className="eyebrow">A BETTER KIND OF BOUNTY</p>
                  <h2>Every card has<br /><em>a story. We keep it safe.</em></h2>
                </div>
                <div className="promise-grid">
                  <article><span className="promise-number">01</span><BadgeCheck size={20} /><h3>Inspected by hand</h3><p>Every card is checked for centering, corners and surface before it enters the archive.</p></article>
                  <article><span className="promise-number">02</span><Box size={20} /><h3>Sleeved and top-loaded</h3><p>Penny sleeve, rigid top loader, team bag and a padded mailer. Nothing shifts in transit.</p></article>
                  <article><span className="promise-number">03</span><ShieldCheck size={20} /><h3>Stock you can trust</h3><p>Quantities are live. When a card reads one copy left, there really is one copy left.</p></article>
                </div>
              </section>}

              {homepageSections.has('shipping') && (
                <section className="shipping-information page-width">
                  <MapPin size={18} />
                  <p>{siteSettings.shipping_information}</p>
                </section>
              )}
            </main>
          }
        />
        <Route
          path="/shop"
          element={
            <main className="shop-page page-width">
              <div className="shop-intro">
                <p className="eyebrow">THE ARCHIVE <span className="live-dot" /> LIVE STOCK</p>
                <h1>{siteSettings.archive_heading || 'Every card in the vault.'}</h1>
                <p>{storefrontProducts.length} cards · {siteSettings.archive_description || 'photographed as found · local pickup in Gibraltar'}</p>
              </div>
              <div className="shop-search-row">
                <label className="search-field shop-search-field">
                  <Search size={18} />
                  <input type="search" placeholder="Search by card name, number (OP01-001), set or rarity…" value={search} onChange={(event) => setSearch(event.target.value)} />
                  <span className="search-hint">CARD NO.</span>
                </label>
                <label className="shop-sort"><span>Sort by</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="newest">Recently added</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Card name</option><option value="card-number">Card number</option></select><ChevronDown size={14} /></label>
              </div>
              <div className="shop-browse-layout">
                <aside className="shop-filter-panel">
                  <div className="shop-filter-heading"><div><SlidersHorizontal size={16} /><strong>Refine the archive</strong></div><button type="button" onClick={resetFilters}>Reset</button></div>
                  <label className="shop-filter-field"><span>Set / expansion</span><select value={setFilter} onChange={(event) => setSetFilter(event.target.value)}><option>All sets</option>{setOptions.map((name) => <option key={name}>{name}</option>)}</select></label>
                  <label className="shop-filter-field"><span>Card type / category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categoryNames.map((name) => <option key={name}>{name}</option>)}</select></label>
                  <label className="shop-filter-field"><span>Rarity</span><select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}><option>All rarities</option>{rarities.map((rarity) => <option key={rarity}>{rarity}</option>)}</select></label>
                  <label className="shop-filter-field"><span>Language</span><select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}><option>All languages</option><option>English</option><option>Japanese</option></select></label>
                  <label className="shop-filter-field"><span>Condition</span><select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}><option>All conditions</option>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
                  <label className="shop-filter-field"><span>Printing / variant</span><select value={variantFilter} onChange={(event) => setVariantFilter(event.target.value)}><option>All variants</option>{variants.map((variant) => <option key={variant}>{variant}</option>)}</select></label>
                  <label className="shop-filter-field"><span>Availability</span><select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}><option>In stock</option><option>All stock</option><option>Sold out</option></select></label>
                  <div className="shop-filter-field"><span>Price range</span><div className="price-fields"><label><span className="sr-only">Minimum price</span><span>£</span><input type="number" min="0" placeholder="Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label><span>–</span><label><span className="sr-only">Maximum price</span><span>£</span><input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label></div></div>
                </aside>
                <section className="shop-results">
                  <div className="shop-results-toolbar">
                    <div className="results-row"><span><strong>{sortedProducts.length}</strong> cards found <i>·</i> {storefrontProducts.length} listed</span>{(search || setFilter !== 'All sets' || categoryFilter !== 'All categories' || rarityFilter !== 'All rarities' || languageFilter !== 'All languages' || conditionFilter !== 'All conditions' || variantFilter !== 'All variants' || availabilityFilter !== 'In stock' || minPrice || maxPrice) && <button className="clear-filters" type="button" onClick={resetFilters}>Clear filters <X size={13} /></button>}</div>
                    <div className="shop-view-controls"><label><span>Show</span><select value={pageSize} onChange={(event) => setPageSize(event.target.value)}><option value="24">24</option><option value="48">48</option><option value="96">96</option></select></label><div className="shop-view-toggle" role="group" aria-label="Product layout"><button type="button" className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')} aria-label="Grid view"><Grid2X2 size={16} /></button><button type="button" className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="List view"><List size={17} /></button></div></div>
                  </div>
                  {catalogLoading ? <div className="loading-state"><span className="loader" />Opening the archive…</div> : visibleProducts.length ? <>
                    <div className={`product-grid shop-grid ${viewMode === 'list' ? 'shop-grid--list' : ''}`}>{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} viewMode={viewMode} />)}</div>
                    {pageCount > 1 && <nav className="shop-pagination" aria-label="Product pages"><button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button><span>Page <strong>{currentPage}</strong> of {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></nav>}
                  </> : <EmptyCatalogue error={catalogError} />}
                </section>
              </div>
            </main>
          }
        />
        <Route
          path="/product/:productId"
          element={<ProductDetailPage products={storefrontProducts} onAdd={addToCart} />}
        />
        <Route
          path="/account/orders"
          element={
            <OrdersPage
              user={user}
              orders={orders}
              orderItems={orderItems}
              products={products}
              loading={ordersLoading}
              error={ordersError}
              onSignIn={() => setAuthOpen(true)}
              onSignOut={signOut}
              onReload={() => loadOrders(false)}
            />
          }
        />
        <Route
          path="/admin"
          element={
            adminAccessGranted ? (
              <AdminDashboard
                user={user}
                isAdmin={isAdmin}
                profileError={profileError}
                products={products}
                categories={categories}
                sets={sets}
                siteSettings={siteSettings}
                siteSettingsError={siteSettingsError}
                orders={orders}
                orderItems={orderItems}
                loading={ordersLoading}
                error={ordersError}
                action={orderAction}
                onSignIn={() => setAuthOpen(true)}
                onReload={() => loadOrders(true)}
                onUpdateStatus={updateOrderStatus}
                onRefreshProducts={loadCatalog}
                onSaveSiteSettings={saveSiteSettings}
              />
            ) : <Navigate to="/admin/access" replace />
          }
        />
        <Route path="*" element={<main className="page-width not-found"><p className="eyebrow">LOST AT SEA</p><h1>Page not found.</h1><Link className="button button--gold" to="/">Return to the archive</Link></main>} />
      </Routes>

      <footer className="site-footer">
        <div className="footer-main page-width">
          <Link className="brand" to="/">
            <span className="brand__mark"><Anchor size={22} strokeWidth={1.45} /></span>
            <span className="brand__name"><strong>GRAND LINE</strong><small>ARCHIVE · TCG</small></span>
          </Link>
          <p>Thoughtfully collected. Carefully sent.<br />A small archive for the long voyage.</p>
          <div className="footer-links"><Link to="/shop">Browse cards</Link><button type="button" onClick={openAccount}>Your orders</button>{siteSettings.contact_information && <span>{siteSettings.contact_information}</span>}<span>Made for collectors · Gibraltar</span></div>
        </div>
        <div className="footer-bottom page-width"><span>© {currentYear} Grand Line Archive</span><span>ONE PIECE CARD GAME · COLLECTOR INVENTORY</span></div>
      </footer>

      {cartOpen && (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}>
          <aside className="cart-drawer" aria-label="Shopping basket">
            <div className="drawer-heading"><div><p className="eyebrow">YOUR HAUL</p><h2>Basket <span>({cartCount})</span></h2></div><button className="icon-button" type="button" aria-label="Close basket" onClick={() => setCartOpen(false)}><X size={19} /></button></div>
            {cart.length ? (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.product.id}>
                      <ProductImage product={item.product} />
                      <div className="cart-item__details"><strong>{item.product.name}</strong><span>{money(item.product.price)}</span><div className="quantity-control"><button type="button" aria-label="Decrease quantity" onClick={() => changeCartQuantity(item.product.id, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" aria-label="Increase quantity" disabled={item.quantity >= item.product.stock} onClick={() => changeCartQuantity(item.product.id, 1)}><Plus size={13} /></button></div></div>
                      <strong className="cart-item__subtotal">{money(item.product.price * item.quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="cart-summary"><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><p>Arrange your local pickup in Gibraltar after placing your order.</p><button className="button button--gold button--wide" type="button" disabled={orderAction === 'placing'} onClick={placeOrder}>{orderAction === 'placing' ? 'Placing order…' : user ? 'Place order' : 'Sign in to place order'} <ArrowRight size={16} /></button>{ordersError && <p className="form-error">{ordersError}</p>}</div>
              </>
            ) : (
              <div className="empty-cart"><ShoppingBag size={30} /><h3>Your basket is waiting.</h3><p>Find a card for the collection.</p><Link className="button button--outline" to="/shop" onClick={() => setCartOpen(false)}>Explore the archive</Link></div>
            )}
          </aside>
        </div>
      )}

      {authOpen && (
        <AuthModal
          onClose={() => { setAuthOpen(false); setAuthMessage('') }}
          message={authMessage}
          onMessage={setAuthMessage}
        />
      )}

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  )
}

function EmptyCatalogue({ error }) {
  return (
    <div className="empty-catalogue">
      <Anchor size={24} strokeWidth={1.2} />
      <h3>{error ? 'The vault is temporarily closed.' : 'No cards on this course.'}</h3>
      <p>{error ? 'Check the Supabase connection and table read policies, then try again.' : 'Try a different search or clear the filters.'}</p>
    </div>
  )
}

function AuthModal({ onClose, message, onMessage }) {
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured. Check .env.local.')
      return
    }
    setBusy(true)
    setError('')
    onMessage('')
    const result =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      onMessage('Check your email to confirm your account, then sign in.')
    } else {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button modal-close" type="button" aria-label="Close" onClick={onClose}><X size={19} /></button>
        <span className="auth-icon"><Anchor size={24} /></span>
        <p className="eyebrow">{mode === 'signin' ? 'WELCOME BACK' : 'JOIN THE ARCHIVE'}</p>
        <h2 id="auth-title">{mode === 'signin' ? 'Sign in to your account.' : 'Create your account.'}</h2>
        <p className="auth-description">Keep your collection close and your orders in view.</p>
        {message && <p className="form-notice">{message}</p>}
        <form onSubmit={submit}>
          {mode === 'signup' && <label className="form-field"><span>Your name</span><input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Monkey D." /></label>}
          <label className="form-field"><span>Email address</span><div className="input-with-icon"><Mail size={16} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
          <label className="form-field"><span>Password</span><div className="input-with-icon"><LockKeyhole size={16} /><input type="password" minLength={6} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></div></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button--gold button--wide" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
        </form>
        <p className="auth-switch">{mode === 'signin' ? 'New to the archive?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>{mode === 'signin' ? 'Create account' : 'Sign in'}</button></p>
      </section>
    </div>
  )
}

function OrdersPage({ user, orders, orderItems, products, loading, error, onSignIn, onSignOut, onReload }) {
  if (!user) {
    return <main className="page-width protected-page"><p className="eyebrow">YOUR ACCOUNT</p><h1>Your orders,<br /><em>all in one place.</em></h1><p>Sign in to review the latest dispatches from the archive.</p><button className="button button--gold" type="button" onClick={onSignIn}>Sign in to continue <ArrowRight size={16} /></button></main>
  }
  return (
    <main className="page-width account-page">
      <div className="account-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Order <em>log.</em></h1><p>{user.email}</p></div><button className="button button--outline" type="button" onClick={onSignOut}>Sign out</button></div>
      {error && <ErrorNotice message={error} />}
      {loading ? <div className="loading-state"><span className="loader" />Loading your orders…</div> : orders.length ? (
        <div className="order-list">
          {orders.map((order) => <OrderCard key={order.id} order={order} orderItems={orderItems} products={products} />)}
        </div>
      ) : <div className="empty-orders"><ClipboardList size={28} /><h2>No orders just yet.</h2><p>Your next favorite card is out there.</p><Link className="button button--gold" to="/shop">Explore the archive <ArrowRight size={16} /></Link></div>}
      <button className="subtle-refresh" type="button" onClick={onReload}>Refresh order history</button>
    </main>
  )
}

function OrderCard({ order, orderItems, products }) {
  const items = orderItems.filter((item) => String(item.order_id) === String(order.id))
  return (
    <article className="order-card">
      <div className="order-card__heading"><div><span className="eyebrow">ORDER #{String(order.id).slice(-8).toUpperCase()}</span><span>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date not recorded'}</span></div><span className={`status-pill status-pill--${String(order.status || 'pending').toLowerCase()}`}>{order.status || 'Pending'}</span></div>
      <OrderItems items={items} products={products} />
      <div className="order-card__total"><span>Order total</span><strong>{money(firstValue(order.total_amount, order.total, order.amount, 0))}</strong></div>
    </article>
  )
}

function OrderItems({ items, products }) {
  return (
    <div className="order-lines">
      {items.length ? items.map((item) => {
        const product = products.find((entry) => String(entry.id) === String(item.product_id))
        return <div className="order-line" key={item.id || `${item.order_id}-${item.product_id}`}><span>{product?.name || `Card ${item.product_id}`} <small>× {item.quantity}</small></span><strong>{money(Number(firstValue(item.unit_price, item.price, 0)) * Number(item.quantity || 0))}</strong></div>
      }) : <p className="order-lines__empty">No line items are available for this order.</p>}
    </div>
  )
}

function ErrorNotice({ message }) {
  return <div className="error-notice" role="alert"><ShieldCheck size={16} /><span>{message}</span></div>
}

function App() {
  return (
    <BrowserRouter>
      <Storefront />
    </BrowserRouter>
  )
}

export default App
