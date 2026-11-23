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
