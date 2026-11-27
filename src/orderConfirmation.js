export function formatOrderReference(orderId = '') {
  const value = String(orderId || '').replace(/-/g, '').toUpperCase()
  return value ? value.slice(-8) : ''
}

export function buildOrderConfirmation(orderId, items = [], total = 0) {
  if (!orderId || !Array.isArray(items) || items.length === 0) return null
  const cleanItems = items.map((item) => ({
    productId: String(item?.product?.id || ''),
    name: String(item?.product?.name || 'Trading card'),
    quantity: Number(item?.quantity || 0),
    unitPrice: Number(item?.product?.price || 0),
  }))
  if (cleanItems.some((item) => !item.productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) return null
  const computedTotal = cleanItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const numericTotal = Number(total)
  return {
    id: String(orderId),
    reference: formatOrderReference(orderId),
    items: cleanItems,
    total: Number.isFinite(numericTotal) ? Number(numericTotal.toFixed(2)) : Number(computedTotal.toFixed(2)),
    pickupMethod: 'local_pickup',
  }
}
