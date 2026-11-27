import { useState } from 'react'
import { Skull } from 'lucide-react'
import { getWantedPosterAvatar } from './wantedPosterAvatars'

export default function WantedPosterAvatar({ avatarKey, size = 'medium', className = '' }) {
  const avatar = getWantedPosterAvatar(avatarKey)
  const [failed, setFailed] = useState(false)
  return (
    <span className={`wanted-avatar wanted-avatar--${size} ${className}`} title={avatar.name}>
      {!failed && avatar.imageUrl
        ? <img src={avatar.imageUrl} alt={`${avatar.name} wanted poster`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : <span className="wanted-avatar__fallback"><Skull size={size === 'small' ? 16 : 22} /><small>{avatar.name}</small></span>}
    </span>
  )
}
