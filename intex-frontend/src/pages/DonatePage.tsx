import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon, HeartIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavBar } from '../components/NavBar'
import { createMyDonation, getMyDonations, type Donation } from '../lib/api'
import { formatDate, formatUsd } from '../lib/locale'
import { useAuth } from '../state/AuthContext'

export function DonatePage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [amount, setAmount] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingDonation, setPendingDonation] = useState<{
    amount: number
    campaignName?: string
    notes?: string
  } | null>(null)

  const lifetimeGiving = useMemo(
    () => donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [donations]
  )

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const rows = await getMyDonations()
      setDonations(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('donate_load_history_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function onSubmitDonation(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError(t('donate_amount_error'))
      return
    }
    setPendingDonation({
      amount: parsedAmount,
      campaignName: campaignName.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  async function submitConfirmedDonation() {
    if (!pendingDonation) return
    setSubmitting(true)
    setFormError('')
    try {
      await createMyDonation({
        amount: pendingDonation.amount,
        campaignName: pendingDonation.campaignName,
        notes: pendingDonation.notes,
      })
      const amt = pendingDonation.amount
      setPendingDonation(null)
      setSuccessMessage(t('donate_success_popup', { amount: formatUsd(amt, i18n.resolvedLanguage) }))
      setAmount('')
      setCampaignName('')
      setNotes('')
      await loadData()
    } catch (e) {
      setPendingDonation(null)
      const message = e instanceof Error ? e.message : t('donate_submit_error')
      if (message.includes('403')) {
        setFormError(t('donate_unauthorized'))
      } else {
        setFormError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full bg-brand-50 text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-surface-dark">{t('donate_title')}</h1>
            <p className="text-sm text-surface-text">
              {t('donate_subtitle')}
            </p>
          </div>
          <div className="rounded-lg border border-brand-100 bg-white px-4 py-2 text-right shadow-sm">
            <div className="text-xs uppercase tracking-wide text-surface-text">{t('donate_lifetime_giving')}</div>
            <div className="text-xl font-semibold text-surface-dark">{formatUsd(lifetimeGiving, i18n.resolvedLanguage)}</div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-surface-dark">{t('donate_who_title')}</h3>
            <p className="mt-2 text-sm text-surface-text">{t('donate_who_intro')}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-md border border-brand-100 bg-white px-3 py-2 text-sm text-surface-text">{t('donate_who_1')}</div>
              <div className="rounded-md border border-brand-100 bg-white px-3 py-2 text-sm text-surface-text">{t('donate_who_2')}</div>
              <div className="rounded-md border border-brand-100 bg-white px-3 py-2 text-sm text-surface-text">{t('donate_who_3')}</div>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-surface-dark">{t('donate_form_title')}</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmitDonation}>
            <input
              id="donate-amount"
              name="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('donate_amount_placeholder')}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
              required
            />
            <input
              id="donate-campaignName"
              name="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t('donate_campaign_placeholder')}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitting || pendingDonation !== null}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? t('donate_submitting') : t('donate_submit')}
            </button>

            <textarea
              id="donate-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('donate_notes_placeholder')}
              rows={2}
              className="md:col-span-3 rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm"
            />
          </form>
          {formError && <p className="mt-2 text-sm text-red-500">{formError}</p>}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-surface-dark">
              <CalendarIcon className="h-4 w-4 text-brand" />
              {t('donate_history_title')}
            </h2>
            <div className="text-xs text-surface-text">{user?.email}</div>
          </div>

          {loading && <p className="px-5 py-3 text-sm text-surface-text">{t('donate_history_loading')}</p>}
          {!loading && error && <p className="px-5 py-3 text-sm text-red-500">{error}</p>}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-sm text-surface-text">
                  <th className="px-5 py-3 font-medium">{t('table_date')}</th>
                  <th className="px-5 py-3 font-medium">{t('table_designation')}</th>
                  <th className="px-5 py-3 font-medium">{t('table_amount')}</th>
                  <th className="px-5 py-3 font-medium">{t('table_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && donations.length === 0 && (
                  <tr>
                    <td className="px-5 py-4 text-sm text-surface-text" colSpan={4}>
                      {t('donate_no_records')}
                    </td>
                  </tr>
                )}
                {donations.map((d) => (
                  <tr key={d.donationId} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-surface-text">{formatDate(d.donationDate, i18n.resolvedLanguage)}</td>
                    <td className="px-5 py-4 text-sm font-medium text-surface-dark">
                      {d.campaignName || d.designation || t('donate_general_fund')}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-surface-dark">{formatUsd(Number(d.amount), i18n.resolvedLanguage)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        {t('donate_completed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 flex items-center gap-2 text-sm text-surface-text">
          <HeartIcon className="h-4 w-4 text-brand" />
          <span>{t('donate_footer_note')}</span>
          {user?.roles.includes('Admin') ? (
            <Link to="/admin/donations" className="font-medium text-brand hover:text-brand-dark">
              {t('donate_open_admin')}
            </Link>
          ) : null}
        </div>
      </main>

      {pendingDonation ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="donate-confirm-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => !submitting && setPendingDonation(null)}
            aria-label={t('donate_confirm_cancel')}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-2xl">
            <h2 id="donate-confirm-title" className="text-xl font-semibold text-surface-dark">
              {t('donate_confirm_title')}
            </h2>
            <p className="mt-2 text-sm text-surface-text">
              {t('donate_confirm_submit', {
                amount: formatUsd(pendingDonation.amount, i18n.resolvedLanguage),
              })}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPendingDonation(null)}
                className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-50"
              >
                {t('donate_confirm_cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitConfirmedDonation()}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark disabled:opacity-60"
              >
                {submitting ? t('donate_submitting') : t('donate_confirm_yes')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={t('donate_success_title')}>
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setSuccessMessage('')}
            aria-label={t('donate_success_close')}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-surface-dark">{t('donate_success_title')}</h2>
            <p className="mt-2 text-sm text-surface-text">{successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="mt-5 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              {t('donate_success_close')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DonatePage
