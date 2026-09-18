const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

export type AccountUser = { id: string; email: string; name: string }
export type WatchProgress = { id: string; contentId: string; episodeId: string; position: number; duration: number; completed: boolean; updatedAt: string }
export type AccountLibrary = { watchlist: string[]; progress: WatchProgress[] }

function token() { return localStorage.getItem('cf_user_token') || '' }
function headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` } }

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.error || 'Account request failed')
  return data
}

export function getAccount(): AccountUser | null {
  try { return JSON.parse(localStorage.getItem('cf_user') || 'null') } catch { return null }
}

export function clearAccount() {
  localStorage.removeItem('cf_user_token')
  localStorage.removeItem('cf_user')
}

export async function login(email: string, password: string) {
  const data = await request('/api/users/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  localStorage.setItem('cf_user_token', data.token)
  localStorage.setItem('cf_user', JSON.stringify(data.user))
  return data.user as AccountUser
}

export async function signup(name: string, email: string, password: string) {
  const data = await request('/api/users/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
  localStorage.setItem('cf_user_token', data.token)
  localStorage.setItem('cf_user', JSON.stringify(data.user))
  return data.user as AccountUser
}

export async function getLibrary() { return request('/api/users/me/library') as Promise<AccountLibrary> }
export async function addToWatchlist(contentId: string) { return request(`/api/users/me/watchlist/${contentId}`, { method: 'PUT' }) }
export async function removeFromWatchlist(contentId: string) { return request(`/api/users/me/watchlist/${contentId}`, { method: 'DELETE' }) }
export async function saveProgress(contentId: string, position: number, duration: number, episodeId?: string) {
  return request('/api/users/me/progress', { method: 'PUT', body: JSON.stringify({ contentId, episodeId, position, duration }) })
}
export async function removeProgress(contentId: string) { return request(`/api/users/me/progress/${contentId}`, { method: 'DELETE' }) }
