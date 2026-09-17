import { useState } from 'react'
import { Play, SkipForward } from 'lucide-react'
import type { Content, Episode } from './data'

type Props = {
  series: Content
  currentEpisodeId?: string
  onPlay: (episode: Content) => void
}

function toEpisodeContent(series: Content, episode: Episode): Content {
  return {
    ...series,
    id:              episode.id,
    title:           `${series.title} — E${episode.episodeNumber}: ${episode.title}`,
    description:     episode.description,
    longDescription: episode.description,
    duration:        episode.duration || '',
    image:           episode.thumbnailUrl || series.image,
    provider:        episode.provider,
    embedUrl:        episode.embedUrl,
    playbackUrl:     episode.playbackUrl,
    seasonsData:     series.seasonsData,
  }
}

export default function EpisodeRail({ series, currentEpisodeId, onPlay }: Props) {
  const seasons = series.seasonsData || []
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.seasonNumber || 1)
  const season = seasons.find(s => s.seasonNumber === activeSeason) || seasons[0]
  if (!seasons.length) return null

  const episodes = season?.episodes || []
  const currentIdx = episodes.findIndex(e => e.id === currentEpisodeId)
  const nextEp = currentIdx >= 0 && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null

  return (
    <section className="watch-episodes" aria-label="Series episodes">
      <div className="watch-episodes-heading">
        <div><p className="eyebrow">SERIES GUIDE</p><h2>Episodes</h2></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {nextEp && (
            <button className="next-ep-btn" onClick={() => onPlay(toEpisodeContent(series, nextEp))}>
              <SkipForward size={14} /> Next: E{nextEp.episodeNumber}
            </button>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>{seasons.length} season{seasons.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="watch-season-tabs">
        {seasons.map(s => (
          <button key={s.id} className={s.seasonNumber === activeSeason ? 'active' : ''} onClick={() => setActiveSeason(s.seasonNumber)}>
            {s.title || `Season ${s.seasonNumber}`}
          </button>
        ))}
      </div>

      <div className="watch-episode-list">
        {episodes.map(episode => (
          <article
            key={episode.id}
            className={`watch-episode-row${episode.id === currentEpisodeId ? ' playing' : ''}`}
          >
            <span className="watch-episode-number">{String(episode.episodeNumber).padStart(2, '0')}</span>
            <div className="watch-episode-copy">
              <strong>{episode.title}</strong>
              <p>{episode.description}</p>
              <span>{episode.duration || 'Episode'}</span>
            </div>
            <button
              className="watch-episode-play"
              onClick={() => onPlay(toEpisodeContent(series, episode))}
              aria-label={`Play episode ${episode.episodeNumber}`}
            >
              <Play size={16} fill="currentColor" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
