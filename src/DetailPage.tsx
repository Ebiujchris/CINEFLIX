import { useState } from 'react'
import {
  Play, Plus, Check, Star, X,
  Tv, Film, Calendar, Clock, User, Tag
} from 'lucide-react'
import type { Content } from './data'
import { toYouTubeEmbedUrl, withAutoplay } from './videoUrls'
import Player from './Player'
import EpisodeRail from './EpisodeRail'

type Props = {
  item: Content
  allContent: Content[]
  myList: string[]
  onToggleList: (id: string) => void
  onBack: () => void
  onSelect: (item: Content) => void
  onNavigate: (page: 'home' | 'movies' | 'series' | 'asian' | 'watchlist') => void
  onRequireAccount: () => void
  onProgress: (item: Content, position: number, duration: number) => void
}

export default function DetailPage({ item, allContent, myList, onToggleList, onBack, onSelect, onNavigate, onRequireAccount, onProgress }: Props) {
  const [showPlayer,  setShowPlayer]  = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [activeEpisode, setActiveEpisode] = useState<Content | null>(null)
  const [activeSeason, setActiveSeason] = useState(item.seasonsData?.[0]?.seasonNumber || 1)
  const inList = myList.includes(item.id)

  const itemGenres = item.genre.split(',').map(genre => genre.trim())
  const similar = allContent.filter(c => c.id !== item.id && c.genre.split(',').some(genre => itemGenres.includes(genre.trim()))).slice(0, 8)

  if (showPlayer) {
    const playingItem = activeEpisode || item
    return (
      <div className="watch-page">
        <div className="watch-stage">
          <Player item={playingItem} onProgress={(position, duration) => onProgress(playingItem, position, duration)} onClose={() => { setShowPlayer(false); setActiveEpisode(null) }} />
        </div>
        {item.type === 'series' && item.seasonsData?.length ? (
          <EpisodeRail series={item} currentEpisodeId={activeEpisode?.id} onPlay={episode => setActiveEpisode(episode)} />
        ) : similar.length > 0 && (
          <section className="watch-related">
            <div className="watch-related-heading">
              <div><p className="eyebrow">KEEP WATCHING</p><h2>More like this</h2></div>
              <span>Selected for you</span>
            </div>
            <div className="grid watch-related-grid">
              {similar.map(s => (
                <button key={s.id} className="card" onClick={() => { setShowPlayer(false); onSelect(s) }} aria-label={`Open ${s.title}`}>
                  <div className="card-poster"><img src={s.image} alt="" loading="lazy" /></div>
                  <div className="card-info"><strong>{s.title}</strong><span>{s.year} · {s.duration}</span></div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="detail-page">
      <header className="detail-navbar">
        <button className="brand" onClick={onBack} aria-label="Return to home">
          <span className="brand-mark">C</span>
          <span>CINE<em>FLIX</em></span>
        </button>
        <nav className="detail-main-nav" aria-label="Main navigation">
          <button onClick={() => onNavigate('home')}>Home</button>
          <button onClick={() => onNavigate('movies')}>Movies</button>
          <button onClick={() => onNavigate('series')}>TV Series</button>
          <button onClick={() => onNavigate('asian')}>Asian Drama</button>
          <button onClick={() => onNavigate('watchlist')}>Watchlist</button>
        </nav>
        <button className="detail-nav-close" onClick={onBack} aria-label="Close details">
          <X size={19} /> <span>Close</span>
        </button>
      </header>

      {/* backdrop */}
      <div className="detail-backdrop" style={{ backgroundImage: `url(${item.backdrop})` }}>
        <div className="detail-backdrop-scrim" />
      </div>

      {/* hero area */}
      <div className="detail-hero">
        <div className="detail-poster-col">
          <div className="detail-poster">
            <img src={item.image} alt={item.title} />
            {item.badge && <span className="detail-badge">{item.badge}</span>}
          </div>
        </div>

        <div className="detail-info-col">
          <div className="detail-tags-row">
            {item.type === 'series'
              ? <span className="type-chip series-chip"><Tv size={10} /> TV SERIES</span>
              : <span className="type-chip movie-chip"><Film size={10} /> MOVIE</span>
            }
            {item.badge && <span className="type-chip accent-chip">{item.badge}</span>}
          </div>

          <h1 className="detail-title">{item.title}</h1>

          <div className="detail-meta-row">
            <span className="meta-item"><Calendar size={12} /> {item.year}</span>
            <span className="meta-dot" />
            <span className="meta-item"><Clock size={12} /> {item.duration}</span>
            <span className="meta-dot" />
            <span className="meta-item age-chip">{item.rating}</span>
            {item.imdb && (
              <>
                <span className="meta-dot" />
                <span className="meta-item imdb-chip">
                  <Star size={11} fill="#f5c518" color="#f5c518" /> {item.imdb} IMDb
                </span>
              </>
            )}
            {item.seasons && (
              <>
                <span className="meta-dot" />
                <span className="meta-item">{item.seasons} seasons</span>
              </>
            )}
          </div>

          <p className="detail-description">{item.longDescription}</p>

          {/* action buttons */}
          <div className="detail-actions">
            <button className="btn-play-big" onClick={() => { setActiveEpisode(null); setShowPlayer(true) }}>
              <Play size={18} fill="currentColor" /> Play {item.type === 'series' ? 'Series' : 'Now'}
            </button>
            {item.trailerUrl && (
              <button className="btn-trailer" onClick={() => setShowTrailer(true)}>
                <Play size={16} /> Trailer
              </button>
            )}
            <button className="btn-list-big" onClick={() => { if (!myList.includes(item.id) && !localStorage.getItem('cf_user_token')) onRequireAccount(); else onToggleList(item.id) }} aria-label={inList ? 'Remove from list' : 'Add to list'}>
              {inList ? <><Check size={16} /> In My List</> : <><Plus size={16} /> My List</>}
            </button>
          </div>

          {item.type === 'series' && item.seasonsData && item.seasonsData.length > 0 && (
            <div className="series-episodes">
              {/* Season tabs */}
              <div className="season-tabs-wrap">
                <p className="ep-section-label">EPISODES</p>
                <div className="season-tabs">
                  {item.seasonsData.map(season => (
                    <button
                      key={season.id}
                      className={activeSeason === season.seasonNumber ? 'active' : ''}
                      onClick={() => setActiveSeason(season.seasonNumber)}
                    >
                      {season.title || `Season ${season.seasonNumber}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Episode grid */}
              <div className="episode-grid">
                {(item.seasonsData.find(s => s.seasonNumber === activeSeason)?.episodes || [])
                  .map(episode => (
                    <button
                      key={episode.id}
                      className="ep-card"
                      onClick={() => {
                        setActiveEpisode({
                          ...item,
                          id:              episode.id,
                          title:           `${item.title} — E${episode.episodeNumber}: ${episode.title}`,
                          description:     episode.description,
                          longDescription: episode.description,
                          image:           episode.thumbnailUrl || item.image,
                          backdrop:        item.backdrop,
                          duration:        episode.duration || '',
                          provider:        episode.provider,
                          embedUrl:        episode.embedUrl,
                          playbackUrl:     episode.playbackUrl,
                        })
                        setShowPlayer(true)
                      }}
                      aria-label={`Play episode ${episode.episodeNumber}`}
                    >
                      <div className="ep-thumb">
                        <img
                          src={episode.thumbnailUrl || item.backdrop || item.image}
                          alt=""
                          loading="lazy"
                        />
                        <div className="ep-thumb-overlay">
                          <span className="ep-play-circle"><Play size={16} fill="currentColor" /></span>
                        </div>
                        <span className="ep-num">E{episode.episodeNumber}</span>
                      </div>
                      <div className="ep-info">
                        <strong>{episode.title}</strong>
                        <p>{episode.description}</p>
                        {episode.duration && <span className="ep-dur"><Clock size={10} /> {episode.duration}</span>}
                      </div>
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* details grid */}
          <div className="detail-extras">
            {item.genre && (
              <div className="detail-extra-row">
                <span className="extra-label"><Tag size={12} /> Genre</span>
                <span className="extra-value">{item.genre}</span>
              </div>
            )}
            {item.director && (
              <div className="detail-extra-row">
                <span className="extra-label"><User size={12} /> Director</span>
                <span className="extra-value">{item.director}</span>
              </div>
            )}
            {item.cast && item.cast.length > 0 && (
              <div className="detail-extra-row">
                <span className="extra-label"><User size={12} /> Cast</span>
                <span className="extra-value">{item.cast.join(', ')}</span>
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="detail-extra-row">
                <span className="extra-label">Mood</span>
                <span className="extra-value tags-wrap">
                  {item.tags.map(t => <span key={t} className="mood-tag">{t}</span>)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* similar content */}
      {similar.length > 0 && (
        <div className="detail-similar">
          <h3>More like this</h3>
          <div className="similar-grid">
            {similar.map(s => (
              <button key={s.id} className="similar-card" onClick={() => onSelect(s)} aria-label={`Open ${s.title}`}>
                <div className="similar-poster">
                  <img src={s.image} alt="" loading="lazy" />
                  <div className="similar-hover">
                    <Play size={20} fill="currentColor" />
                  </div>
                  {s.badge && <span className="card-badge">{s.badge}</span>}
                </div>
                <div className="similar-info">
                  <strong>{s.title}</strong>
                  <span>{s.year} · {s.genre}</span>
                  {s.imdb && <span className="sim-imdb"><Star size={9} fill="#f5c518" color="#f5c518" /> {s.imdb}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* trailer modal */}
      {showTrailer && item.trailerUrl && (
        <div className="trailer-backdrop" onClick={() => setShowTrailer(false)} role="presentation">
          <div className="trailer-box" onClick={e => e.stopPropagation()}>
            <button className="trailer-close" onClick={() => setShowTrailer(false)} aria-label="Close trailer">✕</button>
            <p className="trailer-label">Official Trailer — {item.title}</p>
            <iframe
              className="trailer-iframe"
              src={withAutoplay(toYouTubeEmbedUrl(item.trailerUrl) || item.trailerUrl)}
              title={`${item.title} trailer`}
              allow="autoplay; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  )
}
