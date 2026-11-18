export const EXTENDED_CARD_COLUMNS = [
  'color',
  'power',
  'cost',
  'card_type',
  'effect_text',
  'language',
  'classification',
  'variant_label',
]

export function buildNewProductPayload(form, setId, includeCardDetails) {
  const timestamp = new Date().toISOString()
  const payload = {
    id: globalThis.crypto.randomUUID(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    card_number: form.card_number.trim() || null,
    rarity: form.rarity.trim() || null,
    category_id: form.category_id || null,
    set_id: setId || null,
    price: Number(Number(form.price_gbp).toFixed(2)),
    stock_quantity: Number(form.stock_quantity),
    image_url: null,
    featured: Boolean(form.featured),
    condition: form.condition,
    status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
  }

  if (includeCardDetails) {
    Object.assign(payload, {
      color: form.color.trim() || null,
      power: form.power === '' ? null : Number(form.power),
      cost: form.cost === '' ? null : Number(form.cost),
      card_type: form.card_type.trim() || null,
      effect_text: form.effect_text.trim() || null,
      language: form.language.trim() || null,
      classification: form.classification.trim() || null,
      variant_label: form.variant_label.trim() || null,
    })
  }

  return payload
}
