export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled']

export function isValidOrderStatus(status) {
  return ORDER_STATUSES.includes(String(status || '').trim().toLowerCase())
}

export function orderStatusUpdateFailure(result) {
  if (result?.error) return result.error.message || 'The database rejected the order status update.'
  if (!result?.data?.id) return 'Order was not found or the status update was not permitted.'
  return ''
}

export function orderDeleteFailure(result) {
  if (result?.error) return result.error.message || 'The pending order could not be removed.'
  if (!result?.data?.id) return 'The pending order was not found or deletion was not permitted.'
  return ''
}
