import { useState } from 'react'
import { Play } from 'lucide-react'
import type { Content, Episode } from './data'

type Props = {
  series: Content
  onPlay: (episode: Content) => void
}

function toEpisodeContent(series: Content, episode: Episode): Content {
  return {
    ...series,
    id: episode.id,
    title: episode.title,
    description: episode.description,
    longDescription: episode.description,
    duration: episode.duration || '',
    image: episode.thumbnailUrl || series.image,
    provider: episode.provider,
    embedUrl: episode.embedUrl,
    playbackUrl: episode.playbackUrl,
    seasonsData: series.seasonsData,
  }
}

export default function EpisodeRail({ series, onPlay }: Props) {
  const seasons = series.seasonsData || []
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.seasonNumber || 1)
  const season = seasons.find(item => item.seasonNumber === activeSeason) || seasons[0]
  if (!seasons.length) return null

  return (
    <section className="watch-episodes" aria-label="Series episodes">
      <div className="watch-episodes-heading">
        <div><p className="eyebrow">SERIES GUIDE</p><h2>Episodes</h2></div>
        <span>{seasons.length} season{seasons.length === 1 ? '' : 's'}</span>
      </div>
      <div className="watch-season-tabs">
        {seasons.map(item => (
          <button key={item.id} className={item.seasonNumber === activeSeason ? 'active' : ''} onClick={() => setActiveSeason(item.seasonNumber)}>
            {item.title || `Season ${item.seasonNumber}`}
          </button>
        ))}
      </div>
      <div className="watch-episode-list">
        {(season?.episodes || []).filter(episode => episode.isPublished).map(episode => (
          <article className="watch-episode-row" key={episode.id}>
            <span className="watch-episode-number">{String(episode.episodeNumber).padStart(2, '0')}</span>
            <div className="watch-episode-copy">
              <strong>{episode.title}</strong>
              <p>{episode.description}</p>
              <span>{episode.duration || 'Episode'}</span>
            </div>
            <button className="watch-episode-play" onClick={() => onPlay(toEpisodeContent(series, episode))} aria-label={`Play episode ${episode.episodeNumber}`}>
              <Play size={16} fill="currentColor" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
