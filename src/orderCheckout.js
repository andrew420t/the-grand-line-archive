/**
 * Reconcile a basket against a fresh product query before creating an order.
 * This is a client-side safeguard only; atomic stock reservation must be enforced
 * server-side to protect against concurrent checkout requests.
 */
export function buildCheckoutSnapshot(cart = [], productRows = []) {
  const productsById = new Map((productRows || []).map((row) => [String(row.id), row]))
  const issues = []
  const items = (cart || []).map((item) => {
    const product = productsById.get(String(item.product?.id))
    const quantity = Number(item.quantity)
    if (!product || String(product.status || '').toLowerCase() !== 'active') {
      issues.push({ productId: item.product?.id, name: item.product?.name || 'Card', reason: 'unavailable' })
      return { ...item, product: { ...item.product, stock: 0 } }
    }
    const stock = Number(product.stock_quantity)
    const price = Number(product.price)
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(stock) || stock < quantity) {
      issues.push({ productId: product.id, name: product.name || item.product?.name || 'Card', reason: 'insufficient-stock', stock: Number.isFinite(stock) ? Math.max(0, stock) : 0 })
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
