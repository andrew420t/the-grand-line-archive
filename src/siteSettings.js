export const DEFAULT_SITE_SETTINGS = {
  announcement_headline: 'THE ARCHIVE IS OPEN',
  announcement_text: 'Local pickup available in Gibraltar',
  homepage_heading: 'Cards worth a bounty.',
  homepage_description:
    'Every card in the archive is inspected by hand, photographed as found, and stored in a light-safe vault. Leaders, secret rares and the odd legend — priced honestly and available for local pickup in Gibraltar.',
  featured_product_ids: [],
  card_of_the_week_product_id: '',
  homepage_sections: ['trust', 'featured', 'browse', 'values', 'shipping'],
  shipping_information: 'Local pickup in Gibraltar only. Collection is arranged after ordering.',
  contact_information: '',
  archive_heading: 'Every card in the vault.',
  archive_description: 'Cards photographed as found · local pickup in Gibraltar',
  theme_preset: 'original', site_background: '#11110f', site_text: '#e7e1d3', site_heading: '#e7e1d3',
  site_accent: '#c9a866', site_divider: '#c9a866', site_button_text: '#18150e', site_font_scale: '100',
  card_image_filter: 'original', card_image_fit: 'cover', storefront_background_image: '',
  homepage_background_image: '', homepage_background_position: 'center center', announcement_enabled: true,
}

export function normalizeSiteSettings(value) {
  const settings = { ...DEFAULT_SITE_SETTINGS, ...(value || {}) }
  const legacyShippingText = /\b(uk|united kingdom|worldwide|ship(?:ping|ped)?|deliver(?:y|ies|ed)?)\b/i
  if (legacyShippingText.test(settings.announcement_text || '')) settings.announcement_text = DEFAULT_SITE_SETTINGS.announcement_text
  if (legacyShippingText.test(settings.homepage_description || '')) settings.homepage_description = DEFAULT_SITE_SETTINGS.homepage_description
  if (legacyShippingText.test(settings.shipping_information || '')) settings.shipping_information = DEFAULT_SITE_SETTINGS.shipping_information
  settings.featured_product_ids = Array.isArray(settings.featured_product_ids)
    ? settings.featured_product_ids.map(String)
    : []
  settings.homepage_sections = Array.isArray(settings.homepage_sections)
    ? settings.homepage_sections.map(String)
    : DEFAULT_SITE_SETTINGS.homepage_sections
  settings.card_of_the_week_product_id = String(settings.card_of_the_week_product_id || '')
  return settings
}
