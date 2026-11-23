export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled']

export function isValidOrderStatus(status) {
  return ORDER_STATUSES.includes(String(status || '').trim().toLowerCase())
}
