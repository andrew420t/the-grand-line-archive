export const DEFAULT_SITE_SETTINGS = {
  announcement_headline: 'THE ARCHIVE IS OPEN',
  announcement_text: 'Local pickup in Gibraltar · No delivery or shipping',
  homepage_heading: 'Cards worth a bounty.',
  homepage_description:
    'Every card in the archive is inspected by hand, photographed as found, and stored in a light-safe vault. Leaders, secret rares and the odd legend — priced honestly and available for local pickup in Gibraltar.',
  featured_product_ids: [],
  card_of_the_week_product_id: '',
  homepage_sections: ['trust', 'featured', 'browse', 'values', 'shipping'],
  shipping_information: 'Local pickup in Gibraltar only. We do not offer delivery or shipping.',
  contact_information: '',
}

export function normalizeSiteSettings(value) {
  const settings = { ...DEFAULT_SITE_SETTINGS, ...(value || {}) }
  const legacyShippingText = /\\b(uk|united kingdom|worldwide|ship(?:ping|ped)?|deliver(?:y|ies|ed)?)\\b/i\n  if (legacyShippingText.test(settings.announcement_text || '')) settings.announcement_text = DEFAULT_SITE_SETTINGS.announcement_text\n  if (legacyShippingText.test(settings.homepage_description || '')) settings.homepage_description = DEFAULT_SITE_SETTINGS.homepage_description\n  if (legacyShippingText.test(settings.shipping_information || '')) settings.shipping_information = DEFAULT_SITE_SETTINGS.shipping_information\n  settings.featured_product_ids = Array.isArray(settings.featured_product_ids)
    ? settings.featured_product_ids.map(String)
    : []
  settings.homepage_sections = Array.isArray(settings.homepage_sections)
    ? settings.homepage_sections.map(String)
    : DEFAULT_SITE_SETTINGS.homepage_sections
  settings.card_of_the_week_product_id = String(settings.card_of_the_week_product_id || '')
  return settings
}
