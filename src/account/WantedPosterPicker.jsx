import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import WantedPosterAvatar from './WantedPosterAvatar'
import { WANTED_POSTER_AVATARS, WANTED_POSTER_GROUPS } from './wantedPosterAvatars'

export default function WantedPosterPicker({ value, onChange }) {
  const [group, setGroup] = useState('All posters')
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return WANTED_POSTER_AVATARS.filter((avatar) =>
      (group === 'All posters' || avatar.group === group || avatar.groups?.includes(group)) &&
      (!needle || avatar.name.toLowerCase().includes(needle) || avatar.group.toLowerCase().includes(needle)),
    )
  }, [group, search])

  return (
    <section className="wanted-picker">
      <div className="wanted-picker__heading"><div><p className="eyebrow">CUSTOMIZE ACCOUNT</p><h3>Choose your wanted poster.</h3><p>Your poster becomes your account icon across the Archive.</p></div><span className="wanted-picker__count">{filtered.length} posters</span></div>
      <label className="search-field wanted-picker__search"><Search size={15} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Luffy, Law, Akainu…" /></label>
      <div className="wanted-picker__filters" role="group" aria-label="Filter wanted posters">
        {WANTED_POSTER_GROUPS.map((item) => <button key={item} type="button" className={group === item ? 'is-active' : ''} onClick={() => setGroup(item)}>{item}</button>)}
      </div>
      <div className="wanted-picker__grid">
        {filtered.map((avatar) => (
          <button
            className={value === avatar.key ? 'wanted-picker__option is-selected' : 'wanted-picker__option'}
            type="button"
            key={avatar.key}
            aria-pressed={value === avatar.key}
            onClick={() => onChange(avatar.key)}
          >
            <WantedPosterAvatar avatarKey={avatar.key} size="poster" />
            <span className="wanted-picker__name">{avatar.name}</span>
            <span className="wanted-picker__group">{avatar.group}</span>
            {value === avatar.key && <span className="wanted-picker__check"><Check size={13} /></span>}
          </button>
        ))}
      </div>
      <p className="wanted-picker__note">A curated set of Straw Hat, Warlord, Yonko and Marine poster designs. Some character poster artwork is served from external image hosts; the named fallback remains available if a source image is unavailable.</p>
    </section>
  )
}
