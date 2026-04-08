import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarIcon, HeartIcon, TrendingUpIcon } from 'lucide-react'
import { createMyDonation, getMyDonations, getPublicImpactSnapshot, type Donation } from '../lib/api'
import { useAuth } from '../state/AuthContext'

export function DonorDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [activeSafehouses, setActiveSafehouses] = useState<number>(0)
  const [totalDonors, setTotalDonors] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [formError, setFormError] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [notes, setNotes] = useState('')

  const lifetimeGiving = useMemo(
    () => donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [donations]
  )

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [donationRows, snapshot] = await Promise.all([getMyDonations(), getPublicImpactSnapshot()])
      setDonations(donationRows)
      setActiveSafehouses(snapshot.activeSafehouses ?? 0)
      setTotalDonors(snapshot.totalDonors ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load donor dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function onSubmitDonation(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter a valid amount greater than 0.')
      return
    }

    setSubmitting(true)
    try {
      await createMyDonation({
        amount: parsedAmount,
        campaignName: campaignName.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setAmount('')
      setCampaignName('')
      setNotes('')
      await loadData()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to submit donation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-surface-dark">
          {t('Welcome back')}, {user?.email?.split('@')[0] || 'Donor'}
        </h1>
      </div>

      <section id="donate-form" className="bg-surface border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-surface-dark">Make a Donation</h2>
        <form className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={onSubmitDonation}>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (USD)"
            className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            required
          />
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign (optional)"
            className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Donation'}
          </button>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="md:col-span-3 rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            rows={2}
          />
        </form>
        {formError && <p className="mt-2 text-sm text-red-500">{formError}</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-surface border border-slate-200 p-6 rounded-xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 text-brand rounded-lg">
            <HeartIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-surface-text font-medium">Lifetime Giving</p>
            <p className="text-2xl font-bold text-surface-dark">${lifetimeGiving.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-surface border border-slate-200 p-6 rounded-xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-accent/10 text-accent rounded-lg">
            <TrendingUpIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-surface-text font-medium">Active Safehouses Supported</p>
            <p className="text-2xl font-bold text-surface-dark">{activeSafehouses}</p>
          </div>
        </div>
        <div className="bg-surface border border-slate-200 p-6 rounded-xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 text-brand rounded-lg">
            <HeartIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-surface-text font-medium">Community Donors</p>
            <p className="text-2xl font-bold text-surface-dark">{totalDonors}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-surface-dark flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand" />
            My Donation History
          </h2>
          <button className="text-sm text-brand hover:text-brand-dark font-medium" type="button">Download Tax Receipt</button>
        </div>
        {loading && <p className="px-6 py-3 text-sm text-surface-text">Loading donation history...</p>}
        {!loading && error && <p className="px-6 py-3 text-sm text-red-500">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-sm text-surface-text">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Fund Designation</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && donations.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-surface-text" colSpan={4}>
                    No donation records found yet.
                  </td>
                </tr>
              )}
              {donations.map((d) => (
                <tr key={d.donationId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-surface-text">{new Date(d.donationDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-surface-dark">{d.campaignName || d.designation || 'General Fund'}</td>
                  <td className="px-6 py-4 text-surface-dark font-semibold">${Number(d.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DonorDashboard
