import { useMemo, useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ChevronLeft, ChevronRight, Clapperboard,
  Film, Heart, Info, Menu, Play, Search, Star,
  TrendingUp, Tv, X, Clock, RotateCcw,
} from 'lucide-react'
import { MOVIE_GENRES, SERIES_GENRES, type Content } from './data'
import { useContent } from './useContent'
import DetailPage from './DetailPage'
import Player from './Player'
import './styles.css'

// ── Resume helpers ────────────────────────────────────────────
function getResume(id: string): number {
  try { return JSON.parse(localStorage.getItem('cf_resume') || '{}')[id] ?? 0 } catch { return 0 }
}
function clearResume(id: string) {
  try {
    const d = JSON.parse(localStorage.getItem('cf_resume') || '{}')
    delete d[id]; localStorage.setItem('cf_resume', JSON.stringify(d))
  } catch { /* noop */ }
}
function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`
}

// ── Continue Watching Card ────────────────────────────────────
function CWCard({ item, onSelect, onRemove }: { item: Content; onSelect: (m: Content) => void; onRemove: (id: string) => void }) {
  const resume = getResume(item.id)
  const pct = Math.min((resume / 7200) * 100, 100)
  return (
    <div className="cw-card">
      <button className="cw-poster" onClick={() => onSelect(item)} aria-label={`Resume ${item.title}`}>
        <img src={item.backdrop || item.image} alt="" loading="lazy" />
        <div className="cw-overlay">
          <div className="cw-play"><Play size={22} fill="currentColor" /></div>
          <span className="cw-time"><Clock size={10} /> {fmt(resume)}</span>
        </div>
        <div className="cw-bar"><i style={{ width: `${pct}%` }} /></div>
        {item.type === 'series' && <span className="card-type-tag"><Tv size={9} /> SERIES</span>}
      </button>
      <div className="cw-info">
        <strong>{item.title}</strong>
        <span>{item.genre} · {item.year}</span>
      </div>
      <button className="cw-remove" onClick={() => onRemove(item.id)} title="Remove from history"><X size={12} /></button>
    </div>
  )
}

// ── Portrait Card ─────────────────────────────────────────────
function Card({ item, onSelect }: { item: Content; onSelect: (m: Content) => void }) {
  const resume = getResume(item.id)
  const pct = resume > 5 ? Math.min((resume / 7200) * 100, 100) : 0
  return (
    <button className="card" onClick={() => onSelect(item)} aria-label={`Open ${item.title}`}>
      <div className="card-poster">
        <img src={item.image} alt="" loading="lazy" />
        {item.badge && <span className="card-badge">{item.badge}</span>}
        {item.type === 'series' && <span className="card-type-tag"><Tv size={9} /> SERIES</span>}
        <div className="card-hover-overlay">
          <span className="card-play-btn"><Play size={16} fill="currentColor" /></span>
          <div className="card-hover-meta">
            {item.imdb && <span className="imdb-pill"><Star size={9} fill="#f5c518" color="#f5c518" /> {item.imdb}</span>}
            <span className="card-rating-pill">{item.rating}</span>
          </div>
        </div>
        {pct > 0 && <div className="card-progress"><i style={{ width: `${pct}%` }} /></div>}
      </div>
      <div className="card-info">
        <strong>{item.title}</strong>
        <span>{item.year} · {item.duration}{item.seasons ? ` · S${item.seasons}` : ''}</span>
      </div>
    </button>
  )
}

// ── Row ───────────────────────────────────────────────────────
function Row({ title, items, onSelect, icon }: {
  title: string; items: Content[]
  onSelect: (m: Content) => void; icon?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 340, behavior: 'smooth' })
  if (!items.length) return null
  return (
    <div className="row">
      <div className="row-header">
        {icon && <span className="row-icon">{icon}</span>}
        <h3>{title}</h3>
      </div>
      <div className="row-track-wrap">
        <button className="row-arrow left"  onClick={() => scroll(-1)} aria-label="Scroll left"><ChevronLeft  size={20} /></button>
        <div className="row-track" ref={ref}>
          {items.map(m => <Card key={m.id} item={m} onSelect={onSelect} />)}
        </div>
        <button className="row-arrow right" onClick={() => scroll(1)}  aria-label="Scroll right"><ChevronRight size={20} /></button>
      </div>
    </div>
  )
}

// ── Rotating Hero Banner ──────────────────────────────────────
function HeroBanner({ items, onPlay, onInfo }: {
  items: Content[]; onPlay: (m: Content) => void; onInfo: (m: Content) => void
}) {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % items.length)
        setFade(true)
      }, 400)
    }, 8000)
    return () => clearInterval(t)
  }, [items.length])

  const item = items[idx] ?? items[0]
  if (!item) return null

  return (
    <div className={`hero hero-fade${fade ? ' visible' : ''}`} style={{ backgroundImage: `url(${item.backdrop || item.image})` }}>
      <div className="hero-scrim" />
      <div className="hero-content">
        {item.badge && <span className="hero-badge">{item.badge}</span>}
        <div className="hero-type-row">
          {item.type === 'series' ? <><Tv size={12} /> TV SERIES</> : <><Film size={12} /> MOVIE</>}
        </div>
        <h1 className="hero-title">{item.title}</h1>
        <div className="hero-stats">
          <span>{item.year}</span>
          <span className="pill">{item.rating}</span>
          <span>{item.duration}</span>
          {item.imdb && <span className="imdb-pill"><Star size={11} fill="#f5c518" color="#f5c518" /> {item.imdb}</span>}
          {item.genre && <span className="hero-genre-pill">{item.genre}</span>}
        </div>
        <p className="hero-desc">{item.description}</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => onPlay(item)}>
            <Play size={16} fill="currentColor" />
            {getResume(item.id) > 5 ? 'Resume' : 'Play'}
          </button>
          <button className="btn-secondary" onClick={() => onInfo(item)}><Info size={16} /> More Info</button>
        </div>
      </div>

      {/* dot indicators */}
      {items.length > 1 && (
        <div className="hero-dots">
          {items.slice(0, 8).map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === idx ? ' active' : ''}`}
              onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true) }, 400) }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────
type Page = 'home' | 'movies' | 'series' | 'watchlist'

function App() {
  const { content: ALL_CONTENT, loading: contentLoading } = useContent()
  const [page,        setPage]        = useState<Page>('home')
  const [detailItem,  setDetailItem]  = useState<Content | null>(null)
  const [playerItem,  setPlayerItem]  = useState<Content | null>(null)
  const [myList,      setMyList]      = useState<string[]>([])
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [searchVal,   setSearchVal]   = useState('')
  const [movieGenre,  setMovieGenre]  = useState('All')
  const [seriesGenre, setSeriesGenre] = useState('All')
  const [, forceUpdate]               = useState(0)

  const toggleList = (id: string) =>
    setMyList(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const navigate = (p: Page) => {
    setPage(p); setMenuOpen(false); setDetailItem(null); setSearchVal('')
  }

  const openDetail = (item: Content) => { setDetailItem(item); setPlayerItem(null) }
  const openPlayer = (item: Content) => { setPlayerItem(item) }

  const removeFromHistory = (id: string) => { clearResume(id); forceUpdate(n => n + 1) }

  const movies    = ALL_CONTENT.filter(c => c.type === 'movie')
  const series    = ALL_CONTENT.filter(c => c.type === 'series')
  const watchlist = ALL_CONTENT.filter(c => myList.includes(c.id))
  const resumed   = ALL_CONTENT.filter(c => getResume(c.id) > 5)
  // show recently added as "continue watching" placeholders if nothing watched yet
  const cwItems   = resumed.length > 0 ? resumed : ALL_CONTENT.slice(0, 6)

  const filteredMovies = useMemo(
    () => movies.filter(m => movieGenre  === 'All' || m.genre === movieGenre),  [movieGenre, movies])
  const filteredSeries = useMemo(
    () => series.filter(s => seriesGenre === 'All' || s.genre === seriesGenre), [seriesGenre, series])

  const searchResults = useMemo(() =>
    searchVal.trim().length > 1
      ? ALL_CONTENT.filter(c =>
          c.title.toLowerCase().includes(searchVal.toLowerCase()) ||
          c.genre.toLowerCase().includes(searchVal.toLowerCase()) ||
          (c.cast ?? []).some(a => a.toLowerCase().includes(searchVal.toLowerCase()))
        )
      : [],
    [searchVal, ALL_CONTENT]
  )

  // full-screen player
  if (playerItem) return <Player item={playerItem} onClose={() => setPlayerItem(null)} />

  // detail page
  if (detailItem) {
    return (
      <DetailPage
        item={detailItem}
        allContent={ALL_CONTENT}
        myList={myList}
        onToggleList={toggleList}
        onBack={() => setDetailItem(null)}
        onSelect={openDetail}
        onNavigate={(p) => { setDetailItem(null); navigate(p as Page) }}
      />
    )
  }

  return (
    <div className="shell">

      {/* ── NAVBAR ── */}
      <header className="navbar">
        <button className="brand" onClick={() => navigate('home')}>
          <span className="brand-mark">C</span>
          <span>CINE<em>FLIX</em></span>
        </button>

        <nav className={`main-nav${menuOpen ? ' open' : ''}`}>
          {(['home','movies','series','watchlist'] as Page[]).map(p => (
            <button key={p} className={page === p ? 'active' : ''} onClick={() => navigate(p)}>
              {p === 'home'      && 'Home'}
              {p === 'movies'    && 'Movies'}
              {p === 'series'    && 'TV Series'}
              {p === 'watchlist' && `Watchlist${myList.length ? ` (${myList.length})` : ''}`}
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <div className="nav-search">
            <Search size={15} />
            <input
              value={searchVal} onChange={e => setSearchVal(e.target.value)}
              placeholder="Search titles, genres, cast…" aria-label="Search"
            />
            {searchVal && <button onClick={() => setSearchVal('')} className="nav-search-clear"><X size={14} /></button>}
          </div>
          <button className="icon-btn menu-toggle" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main>

        {/* ── SEARCH ── */}
        {searchVal.length > 1 && (
          <section className="search-results-page">
            <h2>Results for "<em>{searchVal}</em>"</h2>
            {searchResults.length
              ? <div className="grid padded">{searchResults.map(m => <Card key={m.id} item={m} onSelect={openDetail} />)}</div>
              : <div className="empty-state"><Film size={32} /><p>Nothing found.</p></div>
            }
          </section>
        )}

        {/* ── HOME ── */}
        {searchVal.length <= 1 && page === 'home' && contentLoading && (
          <div className="content-loading"><div className="loading-spinner" /><p>Loading…</p></div>
        )}
        {searchVal.length <= 1 && page === 'home' && !contentLoading && ALL_CONTENT.length === 0 && (
          <div className="content-loading"><Film size={40} /><p>No content published yet.</p></div>
        )}
        {searchVal.length <= 1 && page === 'home' && !contentLoading && ALL_CONTENT.length > 0 && (
          <>
            <HeroBanner items={ALL_CONTENT.slice(0, 8)} onPlay={openPlayer} onInfo={openDetail} />
            <div className="rows-area">

              {/* Continue Watching */}
              <div className="row">
                <div className="row-header">
                  <span className="row-icon"><RotateCcw size={15} /></span>
                  <h3>{resumed.length > 0 ? 'Continue Watching' : 'Recently Added'}</h3>
                </div>
                <div className="cw-row">
                  {cwItems.map(item => (
                    <CWCard key={item.id} item={item} onSelect={openDetail} onRemove={removeFromHistory} />
                  ))}
                </div>
              </div>

              <Row title="Trending Now"       icon={<TrendingUp   size={16} />} items={ALL_CONTENT.slice(0, 10)}                               onSelect={openDetail} />
              <Row title="CINEFLIX Originals" icon={<Clapperboard size={16} />} items={ALL_CONTENT.filter(c => c.badge === 'CINEFLIX ORIGINAL')} onSelect={openDetail} />
              <Row title="Top Movies"         icon={<Film         size={16} />} items={movies}                                                 onSelect={openDetail} />
              <Row title="Popular Series"     icon={<Tv           size={16} />} items={series}                                                 onSelect={openDetail} />
              <Row title="New Releases"       icon={<Star         size={16} />} items={ALL_CONTENT.filter(c => c.badge === 'NEW')}             onSelect={openDetail} />
            </div>
          </>
        )}

        {/* ── MOVIES ── */}
        {searchVal.length <= 1 && page === 'movies' && (
          <section className="browse-page">
            <div className="page-hero movies-hero">
              <div className="page-hero-text">
                <p className="eyebrow"><Film size={14} /> MOVIES</p>
                <h1>Watch the best films,<br />all in one place.</h1>
              </div>
            </div>
            <div className="genre-bar">
              {MOVIE_GENRES.map(g => (
                <button key={g} className={movieGenre === g ? 'active' : ''} onClick={() => setMovieGenre(g)}>{g}</button>
              ))}
            </div>
            {filteredMovies.length
              ? <div className="grid padded">{filteredMovies.map(m => <Card key={m.id} item={m} onSelect={openDetail} />)}</div>
              : <div className="empty-state"><Film size={32} /><p>No movies in this genre.</p></div>
            }
          </section>
        )}

        {/* ── SERIES ── */}
        {searchVal.length <= 1 && page === 'series' && (
          <section className="browse-page">
            <div className="page-hero series-hero">
              <div className="page-hero-text">
                <p className="eyebrow"><Tv size={14} /> TV SERIES</p>
                <h1>Binge-worthy series,<br />always on.</h1>
              </div>
            </div>
            <div className="genre-bar">
              {SERIES_GENRES.map(g => (
                <button key={g} className={seriesGenre === g ? 'active' : ''} onClick={() => setSeriesGenre(g)}>{g}</button>
              ))}
            </div>
            <div className="grid padded">
              {filteredSeries.map(s => <Card key={s.id} item={s} onSelect={openDetail} />)}
            </div>
          </section>
        )}

        {/* ── WATCHLIST ── */}
        {searchVal.length <= 1 && page === 'watchlist' && (
          <section className="browse-page">
            <div className="page-hero watchlist-hero">
              <div className="page-hero-text">
                <p className="eyebrow"><Heart size={14} /> MY WATCHLIST</p>
                <h1>Your saved titles.</h1>
              </div>
            </div>
            {watchlist.length
              ? <div className="grid padded">{watchlist.map(m => <Card key={m.id} item={m} onSelect={openDetail} />)}</div>
              : (
                <div className="empty-state full">
                  <Heart size={36} /><p>Nothing saved yet.</p>
                  <button onClick={() => navigate('home')}>Browse content</button>
                </div>
              )
            }
          </section>
        )}
      </main>

      <footer>
        <button className="brand footer-brand" onClick={() => navigate('home')}>
          <span className="brand-mark">C</span><span>CINE<em>FLIX</em></span>
        </button>
        <p>World of entertainment.</p>
        <span className="footer-copy">© 2026 Cineflix. All rights reserved.</span>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
