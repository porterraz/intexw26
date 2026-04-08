import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../state/AuthContext'

export function MfaSetupPage() {
  const { user, pendingMfa, hasRole, getMfaSetup, enableMfa, verifyMfa } = useAuth()
  const navigate = useNavigate()
  const [uri, setUri] = useState('')
  const [sharedKey, setSharedKey] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  function consumePostLoginRedirect(): string | null {
    const raw = sessionStorage.getItem('np_post_login_redirect')
    if (!raw) return null
    sessionStorage.removeItem('np_post_login_redirect')
    if (!raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  }

  useEffect(() => {
    let active = true
    async function load() {
      setError('')
      if (!user) {
        if (!active) return
        setUri(pendingMfa?.authenticatorUri ?? '')
        setSharedKey(pendingMfa?.sharedKey ?? '')
        setLoading(false)
        return
      }
      try {
        const data = await getMfaSetup()
        if (!active) return
        setUri(data.authenticatorUri ?? '')
        setSharedKey(data.sharedKey ?? '')
      } catch (err: unknown) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load MFA setup details.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [getMfaSetup, pendingMfa, user])

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter a valid 6-digit authenticator code.')
      return
    }
    setSaving(true)
    try {
      if (user) {
        await enableMfa(code.trim())
        setSuccess('MFA is now enabled for your account.')
      } else {
        const loggedInUser = await verifyMfa(code.trim())
        setSuccess('MFA setup complete. Signing you in...')
        const target = consumePostLoginRedirect() ?? (loggedInUser.roles.includes('Admin') ? '/admin' : '/donor/dashboard')
        navigate(target, { replace: true })
      }
      setCode('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to enable MFA.')
    } finally {
      setSaving(false)
    }
  }

  if (!user && !pendingMfa) return <Navigate to="/login" replace />
  if (user && !hasRole('Admin')) return <Navigate to="/donor/dashboard" replace />

  return (
    <div className="min-h-screen bg-brand-50 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-brand-100 bg-surface p-8 shadow-sm">
        <div className="mb-4">
          <Link to={user ? '/admin' : '/login'} className="text-sm font-medium text-brand hover:text-brand-dark">
            {user ? '← Back to dashboard' : '← Back to login'}
          </Link>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {user ? 'Admin Security' : 'First-Time MFA Setup'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-surface-dark">Set up authenticator MFA</h1>
        <p className="mt-2 text-sm text-surface-text">
          Scan the QR code with your authenticator app, then enter your first 6-digit code to continue.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-surface-text">Loading setup...</p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr] md:items-start">
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-3">
              {uri ? (
                <QRCodeSVG value={uri} size={196} bgColor="transparent" fgColor="#0f172a" />
              ) : (
                <p className="text-sm text-surface-text">No QR code URI returned by the API.</p>
              )}
            </div>

            <div>
              {sharedKey && (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-surface-text">
                  <p className="font-medium text-surface-dark">Manual key</p>
                  <p className="mt-1 break-all font-mono text-xs">{sharedKey}</p>
                </div>
              )}

              <form className="mt-4 space-y-3" onSubmit={onVerify}>
                <label htmlFor="setup-code" className="block text-sm font-medium text-surface-text">
                  First authenticator code
                </label>
                <input
                  id="setup-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="w-full rounded-xl border border-brand-100 bg-surface px-4 py-3 text-lg tracking-[0.3em] text-surface-dark outline-none focus:border-brand"
                />

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-emerald-600">{success}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
                >
                  {saving ? 'Verifying...' : user ? 'Enable MFA' : 'Verify and continue'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
