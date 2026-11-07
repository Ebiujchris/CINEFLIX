import { useState } from 'react'
import { X, Lock, Zap, Check, AlertCircle, ArrowRight } from 'lucide-react'
import { initializePayment } from './account'

type Props = {
  itemTitle: string
  renewal?: boolean
  onClose: () => void
  onSuccess: () => void
}

type PaymentProvider = 'MTN' | 'AIRTEL'
type PaymentStep = 'plan' | 'phone'

export default function SubscriptionPaywall({ itemTitle, renewal = false, onClose }: Props) {
  const [step, setStep] = useState<PaymentStep>('plan')
  const [provider, setProvider] = useState<PaymentProvider>('MTN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const handleStartPayment = async () => {
    const cleanPhone = phoneNumber.replace(/\s/g, '')
    if (!/^\+?256\d{9}$/.test(cleanPhone)) {
      setError('Enter a valid Uganda mobile-money number, such as 256XXXXXXXXX.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await initializePayment(cleanPhone, provider)
    } catch (err) {
      setError((err as Error).message || 'Payment could not be started.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paywall-overlay" onClick={onClose} role="presentation">
      <div className="paywall-container" onClick={event => event.stopPropagation()}>
        <button className="paywall-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        {step === 'plan' && (
          <div className="paywall-content">
            <div className="paywall-hero">
              <Lock size={64} className="paywall-lock-icon" />
              <h1 className="paywall-title">{renewal ? 'Renew your subscription' : `Watch ${itemTitle}`}</h1>
              <p className="paywall-subtitle">Subscribe for unlimited streaming</p>
            </div>

            <div className="paywall-plan">
              <div className="plan-header">
                <Zap size={20} className="plan-icon" />
                <h2>Premium Monthly</h2>
              </div>

              <div className="plan-price">
                <span className="price-amount">10,000</span>
                <span className="price-currency">UGX</span>
                <span className="price-period">/month</span>
              </div>

              <ul className="plan-features">
                <li><Check size={18} className="feature-check" /><span>Watch all movies and series</span></li>
                <li><Check size={18} className="feature-check" /><span>Watch on all your devices</span></li>
                <li><Check size={18} className="feature-check" /><span>Cancel anytime</span></li>
              </ul>

              <button className="paywall-btn-primary" onClick={() => setStep('phone')}>
                {renewal ? 'Renew now' : 'Choose payment method'}
                <ArrowRight size={16} />
              </button>

              <p className="paywall-terms">10,000 UGX per month. Verified payment grants 30 days of access.</p>
            </div>
          </div>
        )}

        {step === 'phone' && (
          <div className="paywall-content">
            <div className="paywall-progress">
              <div className="progress-step active">1</div>
              <div className="progress-line active"></div>
              <div className="progress-step active">2</div>
            </div>

            <h2 className="paywall-step-title">Mobile Money</h2>
            <p className="paywall-step-desc">Choose your wallet and enter the phone number registered to it.</p>

            {error && (
              <div className="paywall-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>Payment provider</label>
              <div className="payment-provider-options">
                {(['MTN', 'AIRTEL'] as PaymentProvider[]).map(option => (
                  <button
                    className={`payment-provider-option${provider === option ? ' selected' : ''}`}
                    type="button"
                    key={option}
                    onClick={() => { setProvider(option); setError('') }}
                    aria-pressed={provider === option}
                  >
                    <span className={`provider-mark ${option.toLowerCase()}`}>{option === 'MTN' ? 'M' : 'A'}</span>
                    <span>{option === 'MTN' ? 'MTN Mobile Money' : 'Airtel Money'}</span>
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={event => {
                event.preventDefault()
                handleStartPayment()
              }}
              className="paywall-form"
            >
              <div className="form-group">
                <label htmlFor="mobile-money-number">Uganda phone number</label>
                <div className="phone-input-wrapper">
                  <span className="phone-prefix">🇺🇬 +256</span>
                  <input
                    id="mobile-money-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={event => setPhoneNumber(event.target.value)}
                    placeholder="7xxxxxxxx"
                    disabled={loading}
                    autoComplete="tel"
                  />
                </div>
                <p className="input-hint">Use the number linked to your {provider === 'MTN' ? 'MTN' : 'Airtel'} Money wallet.</p>
              </div>

              <div className="payment-setup-notice">
                Mobile-money payments are being set up. You will not be charged until a payment provider is connected.
              </div>

              <button type="submit" className="paywall-btn-primary" disabled={loading}>
                {loading ? 'Checking payment setup…' : 'Continue'}
                {!loading && <ArrowRight size={16} />}
              </button>
              <button type="button" className="paywall-btn-secondary" onClick={() => { setStep('plan'); setError('') }} disabled={loading}>
                Back
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
