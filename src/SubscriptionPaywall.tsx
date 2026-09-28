import { useState } from 'react'
import { X, Lock, Zap, Check, AlertCircle, Phone, ArrowRight } from 'lucide-react'
import { initializePayment, confirmPayment } from './account'

type Props = {
  itemTitle: string
  onClose: () => void
  onSuccess: () => void
}

type PaymentStep = 'plan' | 'phone' | 'confirm' | 'success'

export default function SubscriptionPaywall({ itemTitle, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<PaymentStep>('plan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [transactionId, setTransactionId] = useState('')

  const handleStartPayment = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }
    
    // Validate Uganda phone format
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (!cleanPhone.match(/^256\d{9}$/)) {
      setError('Please enter a valid Uganda phone number (256XXXXXXXXX)')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await initializePayment(phoneNumber, 'MTN')
      setPaymentId(response.paymentId)
      setStep('confirm')
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      setError('Please enter your transaction reference')
      return
    }

    setLoading(true)
    setError('')
    try {
      await confirmPayment(paymentId, transactionId)
      setStep('success')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      setError((err as Error).message || 'Payment confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paywall-overlay" onClick={onClose} role="presentation">
      <div className="paywall-container" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        {/* Plan Selection Screen */}
        {step === 'plan' && (
          <div className="paywall-content">
            <div className="paywall-hero">
              <Lock size={64} className="paywall-lock-icon" />
              <h1 className="paywall-title">Watch {itemTitle}</h1>
              <p className="paywall-subtitle">Subscribe to unlock unlimited streaming</p>
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
                <li>
                  <Check size={18} className="feature-check" />
                  <span>Watch all movies and series in HD</span>
                </li>
                <li>
                  <Check size={18} className="feature-check" />
                  <span>Download for offline viewing</span>
                </li>
                <li>
                  <Check size={18} className="feature-check" />
                  <span>No ads, cancel anytime</span>
                </li>
                <li>
                  <Check size={18} className="feature-check" />
                  <span>Watch on all your devices</span>
                </li>
              </ul>

              <button
                className="paywall-btn-primary"
                onClick={() => setStep('phone')}
                disabled={loading}
              >
                Start Free Trial
                <ArrowRight size={16} />
              </button>

              <p className="paywall-terms">
                No credit card required. First month only 10,000 UGX.
              </p>
            </div>

            <div className="paywall-benefits">
              <div className="benefit-item">
                <div className="benefit-icon">📺</div>
                <div className="benefit-text">
                  <p className="benefit-title">Watch Anywhere</p>
                  <p className="benefit-desc">On phone, tablet, laptop, or TV</p>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">⭐</div>
                <div className="benefit-text">
                  <p className="benefit-title">Premium Content</p>
                  <p className="benefit-desc">Latest movies and exclusive series</p>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">🔒</div>
                <div className="benefit-text">
                  <p className="benefit-title">Secure & Private</p>
                  <p className="benefit-desc">Your data is always protected</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Entry Screen */}
        {step === 'phone' && (
          <div className="paywall-content">
            <div className="paywall-progress">
              <div className="progress-step active">1</div>
              <div className="progress-line"></div>
              <div className="progress-step">2</div>
            </div>

            <h2 className="paywall-step-title">Enter Your Phone Number</h2>
            <p className="paywall-step-desc">
              We'll send payment instructions via MTN Mobile Money
            </p>

            {error && (
              <div className="paywall-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleStartPayment()
              }}
              className="paywall-form"
            >
              <div className="form-group">
                <label>Uganda Phone Number</label>
                <div className="phone-input-wrapper">
                  <span className="phone-prefix">🇺🇬 +256</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="7xxxxxxxx"
                    disabled={loading}
                    maxLength={13}
                  />
                </div>
                <p className="input-hint">Format: 256XXXXXXXXX or +256XXXXXXXXX</p>
              </div>

              <button
                type="submit"
                className="paywall-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="paywall-btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            </form>

            <div className="payment-methods">
              <p className="methods-title">Payment Methods</p>
              <div className="methods-list">
                <div className="method">
                  <span className="method-icon">📱</span>
                  <span className="method-name">MTN Mobile Money</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmation Screen */}
        {step === 'confirm' && (
          <div className="paywall-content">
            <div className="paywall-progress">
              <div className="progress-step active">1</div>
              <div className="progress-line active"></div>
              <div className="progress-step active">2</div>
            </div>

            <h2 className="paywall-step-title">Complete Your Payment</h2>
            <p className="paywall-step-desc">
              Enter the transaction reference from your MTN confirmation message
            </p>

            {error && (
              <div className="paywall-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="payment-confirmation">
              <div className="conf-item">
                <span className="conf-label">Amount</span>
                <span className="conf-value">10,000 UGX</span>
              </div>
              <div className="conf-item">
                <span className="conf-label">Plan</span>
                <span className="conf-value">Premium Monthly</span>
              </div>
              <div className="conf-item">
                <span className="conf-label">Reference ID</span>
                <span className="conf-value code">{paymentId.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirmPayment()
              }}
              className="paywall-form"
            >
              <div className="form-group">
                <label>Transaction Reference / Code</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC123XYZ789"
                  disabled={loading}
                  maxLength={20}
                  autoFocus
                />
                <p className="input-hint">
                  Check your MTN message for the confirmation code (usually starts with letters)
                </p>
              </div>

              <button
                type="submit"
                className="paywall-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    Confirm & Activate
                    <Check size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="paywall-btn-secondary"
                onClick={() => setStep('phone')}
                disabled={loading}
              >
                Back
              </button>
            </form>

            <div className="security-badge">
              <span className="badge-icon">🔒</span>
              <span className="badge-text">Your payment is secure and encrypted</span>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {step === 'success' && (
          <div className="paywall-content paywall-success">
            <div className="success-animation">
              <div className="success-checkmark">
                <Check size={48} />
              </div>
            </div>

            <h2 className="paywall-step-title success-title">Payment Successful!</h2>
            <p className="paywall-step-desc">
              Your subscription is now active. Enjoy unlimited streaming!
            </p>

            <div className="success-details">
              <p>You can now watch {itemTitle} and all other content.</p>
              <p className="success-next">Redirecting in a moment...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
