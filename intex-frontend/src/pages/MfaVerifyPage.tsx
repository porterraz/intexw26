import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export function MfaVerifyPage() {
  const { pendingMfa, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter a valid 6-digit authenticator code.')
      return
    }
    setLoading(true)
    try {
      const user = await verifyMfa(code.trim())
      if (user.roles.includes('Admin')) navigate('/admin', { replace: true })
      else navigate('/impact', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to verify MFA code.')
    } finally {
      setLoading(false)
    }
  }

  if (!pendingMfa) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-surface p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl font-bold text-surface-dark">No MFA session found</h1>
          <p className="mt-2 text-sm text-surface-text">Please sign in again to continue.</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-surface p-8 shadow-sm">
        <div className="mb-4">
          <Link to="/login" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to login
          </Link>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Multi-Factor Authentication</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-surface-dark">Verify your sign in</h1>
        <p className="mt-2 text-sm text-surface-text">
          Enter the 6-digit code from your authenticator app for <span className="font-medium">{pendingMfa.email}</span>.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-surface-text" htmlFor="mfa-code">
            Authenticator code
          </label>
          <input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full rounded-xl border border-brand-100 bg-surface px-4 py-3 text-center text-xl tracking-[0.35em] text-surface-dark outline-none focus:border-brand"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>
          <Link
            to="/"
            className="block text-center text-sm font-medium text-surface-text hover:text-surface-dark"
          >
            Back to home
          </Link>
        </form>
      </div>
    </div>
  )
}
