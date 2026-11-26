import { useEffect, useState } from 'react'
import { getRememberedCardImageForPrinting } from './cardRecognitionMemory'

export default function CatalogueReferenceImage({ match, className = '' }) {
  const candidates = [...new Set([
    ...(Array.isArray(match?.imageUrls) ? match.imageUrls : []),
    match?.imageUrl,
    match?.fallbackImageUrl,
  ].filter(Boolean))]
  const [imageIndex, setImageIndex] = useState(0)
  const [useMemory, setUseMemory] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rememberedUrl, setRememberedUrl] = useState('')
  const [memoryChecked, setMemoryChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setRememberedUrl('')
    setMemoryChecked(false)
    setImageIndex(0)
    setFailed(false)
    setUseMemory(candidates.length === 0)

    if (!match?.id) {
      setMemoryChecked(true)
      return undefined
    }
    getRememberedCardImageForPrinting(match.id)
      .then((blob) => {
        if (cancelled) return
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          setRememberedUrl(objectUrl)
        }
        setMemoryChecked(true)
      })
      .catch(() => {
        if (!cancelled) setMemoryChecked(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [match?.id, match?.imageUrl, match?.fallbackImageUrl, JSON.stringify(match?.imageUrls || [])])

  const currentCandidate = useMemory ? rememberedUrl : candidates[imageIndex]
  if (currentCandidate && !failed) {
    return (
      <img
        className={className}
        src={currentCandidate}
        alt={(match?.name || 'One Piece card') + ' · ' + (match?.language || 'reference') + (useMemory ? ' · saved reference photo' : ' reference image')}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => {
          if (!useMemory && imageIndex + 1 < candidates.length) {
            setImageIndex((current) => current + 1)
          } else if (!useMemory && rememberedUrl) {
            setUseMemory(true)
          } else {
            setFailed(true)
          }
        }}
      />
    )
  }

  if (!memoryChecked && !failed) {
    return <div className={'catalogue-reference-empty ' + className} role="img" aria-label={'Checking saved reference image for ' + (match?.cardNumber || 'this card')}><span>Checking saved card images…</span><small>{match?.language || 'Card reference'}</small></div>
  }

  return <div className={'catalogue-reference-empty ' + className} role="img" aria-label={'No reference image available for ' + (match?.cardNumber || 'this card')}><span>Image unavailable</span><small>{match?.language || 'Card reference'}</small></div>
}
