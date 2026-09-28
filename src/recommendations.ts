import type { Content } from './data'

/**
 * Generate personalized recommendations based on watch history
 */
export function getRecommendations(
  allContent: Content[],
  watchHistory: string[],
  maxRecommendations = 12
): Content[] {
  if (!watchHistory.length) {
    // If no watch history, return trending/latest items
    return allContent
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .slice(0, maxRecommendations)
  }

  // Find items in watch history
  const watchedItems = allContent.filter(item => watchHistory.includes(item.id))
  
  // Extract genres from watched items
  const watchedGenres = new Set<string>()
  watchedItems.forEach(item => {
    item.genre.split(',').forEach(g => watchedGenres.add(g.trim().toLowerCase()))
  })

  // Extract tags/themes from watched items
  const watchedTags = new Set<string>()
  watchedItems.forEach(item => {
    item.tags?.forEach(tag => watchedTags.add(tag.toLowerCase()))
  })

  // Score unwatched content based on genre & tag match
  const recommendations = allContent
    .filter(item => !watchHistory.includes(item.id))
    .map(item => {
      let score = 0
      const itemGenres = item.genre.split(',').map(g => g.trim().toLowerCase())
      const itemTags = (item.tags || []).map(t => t.toLowerCase())

      // Genre match (higher weight)
      itemGenres.forEach(genre => {
        if (watchedGenres.has(genre)) score += 3
      })

      // Tag/theme match
      itemTags.forEach(tag => {
        if (watchedTags.has(tag)) score += 2
      })

      // Boost for high ratings
      if (item.imdb) {
        const imdbNum = parseFloat(item.imdb)
        if (imdbNum >= 8) score += 4
        else if (imdbNum >= 7) score += 2
      }

      // Boost for newer content
      const yearsSinceRelease = new Date().getFullYear() - (item.year || 0)
      if (yearsSinceRelease <= 2) score += 2
      if (yearsSinceRelease <= 1) score += 3

      // Slight boost for movies/series based on what they watch
      const watchedTypes = new Set(watchedItems.map(i => i.type))
      if (watchedTypes.has(item.type)) score += 1

      return { item, score }
    })
    .filter(rec => rec.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecommendations)
    .map(rec => rec.item)

  // If not enough recommendations, fill with highest rated items
  if (recommendations.length < maxRecommendations) {
    const remaining = allContent
      .filter(item => 
        !watchHistory.includes(item.id) && 
        !recommendations.find(r => r.id === item.id)
      )
      .sort((a, b) => (parseFloat(b.imdb || '0') || 0) - (parseFloat(a.imdb || '0') || 0))
      .slice(0, maxRecommendations - recommendations.length)

    recommendations.push(...remaining)
  }

  return recommendations
}

/**
 * Get "More Like This" recommendations for a specific item
 */
export function getMoreLikeThis(
  item: Content,
  allContent: Content[],
  excludeIds: string[] = [],
  maxItems = 8
): Content[] {
  const itemGenres = new Set(
    item.genre.split(',').map(g => g.trim().toLowerCase())
  )
  
  const itemTags = new Set(
    (item.tags || []).map(t => t.toLowerCase())
  )

  return allContent
    .filter(c => 
      c.id !== item.id && 
      !excludeIds.includes(c.id) &&
      (
        c.genre.split(',').some(g => itemGenres.has(g.trim().toLowerCase())) ||
        (c.tags || []).some(t => itemTags.has(t.toLowerCase()))
      )
    )
    .sort((a, b) => {
      // Sort by rating first, then by year
      const ratingDiff = (parseFloat(b.imdb || '0') || 0) - (parseFloat(a.imdb || '0') || 0)
      if (ratingDiff !== 0) return ratingDiff
      return (b.year || 0) - (a.year || 0)
    })
    .slice(0, maxItems)
}

/**
 * Get trending items (highly rated recent releases)
 */
export function getTrending(
  allContent: Content[],
  maxItems = 12
): Content[] {
  const now = new Date().getFullYear()
  return allContent
    .filter(item => (now - (item.year || 0)) <= 3) // Last 3 years
    .sort((a, b) => {
      // Sort by rating, then by year
      const ratingDiff = (parseFloat(b.imdb || '0') || 0) - (parseFloat(a.imdb || '0') || 0)
      if (ratingDiff !== 0) return ratingDiff
      return (b.year || 0) - (a.year || 0)
    })
    .slice(0, maxItems)
}

/**
 * Get top rated items in a specific genre
 */
export function getTopInGenre(
  allContent: Content[],
  genre: string,
  maxItems = 12
): Content[] {
  const genreLower = genre.toLowerCase()
  return allContent
    .filter(item => item.genre.toLowerCase().includes(genreLower))
    .sort((a, b) => (parseFloat(b.imdb || '0') || 0) - (parseFloat(a.imdb || '0') || 0))
    .slice(0, maxItems)
}

/**
 * Get "Because You Watched" recommendations
 * Shows items similar to a specific watch
 */
export function getBecauseYouWatched(
  watchedItem: Content,
  allContent: Content[],
  maxItems = 6
): { title: string; items: Content[] } {
  const similar = getMoreLikeThis(watchedItem, allContent, [], maxItems)
  
  return {
    title: `Because You Watched "${watchedItem.title}"`,
    items: similar
  }
}
