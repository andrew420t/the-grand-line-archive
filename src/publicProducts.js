export function getPublicStorefrontProducts(products = []) {
  return (products || []).filter((product) => {
    const status = String(product?.raw?.status ?? product?.status ?? '').trim().toLowerCase()
    return status === 'active'
  })
}
