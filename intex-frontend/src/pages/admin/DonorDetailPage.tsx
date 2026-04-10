import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { NavBar } from '../../components/NavBar'
import {
  api,
  getDonationsForSupporter,
  getSupporterById,
  getSupporterSegment,
  getChurnPrediction,
  type Donation,
  type DonorSegment,
  type ChurnPrediction,
  type SupporterDetail,
} from '../../lib/api'
import { useAuth } from '../../state/AuthContext'

const personaColors: Record<string, string> = {
  Champions: 'bg-green-100 text-green-800 border-green-300',
  'Steady Supporters': 'bg-blue-100 text-blue-800 border-blue-300',
  'Light Givers': 'bg-amber-100 text-amber-800 border-amber-300',
}

const churnColors: Record<string, { badge: string; bg: string }> = {
  Low: { badge: 'bg-green-100 text-green-800 border-green-300', bg: 'border-green-200' },
  Medium: { badge: 'bg-amber-100 text-amber-800 border-amber-300', bg: 'border-amber-200' },
  High: { badge: 'bg-red-100 text-red-800 border-red-300', bg: 'border-red-200' },
}

type SupporterFormState = {
  displayName: string
  supporterType: string
  organizationName: string
  firstName: string
  lastName: string
  relationshipType: string
  region: string
  country: string
  email: string
  phone: string
  status: string
  acquisitionChannel: string
}

function mapSupporterToForm(s: SupporterDetail): SupporterFormState {
  return {
    displayName: s.displayName ?? '',
    supporterType: s.supporterType ?? '',
    organizationName: s.organizationName ?? '',
    firstName: s.firstName ?? '',
    lastName: s.lastName ?? '',
    relationshipType: s.relationshipType ?? '',
    region: s.region ?? '',
    country: s.country ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    status: s.status ?? '',
    acquisitionChannel: s.acquisitionChannel ?? '',
  }
}

export function DonorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('Admin')
  const supporterId = Number(id)
  const [supporter, setSupporter] = useState<SupporterDetail | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [segment, setSegment] = useState<DonorSegment | null>(null)
  const [churn, setChurn] = useState<ChurnPrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<SupporterFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const lifetimeGiving = useMemo(
    () => donations.reduce((sum, d) => sum + (Number(d.amount ?? d.estimatedValue ?? 0) || 0), 0),
    [donations]
  )

  function updateForm<K extends keyof SupporterFormState>(key: K, value: SupporterFormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  useEffect(() => {
    let active = true
    if (!Number.isFinite(supporterId)) {
      setError('Invalid supporter id.')
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const [detail, seg, churnData] = await Promise.all([
          getSupporterById(supporterId),
          getSupporterSegment(supporterId),
          getChurnPrediction(supporterId),
        ])
        if (!active) return
        setSupporter(detail)
        setForm(mapSupporterToForm(detail))
        setSegment(seg)
        setChurn(churnData)

        if (Array.isArray(detail.donations) && detail.donations.length > 0) {
          const sorted = [...detail.donations].sort(
            (a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime()
          )
          setDonations(sorted)
        } else {
          const rows = await getDonationsForSupporter(supporterId)
          if (!active) return
          setDonations(rows)
        }
      } catch {
        if (!active) return
        setError('Unable to load supporter details.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [supporterId])

  function handleStartEdit() {
    if (!supporter) return
    if (!window.confirm('Are you sure you want to edit this donor\'s information?')) return
    setSaveError(null)
    setForm(mapSupporterToForm(supporter))
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (!window.confirm('Discard unsaved changes?')) return
    if (supporter) setForm(mapSupporterToForm(supporter))
    setSaveError(null)
    setIsEditing(false)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!supporter || !form) return
    if (!window.confirm('Save changes to this donor record?')) return
    setSaveError(null)
    setSaving(true)
    try {
      const payload = {
        supporterId,
        displayName: form.displayName.trim(),
        supporterType: form.supporterType.trim(),
        organizationName: form.organizationName.trim() || null,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        relationshipType: form.relationshipType.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status.trim(),
        acquisitionChannel: form.acquisitionChannel.trim(),
        firstDonationDate: supporter.firstDonationDate ?? null,
        createdAt: supporter.createdAt ?? new Date().toISOString(),
      }
      await api.put(`/api/supporters/${supporterId}`, payload)
      const updated = await getSupporterById(supporterId)
      setSupporter(updated)
      setForm(mapSupporterToForm(updated))
      setIsEditing(false)
    } catch {
      setSaveError('Unable to save changes. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this donor? This cannot be undone.')) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.delete(`/api/supporters/${supporterId}`, { params: { confirm: true } })
      navigate('/admin/donors')
    } catch {
      setDeleteError('Unable to delete this donor.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/admin/donors" className="text-sm font-semibold text-surface-text hover:text-surface-dark">
          ← Back to donors
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-surface-dark">Donor Detail</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm text-surface-text">SupporterId: {id}</span>
          {isAdmin && supporter && !loading && !error ? (
            <>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-md border border-brand-100 bg-surface px-3 py-1.5 text-sm font-semibold text-surface-dark hover:bg-brand-50"
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting || saving}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            </>
          ) : null}
        </div>
        {deleteError ? <div className="mt-2"><ErrorMessage message={deleteError} /></div> : null}

        {isEditing && form && supporter ? (
          <form
            onSubmit={(e) => void handleSave(e)}
            className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-surface-dark">Editing Donor</h2>
            {saveError ? (
              <div className="mt-3">
                <ErrorMessage message={saveError} />
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                name="displayName"
                value={form.displayName}
                onChange={(e) => updateForm('displayName', e.target.value)}
                placeholder="Display Name"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <select
                name="supporterType"
                value={form.supporterType}
                onChange={(e) => updateForm('supporterType', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                <option value="Individual">Individual</option>
                <option value="Organization">Organization</option>
                <option value="Foundation">Foundation</option>
                <option value="Corporate">Corporate</option>
                <option value="Church">Church</option>
              </select>
              <input
                name="firstName"
                value={form.firstName}
                onChange={(e) => updateForm('firstName', e.target.value)}
                placeholder="First Name"
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="lastName"
                value={form.lastName}
                onChange={(e) => updateForm('lastName', e.target.value)}
                placeholder="Last Name"
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="organizationName"
                value={form.organizationName}
                onChange={(e) => updateForm('organizationName', e.target.value)}
                placeholder="Organization Name (optional)"
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="Email"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="Phone"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <select
                name="status"
                value={form.status}
                onChange={(e) => updateForm('status', e.target.value)}
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Lapsed">Lapsed</option>
              </select>
              <input
                name="relationshipType"
                value={form.relationshipType}
                onChange={(e) => updateForm('relationshipType', e.target.value)}
                placeholder="Relationship Type"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="acquisitionChannel"
                value={form.acquisitionChannel}
                onChange={(e) => updateForm('acquisitionChannel', e.target.value)}
                placeholder="Acquisition Channel"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="region"
                value={form.region}
                onChange={(e) => updateForm('region', e.target.value)}
                placeholder="Region"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
              <input
                name="country"
                value={form.country}
                onChange={(e) => updateForm('country', e.target.value)}
                placeholder="Country"
                required
                className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? '…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold hover:bg-brand-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : loading ? (
          <div className="mt-6">
            <LoadingSpinner />
          </div>
        ) : !isEditing ? (
          <>
            <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Name</div>
                  <div className="mt-1 text-sm font-semibold text-surface-dark">{supporter?.displayName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Type</div>
                  <div className="mt-1 text-sm text-surface-dark">{supporter?.supporterType ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Status</div>
                  <div className="mt-1 text-sm text-surface-dark">{supporter?.status ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Lifetime Giving</div>
                  <div className="mt-1 text-sm font-semibold text-surface-dark">${lifetimeGiving.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Email</div>
                  <div className="mt-1 text-sm text-surface-dark">{supporter?.email ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Phone</div>
                  <div className="mt-1 text-sm text-surface-dark">{supporter?.phone ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">Region</div>
                  <div className="mt-1 text-sm text-surface-dark">
                    {supporter ? `${supporter.region}, ${supporter.country}` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-text">First Donation</div>
                  <div className="mt-1 text-sm text-surface-dark">
                    {supporter?.firstDonationDate
                      ? new Date(supporter.firstDonationDate).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
              </div>
            </section>

            {segment?.persona && (
              <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-surface-dark">Donor Persona</h2>
                <p className="mt-1 text-sm text-surface-text">
                  ML-powered segment based on recency, frequency, and monetary value.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${personaColors[segment.persona] ?? 'bg-slate-100 text-slate-800 border-slate-300'}`}
                  >
                    {segment.persona}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-surface-text">Recency</div>
                    <div className="mt-1 text-lg font-semibold text-surface-dark">
                      {segment.recency ?? '—'} <span className="text-xs font-normal text-surface-text">days</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-surface-text">Frequency</div>
                    <div className="mt-1 text-lg font-semibold text-surface-dark">
                      {segment.frequency ?? '—'} <span className="text-xs font-normal text-surface-text">donations</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-surface-text">Monetary</div>
                    <div className="mt-1 text-lg font-semibold text-surface-dark">
                      ${(segment.monetary ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {churn?.churnRisk && (
              <section className={`mt-6 rounded-2xl border bg-surface p-5 shadow-sm ${churnColors[churn.churnRisk]?.bg ?? 'border-brand-100'}`}>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-surface-dark">Churn Risk</h2>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${churnColors[churn.churnRisk]?.badge ?? 'bg-slate-100 text-slate-800 border-slate-300'}`}
                  >
                    {churn.churnRisk}
                  </span>
                  {churn.churnProbability != null && (
                    <span className="text-xs text-surface-text">
                      ({(churn.churnProbability * 100).toFixed(0)}% probability)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-surface-text">
                  ML-predicted likelihood this donor will stop contributing.
                </p>

                {churn.riskFactors && churn.riskFactors.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-surface-dark">Risk Factors</h3>
                    <ul className="mt-2 space-y-1">
                      {churn.riskFactors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-surface-text">
                          <span className="mt-0.5 text-red-500">⚠</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {churn.recommendations && churn.recommendations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-surface-dark">Recommended Actions</h3>
                    <ul className="mt-2 space-y-1">
                      {churn.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-surface-text">
                          <span className="mt-0.5 text-green-600">→</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-surface-dark">Donation History</h2>
              {donations.length === 0 ? (
                <p className="mt-3 text-sm text-surface-text">No donations recorded for this supporter.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-surface-text">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Campaign</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Recurring</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {donations.map((d) => (
                        <tr key={d.donationId}>
                          <td className="px-3 py-2 text-surface-text">
                            {new Date(d.donationDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-surface-dark">{d.campaignName || 'General Fund'}</td>
                          <td className="px-3 py-2 font-semibold text-surface-dark">
                            ${Number(d.amount ?? d.estimatedValue ?? 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-surface-text">{d.isRecurring ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}
