import CatalogueReferenceImage from './CatalogueReferenceImage'
import { collectrSearchUrl } from './cardCatalogue'

export default function CatalogueMatchCard({ match, onUseDetails, useLabel = 'Use details', disabled = false, compact = false }) {
  return (
    <article className={compact ? 'catalogue-match-card catalogue-match-card--compact' : 'catalogue-match-card'} key={match.id}>
      <CatalogueReferenceImage match={match} className="catalogue-match-card__image" />
      <div className="catalogue-match-card__details">
        <strong>{match.officialImageOnly ? 'Official card image found' : match.name || 'Card name unavailable'}</strong>
        <span><b className="catalogue-language-label">{match.language || 'Language unknown'}</b> · {match.cardNumber || 'Card number unavailable'} · {match.setCode || 'Promo / set not listed'} · {match.rarity || 'Rarity not listed'} · {match.variant || 'Base'}</span>
        {match.officialImageOnly && <small>Image-only fallback: official base artwork is available, but card details and exact printing/finish are not in the local catalogue. Verify the card on Bandai before saving.</small>}
        <small>{match.colors || 'Colour not listed'} · {match.category || 'Card'} · {match.power ? match.power + ' power' : 'No power'} · {match.cost !== '' ? match.cost + ' cost' : 'No cost'}</small>
        {match.setName && <small>{match.setName}</small>}
        <div className="catalogue-match-card__actions">
          {match.officialCardlistUrl && <a className="button button--outline" href={match.officialCardlistUrl} target="_blank" rel="noopener noreferrer">Official Bandai list ↗</a>}
          <button className="button button--outline" type="button" onClick={() => window.open(collectrSearchUrl(match), '_blank', 'noopener,noreferrer')}>Open on Collectr ↗</button>
          {onUseDetails && <button className="button button--gold" type="button" disabled={disabled} onClick={onUseDetails}>{match.officialImageOnly ? 'Use image reference' : useLabel}</button>}
        </div>
      </div>
    </article>
  )
}
