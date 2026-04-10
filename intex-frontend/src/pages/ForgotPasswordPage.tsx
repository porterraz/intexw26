import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { requestPasswordReset, resetPasswordRequest } from '../lib/api'

function meetsPasswordPolicy(password: string): boolean {
  return password.trim().length >= 14
}

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const passwordPolicyHint = useMemo(
    () => t('reset_password_policy_hint'),
    [t]
  )

  async function onRequestReset(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim()) {
      setError(t('reset_email_required'))
      return
    }
    const confirmed = window.confirm('Are you sure you want to request a password reset for this account?')
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await requestPasswordReset(email.trim())
      setResetToken(res.resetToken ?? '')
      setInfo(t('reset_continue_info'))
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reset_request_error'))
    } finally {
      setLoading(false)
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim() || !newPassword) {
      setError(t('reset_email_password_required'))
      return
    }

    if (!meetsPasswordPolicy(newPassword)) {
      setError(passwordPolicyHint)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('reset_password_mismatch'))
      return
    }
    const confirmed = window.confirm('Are you sure you want to reset this password?')
    if (!confirmed) return

    setLoading(true)
    try {
      await resetPasswordRequest(email.trim(), newPassword, resetToken || undefined)
      setStep('done')
      setInfo(t('reset_success'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reset_submit_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 text-surface-dark flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-brand-100 bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold">{t('reset_title')}</h1>
        <p className="mt-2 text-sm text-surface-text">
          {t('reset_subtitle')}
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
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
                placeholder={t('reset_email_placeholder')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? t('reset_continuing') : t('reset_continue')}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form className="mt-5 space-y-3" onSubmit={onResetPassword}>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="reset-email-confirm">Email</label>
              <input
                id="reset-email-confirm"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                readOnly
                className="w-full rounded-md border border-brand-100 bg-slate-50 px-3 py-2 text-sm text-surface-text"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="new-password">
                {t('reset_new_password')}
              </label>
              <input
                id="new-password"
                name="newPassword"
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
                {t('reset_confirm_new_password')}
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
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
                {loading ? t('reset_resetting') : t('reset_set_new_password')}
              </button>
              <button
                type="button"
                onClick={() => setStep('request')}
                className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50"
              >
                {t('reset_start_over')}
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
              {t('reset_back_to_login')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
