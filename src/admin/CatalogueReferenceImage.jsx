import { useEffect, useState } from 'react'
import { getRememberedCardImageForPrinting } from './cardRecognitionMemory'

export default function CatalogueReferenceImage({ match, className = '' }) {
  const candidates = [...new Set([match?.imageUrl, match?.fallbackImageUrl].filter(Boolean))]
  const [imageIndex, setImageIndex] = useState(0)
  const [useMemory, setUseMemory] = useState(candidates.length === 0)
  const [failed, setFailed] = useState(false)
  const [rememberedUrl, setRememberedUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setRememberedUrl('')
    setImageIndex(0)
    setFailed(false)
    setUseMemory(candidates.length === 0)

    if (!match?.id) return undefined
    getRememberedCardImageForPrinting(match.id)
      .then((blob) => {
        if (!blob || cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setRememberedUrl(objectUrl)
      })
      .catch(() => {
        // A missing local database must never prevent catalogue lookup.
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [match?.id, match?.imageUrl, match?.fallbackImageUrl])

  const imageUrl = useMemory ? rememberedUrl : candidates[imageIndex]
  if (imageUrl && !failed) {
    return (
      <img
        className={className}
        src={imageUrl}
        alt={(match?.name || 'One Piece card') + ' · ' + (match?.language || 'reference') + (useMemory ? ' · saved reference photo' : ' reference image')}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!useMemory && imageIndex + 1 < candidates.length) {
            setImageIndex((current) => current + 1)
          } else if (!useMemory) {
            setUseMemory(true)
          } else {
            setFailed(true)
          }
        }}
      />
    )
  }

  if (useMemory && !rememberedUrl && !failed) {
    return <div className={'catalogue-reference-empty ' + className} role="img" aria-label={'Loading saved reference image for ' + (match?.cardNumber || 'this card')}><span>Checking saved card images…</span><small>{match?.language || 'Card reference'}</small></div>
  }

  return <div className={'catalogue-reference-empty ' + className} role="img" aria-label={'No reference image available for ' + (match?.cardNumber || 'this card')}><span>Image unavailable</span><small>{match?.language || 'Card reference'}</small></div>
}
