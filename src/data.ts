export type Provider = 'YOUTUBE' | 'VIMEO' | 'DIRECT_MP4' | 'DIRECT_HLS' | 'EXTERNAL_EMBED'
export type ContentType = 'movie' | 'series'

export type Caption = { label: string; srclang: string; src: string }

export type Episode = {
  id: string
  episodeNumber: number
  title: string
  description: string
  duration?: string
  thumbnailUrl?: string
  isPublished: boolean
  provider: Provider
  embedUrl?: string
  playbackUrl?: string
}

export type Season = {
  id: string
  seasonNumber: number
  title?: string
  episodes: Episode[]
}

export type Content = {
  id: string
  type: ContentType
  title: string
  year: number
  duration: string
  genre: string
  description: string
  longDescription: string
  image: string
  backdrop: string
  badge?: string
  rating: string
  imdb?: string
  director?: string
  cast?: string[]
  tags?: string[]
  provider: Provider
  playbackUrl?: string
  embedUrl?: string
  trailerUrl?: string
  seasons?: number
  seasonsData?: Season[]
  captions?: Caption[]
}

export const MOVIE_GENRES  = ['All', 'Action', 'Adventure', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Horror', 'Music', 'Romance', 'Sci-Fi', 'Thriller']
export const SERIES_GENRES = ['All', 'Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller']
