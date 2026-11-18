export const DEFAULT_SITE_SETTINGS = {
  announcement_headline: 'THE ARCHIVE IS OPEN',
  announcement_text: 'Insured UK shipping on every order',
  homepage_heading: 'Cards worth a bounty.',
  homepage_description:
    'Every card in the archive is inspected by hand, photographed as found, and stored in a light-safe vault. Leaders, secret rares and the odd legend — priced honestly, shipped insured.',
  featured_product_ids: [],
  card_of_the_week_product_id: '',
  homepage_sections: ['trust', 'featured', 'browse', 'values', 'shipping'],
  shipping_information: 'Insured UK shipping is arranged after your order.',
  contact_information: '',
}

export function normalizeSiteSettings(value) {
  const settings = { ...DEFAULT_SITE_SETTINGS, ...(value || {}) }
  settings.featured_product_ids = Array.isArray(settings.featured_product_ids)
    ? settings.featured_product_ids.map(String)
    : []
  settings.homepage_sections = Array.isArray(settings.homepage_sections)
    ? settings.homepage_sections.map(String)
    : DEFAULT_SITE_SETTINGS.homepage_sections
  settings.card_of_the_week_product_id = String(settings.card_of_the_week_product_id || '')
  return settings
}
