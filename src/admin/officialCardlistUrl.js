/**
 * Resolve the official Bandai card-list page for standard and combined sets.
 * English EB-04 is split across OP14-EB04 and OP15-EB04; route by card number.
 * DON!! cards link to Bandai's separate DON!! PDF.
 */
export function getOfficialCardlistUrl(setCode, language = 'en', isDon = false, cardNumber = '') {
  const normalized = String(setCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const number = String(cardNumber || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (isDon) return 'https://www.onepiece-cardgame.com/pdf/don-cardlist.pdf'
  const lang = language === 'jp' || language === 'Japanese' ? 'jp' : 'en'
  const host = lang === 'jp' ? 'www.onepiece-cardgame.com' : 'en.onepiece-cardgame.com'
  const prefix = lang === 'jp' ? '550' : '569'

  // EB-04 has a standalone Japanese series, but English EB04-numbered cards
  // are split across the official OP14 and OP15 combined-product lists.
  if (normalized === 'EB04' && lang === 'en' && !number) return ''
  if (/^EB04-\d{3}/.test(number)) {
    if (lang === 'jp') return 'https://' + host + '/cardlist/?series=550204'
    const cardIndex = Number(number.match(/^EB04-(\d{3})/)?.[1] || 0)
    const series = (cardIndex >= 11 && cardIndex <= 41) ? '569114' : '569115'
    if (cardIndex < 1 || cardIndex > 61) return ''
    return 'https://' + host + '/cardlist/?series=' + series
  }

  let series = ''
  if (normalized === 'OP14EB04') series = prefix + '114'
  else if (normalized === 'OP15EB04') series = prefix + '115'
  else if (/^OP\d{2}$/.test(normalized)) series = prefix + '1' + normalized.slice(2)
  else if (/^EB\d{2}$/.test(normalized)) series = prefix + '2' + normalized.slice(2)
  else if (/^PRB\d{2}$/.test(normalized)) series = prefix + '3' + normalized.slice(3)
  else if (/^ST\d{2}$/.test(normalized)) series = prefix + '0' + normalized.slice(2)
  else if (normalized === 'P' || normalized === 'PROMO') series = prefix + '901'
  else if (normalized === 'OTHER' || normalized === 'OTHERPRODUCT' || normalized === 'OTHERPRODUCTCARD') series = prefix + '801'
  if (!series) return ''
  return 'https://' + host + '/cardlist/?series=' + series
}
