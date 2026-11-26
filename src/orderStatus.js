export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled']

export function isValidOrderStatus(status) {
  return ORDER_STATUSES.includes(String(status || '').trim().toLowerCase())
}

export function orderStatusUpdateFailure(result, expectedOrderId = '') {
  if (result?.error) return result.error.message || 'The database rejected the order status update.'
  const affectedOrderId = result?.data?.id || result?.data
  if (!affectedOrderId || (expectedOrderId && String(affectedOrderId) !== String(expectedOrderId))) {
    return 'Order was not found or the status update was not permitted.'
  }
  return ''
}

export function orderDeleteFailure(result) {
  if (result?.error) return result.error.message || 'The pending order could not be removed.'
  if (!result?.data?.id) return 'The pending order was not found or deletion was not permitted.'
  return ''
}

export function isAllowedOrderStatusTransition(currentStatus, nextStatus) {
  const current = String(currentStatus || '').trim().toLowerCase()
  const next = String(nextStatus || '').trim().toLowerCase()
  if (current === next && ORDER_STATUSES.includes(current)) return true
  return (
    (current === 'pending' && ['processing', 'cancelled'].includes(next)) ||
    (current === 'processing' && ['shipped', 'cancelled'].includes(next)) ||
    (current === 'shipped' && next === 'completed')
  )
}
