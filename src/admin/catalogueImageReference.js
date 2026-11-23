/**
 * Resolve a catalogue image for a printing and safe alternate official artwork.
 *
 * A TCGCSV stamped/foil record may not have its own image. We may reuse
 * official base-card artwork for identification, but label it as a fallback
 * because it may not depict the special finish.
 */
export function resolveCatalogueImage({ printing, index = {}, printings = [], language = 'en' } = {}) {
  if (!printing) return { imageUrl: '', fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }

  const locatorFor = (candidate) => index.locatorsByPrinting instanceof Map
    ? index.locatorsByPrinting.get(candidate.key + ':' + candidate.site)
    : undefined
  const officialUrlFor = (candidate, locator) => {
    if (!locator?.image_id || !['en', 'jp'].includes(candidate.site)) return ''
    const host = candidate.site === 'jp' ? 'https://www.onepiece-cardgame.com' : 'https://en.onepiece-cardgame.com'
    return host + '/images/cardlist/card/' + encodeURIComponent(locator.image_id) + '.png'
  }
  const locator = locatorFor(printing)
  const officialUrl = officialUrlFor(printing, locator)
  const directUrl = officialUrl || String(printing.image_url || '')
  const alternateOfficialUrls = [...new Set((printings || [])
    .filter((candidate) => candidate.card_key === printing.card_key && candidate.site === language && candidate.key !== printing.key)
    .map((candidate) => officialUrlFor(candidate, locatorFor(candidate)))
    .filter((url) => url && url !== directUrl))]
  const fallbackImageUrl = alternateOfficialUrls[0] || ''

  if (directUrl) {
    return {
      imageUrl: directUrl,
      fallbackImageUrl,
      source: officialUrl
        ? (printing.site === 'jp' ? 'Bandai official Japanese image' : 'Bandai official English image')
        : 'Catalogue source image',
      usesBaseImageFallback: false,
    }
  }

  if (printing.site === 'tcgcsv' && fallbackImageUrl) {
    return {
      imageUrl: fallbackImageUrl,
      fallbackImageUrl,
      source: language === 'jp'
        ? 'Bandai official Japanese base-card fallback (stamped artwork may differ)'
        : 'Bandai official English base-card fallback (stamped artwork may differ)',
      usesBaseImageFallback: true,
    }
  }

  return { imageUrl: '', fallbackImageUrl: '', source: 'No image reference', usesBaseImageFallback: false }
}
