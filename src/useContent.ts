import { useEffect, useState } from 'react'
import type { Content, Season, VideoSource } from './data'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')
const CONTENT_CACHE_KEY = 'cf_content_cache'
const CONTENT_CACHE_TTL = 5 * 60 * 1000

function mapApiItem(item: Record<string, unknown>): Content {
  const videos = (item.videos as Record<string, unknown>[] | undefined) || []
  const sources: VideoSource[] = videos.map(video => ({
    provider: video.provider as Content['provider'],
    embedUrl: video.embedUrl as string | undefined,
    playbackUrl: video.playbackUrl as string | undefined,
  }))
  const primary = videos.find(
    (v: Record<string, unknown>) => v.isPrimary
  ) || (item.videos as Record<string, unknown>[] | undefined)?.[0]

  return {
    id:              item.id as string,
    type:            (item.type as string).toLowerCase() as 'movie' | 'series',
    title:           item.title as string,
    year:            (item.year as number) || new Date().getFullYear(),
    duration:        (item.duration as string) || '',
    genre:           (item.genre as string) || '',
    description:     item.description as string,
    longDescription: (item.longDescription as string) || (item.description as string),
    image:           (item.posterUrl as string) || 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80',
    backdrop:        (item.backdropUrl as string) || (item.posterUrl as string) || 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1800&q=85',
    trailerUrl:      (item.trailerUrl as string) || undefined,
    rating:          (item.rating as string) || 'NR',
    imdb:            (item.imdb as string) || undefined,
    director:        (item.director as string) || undefined,
    cast:            (item.cast as string[]) || [],
    tags:            (item.tags as string[]) || [],
    badge:           (item.badge as string) || undefined,
    seasons:         (item.seasons as number) || undefined,
    provider:        primary ? (primary.provider as string) as Content['provider'] : 'YOUTUBE',
    embedUrl:        (primary?.embedUrl as string) || undefined,
    playbackUrl:     (primary?.playbackUrl as string) || undefined,
    sources,
    captions:        [],
    seasonsData:     ((item.seasonsData as Record<string, unknown>[] | undefined) || []).map(season => ({
      id: season.id as string,
      seasonNumber: season.seasonNumber as number,
      title: season.title as string | undefined,
      episodes: ((season.episodes as Record<string, unknown>[] | undefined) || []).map(episode => {
        // episodes have a videos[] array — find the primary one
        const vids = (episode.videos as Record<string, unknown>[] | undefined) || []
        const video = vids.find(v => v.isPrimary) || vids[0]
        return {
          id:            episode.id as string,
          episodeNumber: episode.episodeNumber as number,
          title:         episode.title as string,
          description:   episode.description as string,
          duration:      episode.duration as string | undefined,
          thumbnailUrl:  episode.thumbnailUrl as string | undefined,
          isPublished:   Boolean(episode.isPublished),
          provider:      (video?.provider as Content['provider']) || 'YOUTUBE',
          embedUrl:      video?.embedUrl as string | undefined,
          playbackUrl:   video?.playbackUrl as string | undefined,
          sources:       vids.map(source => ({ provider: source.provider as Content['provider'], embedUrl: source.embedUrl as string | undefined, playbackUrl: source.playbackUrl as string | undefined })),
        }
      }),
    })) as Season[],
  }
}

export function useContent() {
  const cached = readContentCache()
  const [content,  setContent]  = useState<Content[]>(cached?.items || [])
  const [loading,  setLoading]  = useState(!cached)
  const [error,    setError]    = useState<string | null>(null)

  const load = async (showLoading = !cached) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${BASE}/api/content?limit=100`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load content')
      const mapped = (data.items as Record<string, unknown>[]).map(mapApiItem)
      setContent(mapped)
      try { sessionStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: mapped })) } catch { /* cache is optional */ }
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(!cached)
    const refresh = () => load(false)
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [])

  return { content, loading, error, reload: load }
}

function readContentCache(): { savedAt: number; items: Content[] } | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(CONTENT_CACHE_KEY) || 'null')
    if (!value || Date.now() - value.savedAt > CONTENT_CACHE_TTL || !Array.isArray(value.items)) return null
    return value
  } catch { return null }
}
