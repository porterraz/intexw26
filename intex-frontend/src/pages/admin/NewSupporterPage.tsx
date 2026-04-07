import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../components/ErrorMessage'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'

const SUPPORTER_TYPES = [
  'MonetaryDonor',
  'InKindDonor',
  'Volunteer',
  'SkillsContributor',
  'SocialMediaAdvocate',
  'PartnerOrganization',
  'Individual',
  'Corporate',
  'Foundation',
]

const STATUSES = ['Active', 'Inactive', 'Paused']
const RELATIONSHIP_TYPES = ['Local', 'International', 'PartnerOrganization', 'Recurring donor', 'One-time donor']
const ACQUISITION_CHANNELS = ['Website', 'SocialMedia', 'WordOfMouth', 'Event', 'Church', 'PartnerReferral']

type SupporterPayload = {
  supporterType: string
  displayName: string
  organizationName: string | null
  firstName: string | null
  lastName: string | null
  relationshipType: string
  region: string
  country: string
  email: string
  phone: string
  status: string
  firstDonationDate: string | null
  acquisitionChannel: string
}

export function NewSupporterPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SupporterPayload>({
    supporterType: 'MonetaryDonor',
    displayName: '',
    organizationName: null,
    firstName: null,
    lastName: null,
    relationshipType: 'Local',
    region: 'Luzon',
    country: 'Philippines',
    email: '',
    phone: '',
    status: 'Active',
    firstDonationDate: null,
    acquisitionChannel: 'Website',
  })

  function update<K extends keyof SupporterPayload>(key: K, value: SupporterPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
        organizationName: form.organizationName?.trim() || null,
        firstName: form.firstName?.trim() || null,
        lastName: form.lastName?.trim() || null,
      }
      await api.post('/api/supporters', payload)
      navigate('/admin/donors')
    } catch {
      setError('Unable to create supporter. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-brand-50 text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-surface-dark">Add Supporter</h1>

        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
          {error && <ErrorMessage message={error} />}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              placeholder="Display Name"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <select
              value={form.supporterType}
              onChange={(e) => update('supporterType', e.target.value)}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            >
              {SUPPORTER_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <input
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="Email"
              type="email"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="Phone"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.firstName ?? ''}
              onChange={(e) => update('firstName', e.target.value || null)}
              placeholder="First Name (optional)"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.lastName ?? ''}
              onChange={(e) => update('lastName', e.target.value || null)}
              placeholder="Last Name (optional)"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <input
              value={form.organizationName ?? ''}
              onChange={(e) => update('organizationName', e.target.value || null)}
              placeholder="Organization (optional)"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <select
              value={form.relationshipType}
              onChange={(e) => update('relationshipType', e.target.value)}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            >
              {RELATIONSHIP_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <input
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              placeholder="Region"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <input
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              placeholder="Country"
              required
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />

            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            >
              {STATUSES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={form.acquisitionChannel}
              onChange={(e) => update('acquisitionChannel', e.target.value)}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            >
              {ACQUISITION_CHANNELS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <input
              value={form.firstDonationDate ?? ''}
              onChange={(e) => update('firstDonationDate', e.target.value || null)}
              type="date"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Supporter'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/donors')}
              className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold hover:bg-brand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

