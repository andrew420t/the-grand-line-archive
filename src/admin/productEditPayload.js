
export function filterInventoryProducts(products = [], query = '', bulkFilter = 'regular') {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase()
  return (products || []).filter((product) => {
    const isBulk = product?.raw?.is_bulk === true
    if (bulkFilter === 'regular' && isBulk) return false
    if (bulkFilter === 'bulk' && !isBulk) return false
    if (!normalizedQuery) return true
    return [
      product?.name,
      product?.setName,
      product?.category,
      product?.rarity,
      product?.raw?.card_number,
    ].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery))
  })
}

export function buildProductEditPayload(fields, values, raw = {}, updatedAt = new Date().toISOString()) {
  const payload = {}
  fields.forEach((field) => {
    const value = values[field.key]
    if (field.numeric) {
      // Optional card stats clear to NULL; required price/stock are validated by the editor.
      payload[field.column] = value === '' ? null : Number(value)
    } else if (field.checkbox) {
      payload[field.column] = Boolean(value)
    } else if ((field.select || field.options) && value === '') {
      payload[field.column] = null
    } else if (typeof value === 'string' && value.trim() === '' && !field.required) {
      // Empty optional text fields are explicitly cleared in the database.
      payload[field.column] = null
    } else {
      payload[field.column] = value
    }
  })
  if ('updated_at' in raw) payload.updated_at = updatedAt
  return payload
}

export function parseInventoryStockUpdate(values = {}, raw = {}) {
  const quantityValue = values.stock ?? raw.stock_quantity
  const priceValue = values.price ?? raw.price
  if (quantityValue === '' || priceValue === '') return null
  const quantity = Number(quantityValue)
  const price = Number(priceValue)
  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) return null
  return { stock_quantity: quantity, price }
}


export function productDeleteFailure(result) {
  if (result?.error) return result.error.message || 'The database rejected the product deletion.'
  if (!result?.data?.id) return 'Product was not found or deletion was not permitted.'
  return ''
}

export function productUpdateFailure(result) {
  if (result?.error) return result.error.message || 'The database rejected the product update.'
  if (!result?.data?.id) return 'Product was not found or the update was not permitted.'
  return ''
}
