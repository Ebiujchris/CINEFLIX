import { useEffect, useState } from 'react'
import type { Content, Season } from './data'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function mapApiItem(item: Record<string, unknown>): Content {
  const primary = (item.videos as Record<string, unknown>[] | undefined)?.find(
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
    captions:        [],
    seasonsData:     ((item.seasonsData as Record<string, unknown>[] | undefined) || []).map(season => ({
      id: season.id as string, seasonNumber: season.seasonNumber as number, title: season.title as string | undefined,
      episodes: ((season.episodes as Record<string, unknown>[] | undefined) || []).map(episode => {
        const video = (episode.videos as Record<string, unknown>[] | undefined)?.find(v => v.isPrimary) || (episode.videos as Record<string, unknown>[] | undefined)?.[0]
        return { id: episode.id as string, episodeNumber: episode.episodeNumber as number, title: episode.title as string, description: episode.description as string, duration: episode.duration as string | undefined, thumbnailUrl: episode.thumbnailUrl as string | undefined, isPublished: Boolean(episode.isPublished), provider: (video?.provider as Content['provider']) || 'YOUTUBE', embedUrl: video?.embedUrl as string | undefined, playbackUrl: video?.playbackUrl as string | undefined }
      }),
    })) as Season[],
  }
}

export function useContent() {
  const [content,  setContent]  = useState<Content[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${BASE}/api/content?limit=100`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load content')
      setContent((data.items as Record<string, unknown>[]).map(mapApiItem))
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { content, loading, error, reload: load }
}
