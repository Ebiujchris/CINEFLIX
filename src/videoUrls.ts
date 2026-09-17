export function toYouTubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    let videoId = ''

    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1)
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') || ''
      else if (url.pathname.startsWith('/embed/')) videoId = url.pathname.split('/')[2] || ''
      else if (url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/')[2] || ''
    }

    if (!videoId) return null
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
  } catch {
    return null
  }
}

export function withAutoplay(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}autoplay=1`
}