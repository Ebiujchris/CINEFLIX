import { useState } from 'react'
import { AlertCircle, Eye, EyeOff, LogIn, UserPlus, X, LogOut, Heart, Clock } from 'lucide-react'
import { login, signup, type AccountUser } from './account'

type Props = { user?: AccountUser | null; onSuccess: (user: AccountUser) => void; onSignOut?: () => void; onNavigate?: (page: 'watchlist' | 'home') => void; onClose: () => void }

export default function AccountDialog({ user, onSuccess, onSignOut, onNavigate, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return (
      <div className="account-modal-backdrop" onClick={onClose} role="presentation">
        <section className="account-modal account-profile-modal" onClick={event => event.stopPropagation()} aria-label="Your Cineflix account">
          <button className="account-modal-close" onClick={onClose} aria-label="Close account dialog"><X size={18} /></button>
          <div className="account-profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h2>{user.name}</h2>
          <p className="account-modal-sub">{user.email}</p>
          <div className="account-profile-links">
            <button onClick={() => { onNavigate?.('watchlist'); onClose() }}><Heart size={16} /> My Watchlist</button>
            <button onClick={() => { onNavigate?.('home'); onClose() }}><Clock size={16} /> Continue Watching</button>
          </div>
          <button className="account-signout" onClick={() => { onSignOut?.(); onClose() }}><LogOut size={16} /> Sign out</button>
        </section>
      </div>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const user = mode === 'login' ? await login(email, password) : await signup(name, email, password)
      onSuccess(user)
    } catch (err) { setError((err as Error).message) } finally { setLoading(false) }
  }

  return (
    <div className="account-modal-backdrop" onClick={onClose} role="presentation">
      <section className="account-modal" onClick={event => event.stopPropagation()} aria-label="Cineflix account">
        <button className="account-modal-close" onClick={onClose} aria-label="Close account dialog"><X size={18} /></button>
        <p className="eyebrow">CINEFLIX ACCOUNT</p>
        <h2>{mode === 'login' ? 'Welcome back.' : 'Make it yours.'}</h2>
        <p className="account-modal-sub">Save your watchlist and pick up where you left off on any device.</p>
        {error && <div className="account-error"><AlertCircle size={15} /> {error}</div>}
        <form onSubmit={submit} className="account-form">
          {mode === 'signup' && <label>Name<input value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" /></label>}
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
          <label>Password
            <span className="account-password"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
          </label>
          <button className="account-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? <><LogIn size={16} /> Sign in</> : <><UserPlus size={16} /> Create account</>}</button>
        </form>
        <button className="account-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
          {mode === 'login' ? 'New to Cineflix? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </div>
  )
}
