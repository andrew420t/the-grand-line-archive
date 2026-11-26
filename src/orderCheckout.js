/**
 * Reconcile a basket against a fresh product query before creating an order.
 * This is a client-side safeguard only; atomic stock reservation must be enforced
 * server-side to protect against concurrent checkout requests.
 */

const MAX_DATABASE_INTEGER = 2147483647
export function buildCheckoutSnapshot(cart = [], productRows = []) {
  const productsById = new Map((productRows || []).map((row) => [String(row.id), row]))
  const issues = []
  const requestedByProduct = new Map()
  for (const item of cart || []) {
    const id = String(item.product?.id)
    requestedByProduct.set(id, (requestedByProduct.get(id) || 0) + Number(item.quantity || 0))
  }
  const stockIssuesAdded = new Set()
  const items = (cart || []).map((item) => {
    const product = productsById.get(String(item.product?.id))
    const quantity = Number(item.quantity)
    if (!product || String(product.status || '').toLowerCase() !== 'active') {
      issues.push({ productId: item.product?.id, name: item.product?.name || 'Card', reason: 'unavailable' })
      return { ...item, product: { ...item.product, stock: 0 } }
    }
    const stock = Number(product.stock_quantity)
    const price = Number(product.price)
    const requestedQuantity = requestedByProduct.get(String(product.id)) || quantity
    if ((!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1 || !Number.isFinite(stock) || stock < requestedQuantity) && !stockIssuesAdded.has(String(product.id))) {
      issues.push({ productId: product.id, name: product.name || item.product?.name || 'Card', reason: 'insufficient-stock', stock: Number.isFinite(stock) ? Math.max(0, stock) : 0, requested: requestedQuantity })
      stockIssuesAdded.add(String(product.id))
    }
    const validPrice = Number.isFinite(price) && price >= 0
    if (!validPrice) {
      issues.push({ productId: product.id, name: product.name || item.product?.name || 'Card', reason: 'invalid-price' })
    }
    if (validPrice && price !== Number(item.product?.price)) {
      issues.push({ productId: product.id, name: product.name || item.product?.name || 'Card', reason: 'price-changed', price })
    }
    return {
      ...item,
      product: {
        ...item.product,
        name: product.name || item.product?.name,
        price: validPrice ? price : item.product?.price,
        stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
        raw: { ...item.product?.raw, status: product.status },
      },
    }
  })
  const total = items.reduce((sum, item) => sum + Number(item.product.price || 0) * Number(item.quantity || 0), 0)
  return { ok: issues.length === 0, items, total: Number(total.toFixed(2)), issues }
}

/**
 * Build the minimal request for the atomic database checkout RPC.
 * The server must re-check price, active status and stock under row locks;
 * payload includes IDs, quantities and expected prices to reject stale price changes.
 */
export function buildAtomicCheckoutItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null
  const combined = new Map()
  for (const item of items) {
    const productId = String(item?.product?.id ?? '').trim()
    const quantity = Number(item?.quantity)
    const expectedUnitPrice = Number(item?.product?.price)
    if (!productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_DATABASE_INTEGER ||
        !Number.isFinite(expectedUnitPrice) || expectedUnitPrice < 0) return null
    const previous = combined.get(productId)
    if (previous && previous.expected_unit_price !== expectedUnitPrice) return null
    const combinedQuantity = (previous?.quantity || 0) + quantity
    if (!Number.isSafeInteger(combinedQuantity) || combinedQuantity > MAX_DATABASE_INTEGER) return null
    combined.set(productId, {
      quantity: combinedQuantity,
      expected_unit_price: expectedUnitPrice,
    })
  }
  return [...combined.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([product_id, item]) => ({ product_id, ...item }))
}
