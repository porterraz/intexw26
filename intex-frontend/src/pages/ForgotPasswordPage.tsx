import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, resetPasswordRequest } from '../lib/api'

function meetsPasswordPolicy(password: string): boolean {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const passwordPolicyHint = useMemo(
    () => 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.',
    []
  )

  async function onRequestReset(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    setLoading(true)
    try {
      const res = await requestPasswordReset(email.trim())
      if (res.resetToken) {
        setToken(res.resetToken)
        setInfo('Reset token generated for development. Paste it below and set your new password.')
      } else {
        setInfo('If this email exists, a reset token has been issued. Continue below with your token.')
      }
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request password reset.')
    } finally {
      setLoading(false)
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim() || !token.trim() || !newPassword) {
      setError('Email, token, and new password are required.')
      return
    }

    if (!meetsPasswordPolicy(newPassword)) {
      setError(passwordPolicyHint)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPasswordRequest(email.trim(), token.trim(), newPassword)
      setStep('done')
      setInfo('Password reset successful. You can sign in now.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 text-surface-dark flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-brand-100 bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-surface-text">
          Request a token, then submit your token and new password.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {info && <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}

        {step === 'request' && (
          <form className="mt-5 space-y-3" onSubmit={onRequestReset}>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Requesting...' : 'Request Reset Token'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form className="mt-5 space-y-3" onSubmit={onResetPassword}>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="reset-email-confirm">
                Email
              </label>
              <input
                id="reset-email-confirm"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="reset-token">
                Reset Token
              </label>
              <textarea
                id="reset-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
                placeholder="Paste reset token"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="new-password">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
                required
              />
              <p className="mt-1 text-xs text-surface-text">{passwordPolicyHint}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark disabled:opacity-60"
              >
                {loading ? 'Resetting...' : 'Set New Password'}
              </button>
              <button
                type="button"
                onClick={() => setStep('request')}
                className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50"
              >
                Start Over
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-5">
            <Link
              to="/login"
              className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
