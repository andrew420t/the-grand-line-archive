export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled']

export function isValidOrderStatus(status) {
  return ORDER_STATUSES.includes(String(status || '').trim().toLowerCase())
}

export function orderStatusUpdateFailure(result) {
  if (result?.error) return result.error.message || 'The database rejected the order status update.'
  if (!result?.data?.id) return 'Order was not found or the status update was not permitted.'
  return ''
}
