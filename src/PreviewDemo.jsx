import { useMemo, useState } from 'react'
import { Anchor, ArrowLeft, ArrowRight, LockKeyhole, ScanLine, ShieldCheck } from 'lucide-react'
import CardScanner from './admin/CardScanner'
import { CARD_FIELDS } from './admin/cardParser'

const SAMPLE_CARDS = [
  { number: 'OP01-001', name: 'Roronoa Zoro', set: 'OP-01 · Romance Dawn', rarity: 'Leader', language: 'English' },
  { number: 'OP01-016', name: 'Nami', set: 'OP-01 · Romance Dawn', rarity: 'Rare', language: 'English' },
  { number: 'OP02-013', name: 'Portgas.D.Ace', set: 'OP-02 · Paramount War', rarity: 'Super Rare', language: 'Japanese' },
  { number: 'OP05-001', name: 'Sabo', set: 'OP-05 · Awakening of the New Era', rarity: 'Leader', language: 'English' },
  { number: 'EB01-001', name: 'Kouzuki Oden', set: 'EB-01 · Memorial Collection', rarity: 'Leader', language: 'Japanese' },
  { number: 'PRB01-001', name: 'Monkey.D.Luffy', set: 'PRB-01 · The Best', rarity: 'Leader', language: 'English' },
]

const emptyFields = () => Object.fromEntries(CARD_FIELDS.map(([key]) => [key, { value: '', confidence: 0, needsReview: true }]))

export default function PreviewDemo() {
  const [page, setPage] = useState('shop')
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState([])
  const [fields, setFields] = useState(emptyFields)
  const [rawText, setRawText] = useState('')
  const [notice, setNotice] = useState('')
  const cards = useMemo(() => SAMPLE_CARDS.filter((card) => [card.name, card.number, card.set, card.rarity, card.language].join(' ').toLowerCase().includes(query.toLowerCase())), [query])

  const addPhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
      return [{ id: 'preview-front', role: 'front', file, previewUrl: URL.createObjectURL(file) }]
    })
    setNotice('Photo added locally. It has not been uploaded.')
  }

  return (
    <div className="app-shell">
      <div className="connection-banner" role="status">
        <span><ShieldCheck size={16} /> PREVIEW DEMO · Isolated from the live shop and database. Changes are not saved.</span>
      </div>
      <header className="site-header page-width">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('shop') }}>
          <span className="brand__mark"><Anchor size={22} /></span>
          <span className="brand__name"><strong>GRAND LINE</strong><small>ARCHIVE · TCG</small></span>
        </a>
        <nav className="header-actions">
          <button className="button button--outline" onClick={() => setPage('shop')}>Preview shop</button>
          <button className="button button--gold" onClick={() => setPage('admin')}>Captain's Quarters</button>
        </nav>
      </header>

      {page === 'shop' ? (
        <main className="page-width shop-page">
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">ONE PIECE TCG · PREVIEW ENVIRONMENT</p>
              <h1>Cards worth<br /><em>a bounty.</em></h1>
              <p className="hero-description">A safe preview of the Grand Line Archive. Explore sample catalogue entries and test the layout without touching live inventory.</p>
              <div className="hero-stats"><div><strong>{SAMPLE_CARDS.length}</strong><span>Sample cards</span></div><div><strong>25</strong><span>Set families in scope</span></div><div><strong>GIBRALTAR</strong><span>Local pickup concept</span></div></div>
            </div>
            <div className="hero-art"><div className="hero-art__frame"><div className="hero-art__image hero-art__placeholder"><Anchor size={68} /></div><div className="hero-art__caption"><span className="eyebrow">PREVIEW COLLECTION</span><strong>Sample catalogue</strong><span>Not for sale</span></div></div></div>
          </section>
          <section className="content-section">
            <div className="section-heading"><div><p className="eyebrow">THE ARCHIVE</p><h2>Browse sample cards.</h2></div></div>
            <label className="search-field shop-search-field"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, card number, set or rarity…" /></label>
            <div className="product-grid shop-grid">
              {cards.map((card) => <article className="product-card" key={card.number}>
                <div className="product-card__photo"><div className="product-image product-image--empty"><Anchor size={27} /><span>Sample reference</span></div><span className="product-card__rarity">{card.rarity}</span></div>
                <div className="product-card__body"><p className="eyebrow product-card__set">{card.set}</p><h3>{card.name}</h3><span className="product-card__number">{card.number}</span><div className="product-card__meta"><strong>{card.language}</strong><span className="stock">Demo only</span></div></div>
              </article>)}
            </div>
            {!cards.length && <p>No sample cards match that search.</p>}
          </section>
        </main>
      ) : (
        <main className="page-width admin-dashboard">
          <button className="text-link" onClick={() => setPage('shop')}><ArrowLeft size={15} /> Return to preview shop</button>
          <div className="admin-dashboard__heading"><div><p className="eyebrow"><LockKeyhole size={14} /> AUTHORISED PERSONNEL · DEMO</p><h1>Captain's <em>Quarters.</em></h1><p>Demo access only — no administrator account or database session is created.</p></div><span className="admin-role"><ShieldCheck size={14} /> Read-only sandbox</span></div>
          <section className="admin-view">
            <div className="admin-view-heading"><div><p className="eyebrow">SCANNER WORKBENCH</p><h2>Test a card scan.</h2><p>Upload a card photo below. OCR and catalogue lookup run in your browser; scan memory and database writes are disabled because this preview has no Supabase connection.</p></div></div>
            <label className="form-field"><span>Card front photograph</span><input type="file" accept="image/*" onChange={addPhoto} /></label>
            {photos[0]?.previewUrl && <img src={photos[0].previewUrl} alt="Local preview of uploaded card" style={{ maxWidth: '320px', width: '100%', borderRadius: '12px' }} />}
            {notice && <p role="status">{notice}</p>}
            <CardScanner photos={photos} fields={fields} setFields={setFields} rawText={rawText} setRawText={setRawText} onContinue={() => setNotice('Scan results are ready for review. Saving to inventory is disabled in this safe demo.')} />
            <div className="admin-security-note"><ShieldCheck size={16} /><span>Demo mode cannot create products, edit stock, upload images, change orders, or modify website settings.</span></div>
          </section>
        </main>
      )}
      <footer className="site-footer"><div className="footer-main page-width"><p>Thoughtfully collected. Carefully tested.<br />Preview environment · Gibraltar local pickup concept.</p><button className="text-link" onClick={() => setPage('shop')}>Return to archive <ArrowRight size={14} /></button></div></footer>
    </div>
  )
}
