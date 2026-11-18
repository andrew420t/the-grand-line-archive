const CATALOGUE_URL =
  'https://raw.githubusercontent.com/Kuroro1990/OPTCG/main/english/index/cards_by_id.json'

let cataloguePromise

const normalizeCardNumber = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .trim()

const baseCardNumber = (value) =>
  normalizeCardNumber(value).match(/^(?:(?:OP|EB|ST|PRB)\d{1,2}|P)-\d{3}/)?.[0] || ''

export async function findCatalogueMatches(cardNumber) {
  const requestedNumber = baseCardNumber(cardNumber)
  if (!requestedNumber) return []

  if (!cataloguePromise) {
    cataloguePromise = fetch(CATALOGUE_URL, {
      headers: { Accept: 'application/json' },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Card catalogue unavailable (HTTP ${response.status}).`)
      }
      const data = await response.json()
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Card catalogue returned an unexpected format.')
      }
      return data
    }).catch((error) => {
      cataloguePromise = null
      throw error
    })
  }

  const catalogue = await cataloguePromise
  return Object.entries(catalogue)
    .filter(([id, card]) => {
      const candidate = baseCardNumber(card?.card_id || id)
      return candidate === requestedNumber
    })
    .map(([id, card]) => ({
      id,
      cardNumber: card.card_id || id,
      name: card.name || '',
      colors: Array.isArray(card.colors) ? card.colors.join(' / ') : '',
      cost: card.cost == null ? '' : String(card.cost),
      category: card.category || '',
      power: card.power == null ? '' : String(card.power),
    }))
    .sort((a, b) => a.cardNumber.localeCompare(b.cardNumber))
}
