import { useEffect, useState } from 'react'
import { AlertCircle, X, Phone, CheckCircle, Clock } from 'lucide-react'
import { getSubscription, initializePayment } from './account'

type Subscription = {
  id: string
  status: string
  isActive: boolean
  expiryDate: string | null
  daysUntilExpiry: number | null
  price: number
}

type Props = {
  onSubscribed: () => void
  onClose: () => void
}

export default function SubscriptionGate({ onSubscribed, onClose }: Props) {
  const [step, setStep] = useState<'check' | 'active' | 'buy' | 'phone'>('check')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [provider, setProvider] = useState<'MTN' | 'AIRTEL'>('MTN')

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      setLoading(true)
      const sub = await getSubscription()
      setSubscription(sub)
      if (sub.isActive) {
        setStep('active')
        return
      }
      setStep('buy')
    } catch (err) {
      setStep('buy')
    } finally {
      setLoading(false)
    }
  }

  const handleInitiatePayment = async () => {
    if (!phoneNumber.match(/^\+?256\d{9}$/)) {
      setError('Invalid phone number. Use format: 256XXXXXXXXX or +256XXXXXXXXX')
      return
    }
    try {
      setLoading(true)
      setError('')
      await initializePayment(phoneNumber, provider)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="subscription-gate-backdrop" onClick={onClose} role="presentation">
      <section className="subscription-gate-modal" onClick={(e) => e.stopPropagation()}>
        <button className="subscription-gate-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {loading && step === 'check' && (
          <div className="subscription-loading">
            <div className="loading-spinner" />
            <p>Checking subscription...</p>
          </div>
        )}

        {step === 'active' && subscription?.isActive && (
          <>
            <div className="subscription-header">
              <CheckCircle size={48} color="#4ade80" />
              <h2>Subscription Active</h2>
              <p>You're all set to watch!</p>
            </div>

            <div className="sub-info-box">
              <div className="sub-info-item">
                <span className="sub-label">Status</span>
                <span className="sub-status-active">ACTIVE</span>
              </div>
              <div className="sub-info-item">
                <span className="sub-label">Price</span>
                <span className="sub-value">{subscription.price.toLocaleString()} UGX/month</span>
              </div>
              <div className="sub-info-item">
                <span className="sub-label">Expiry</span>
                <span className="sub-value">
                  <Clock size={13} style={{ display: 'inline', marginRight: '6px' }} />
                  {formatDate(subscription.expiryDate)}
                  {subscription.daysUntilExpiry !== null && (
                    <span style={{ color: '#999', marginLeft: '8px' }}>
                      ({subscription.daysUntilExpiry} days remaining)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <button className="btn-subscribe" onClick={onSubscribed}>
              Continue Watching
            </button>
          </>
        )}

        {step === 'buy' && !loading && (
          <>
            <div className="subscription-header">
              <AlertCircle size={32} color="#f5c518" />
              <h2>Subscribe to Watch</h2>
              <p>Get unlimited access to all movies and series</p>
            </div>

            <div className="subscription-price">
              <div className="price-card">
                <p className="price-label">Monthly Plan</p>
                <p className="price-amount">10,000 UGX</p>
                <p className="price-period">Per month</p>
                <ul className="price-features">
                  <li>Unlimited streaming</li>
                  <li>HD quality</li>
                  <li>Watch on any device</li>
                  <li>Cancel anytime</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="subscription-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button className="btn-subscribe" onClick={() => setStep('phone')} disabled={loading}>
              <Phone size={16} /> Continue
            </button>
            <button className="btn-close-subscription" onClick={onClose}>
              Not now
            </button>
          </>
        )}

        {step === 'phone' && (
          <>
            <div className="subscription-header">
              <Phone size={32} color="#f5c518" />
              <h2>Mobile Money</h2>
              <p>Choose your wallet and enter its registered phone number</p>
            </div>

            {error && (
              <div className="subscription-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleInitiatePayment()
              }}
              className="subscription-form"
            >
              <label>
                Payment provider
                <select value={provider} onChange={event => setProvider(event.target.value === 'AIRTEL' ? 'AIRTEL' : 'MTN')}>
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="AIRTEL">Airtel Money</option>
                </select>
              </label>
              <label>
                Uganda Phone Number
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="256XXXXXXXXX"
                  disabled={loading}
                  required
                />
              </label>
              <button type="submit" className="btn-subscribe" disabled={loading}>
                {loading ? 'Checking payment setup...' : 'Continue'}
              </button>
            </form>

            <p className="subscription-note">
              Mobile-money payments are being set up. You will not be charged until a payment provider is connected.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
