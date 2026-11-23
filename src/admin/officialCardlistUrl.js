/**
 * Resolve the official Bandai card-list page for standard set codes.
 * Combined-product sets are deliberately omitted until their official series
 * mapping is verified. DON!! cards link to Bandai's separate DON!! PDF.
 */
export function getOfficialCardlistUrl(setCode, language = 'en', isDon = false) {
  if (isDon && !setCode) return 'https://www.onepiece-cardgame.com/pdf/don-cardlist.pdf'
  const normalized = String(setCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const lang = language === 'jp' || language === 'Japanese' ? 'jp' : 'en'
  const prefix = lang === 'jp' ? '550' : '569'
  let series = ''
  if (/^OP\d{2}$/.test(normalized)) series = prefix + '1' + normalized.slice(2)
  else if (/^EB\d{2}$/.test(normalized)) series = prefix + '2' + normalized.slice(2)
  else if (/^PRB\d{2}$/.test(normalized)) series = prefix + '3' + normalized.slice(3)
  else if (/^ST\d{2}$/.test(normalized)) series = prefix + '0' + normalized.slice(2)
  else if (normalized === 'P' || normalized === 'PROMO') series = prefix + '901'
  if (!series) return ''
  const host = lang === 'jp' ? 'www.onepiece-cardgame.com' : 'en.onepiece-cardgame.com'
  return 'https://' + host + '/cardlist/?series=' + series
}
