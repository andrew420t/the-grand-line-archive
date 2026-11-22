import { useState } from 'react'

export default function CatalogueReferenceImage({ match, className = '' }) {
  const candidates = [...new Set([match?.imageUrl, match?.fallbackImageUrl].filter(Boolean))]
  const [imageIndex, setImageIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const imageUrl = candidates[imageIndex]
  if (!imageUrl || failed) {
    return <div className={'catalogue-reference-empty ' + className} role="img" aria-label={'No reference image available for ' + (match?.cardNumber || 'this card')}><span>Image unavailable</span><small>{match?.language || 'Card reference'}</small></div>
  }
  return <img className={className} src={imageUrl} alt={(match?.name || 'One Piece card') + ' · ' + (match?.language || 'reference') + ' reference image'} loading="lazy" referrerPolicy="no-referrer" onError={() => { if (imageIndex + 1 < candidates.length) setImageIndex((current) => current + 1); else setFailed(true) }} />
}