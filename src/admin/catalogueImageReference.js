/**
 * Resolve a catalogue image for a printing.
 *
 * A TCGCSV-only stamped/foil record may not have its own image. In that case
 * reuse the official base-card artwork for the same card key and language,
 * but label it as a fallback so the UI never implies it depicts the special
 * printing itself.
 */
export function resolveCatalogueImage({ printing, index = {}, printings = [], language = 'en' } = {}) {
  if (!printing) return { imageUrl: '', fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }

  const locator = index.locatorsByPrinting instanceof Map
    ? index.locatorsByPrinting.get(printing.key + ':' + printing.site)
    : undefined
  const site = printing.site
  const host = site === 'jp'
    ? 'https://www.onepiece-cardgame.com'
    : site === 'en'
      ? 'https://en.onepiece-cardgame.com'
      : ''
  const officialUrl = locator?.image_id && host
    ? host + '/images/cardlist/card/' + encodeURIComponent(locator.image_id) + '.png'
    : ''
  const directUrl = officialUrl || String(printing.image_url || '')
  if (directUrl) {
    return {
      imageUrl: directUrl,
      fallbackImageUrl: '',
      source: officialUrl ? (site === 'jp' ? 'Bandai official Japanese image' : 'Bandai official English image') : 'Catalogue source image',
      usesBaseImageFallback: false,
    }
  }

  if (site === 'tcgcsv') {
    const basePrinting = printings.find((candidate) => {
      if (candidate.card_key !== printing.card_key || candidate.site !== language) return false
      const candidateLocator = index.locatorsByPrinting instanceof Map
        ? index.locatorsByPrinting.get(candidate.key + ':' + candidate.site)
        : undefined
      return Boolean(candidateLocator?.image_id)
    })
    if (basePrinting) {
      const baseLocator = index.locatorsByPrinting.get(basePrinting.key + ':' + basePrinting.site)
      const baseHost = language === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
      const fallbackImageUrl = baseHost + '/images/cardlist/card/' + encodeURIComponent(baseLocator.image_id) + '.png'
      return {
        imageUrl: fallbackImageUrl,
        fallbackImageUrl,
        source: language === 'jp'
          ? 'Bandai official Japanese base-card fallback (stamped artwork may differ)'
          : 'Bandai official English base-card fallback (stamped artwork may differ)',
        usesBaseImageFallback: true,
      }
    }
  }

  return { imageUrl: '', fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }
}
