import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import { NavBar } from '../../components/NavBar'
import { MetricCard } from '../../components/MetricCard'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { api } from '../../lib/api'

interface DashboardSummary {
  activeResidents: number
  atRiskResidents: number
  donationsThisMonth: number
  upcomingCaseConferences: number
  recentActivity: Array<{
    type: string
    message: string
    timestamp: string
  }>
  monthlyDonations: Array<{
    month: string
    amount: number
  }>
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await api.get<DashboardSummary>('/api/dashboard/summary')
        setSummary(res.data)
      } catch {
        setError(t('admin_load_error'))
      } finally {
        setLoading(false)
      }
    }
    void loadDashboard()
  }, [])

  const donationChartData = useMemo(
    () =>
      summary?.monthlyDonations?.length
        ? summary.monthlyDonations
        : [
            { month: 'N/A', amount: 0 },
            { month: 'Current', amount: summary?.donationsThisMonth || 0 },
          ],
    [summary]
  )

  if (loading) {
    return (
      <div className="min-h-full">
        <NavBar />
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-surface-dark">{t('admin_dashboard_title')}</h1>
            <p className="text-sm text-surface-text">{t('admin_dashboard_subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/donations" className="rounded-md border border-brand-100 px-3 py-2 text-sm font-semibold hover:bg-brand-50">
              {t('admin_donations')}
            </Link>
            <Link to="/admin/reports" className="rounded-md border border-brand-100 px-3 py-2 text-sm font-semibold hover:bg-brand-50">
              {t('admin_reports')}
            </Link>
            <Link to="/admin/residents" className="rounded-md border border-brand-100 px-3 py-2 text-sm font-semibold hover:bg-brand-50">
              {t('admin_caseload')}
            </Link>
          </div>
        </div>

        {error ? (
          <ErrorMessage message={error} />
        ) : !summary ? (
          <div className="py-8 text-center text-surface-text">{t('admin_no_data')}</div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label={t('admin_active_residents')} value={summary.activeResidents} />
              <MetricCard label={t('admin_at_risk_residents')} value={summary.atRiskResidents} />
              <MetricCard label={t('admin_donations_this_month')} value={formatCurrency(summary.donationsThisMonth)} />
              <MetricCard label={t('admin_upcoming_conferences')} value={summary.upcomingCaseConferences} />
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-surface-dark">{t('admin_monthly_donations')}</h2>
                  <span className="text-xs text-surface-text">{t('admin_last_6_months')}</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donationChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: unknown) => formatCurrency(Number(Array.isArray(value) ? value[0] : value || 0))}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="amount" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-surface-dark">{t('admin_recent_activity')}</h2>
                <div className="mt-3 max-h-64 space-y-3 overflow-auto pr-1">
                  {summary.recentActivity.length > 0 ? (
                    summary.recentActivity.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand">{item.type}</div>
                        <p className="mt-1 text-sm text-surface-dark">{item.message}</p>
                        <div className="mt-1 text-xs text-surface-text">{new Date(item.timestamp).toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-surface-text">{t('admin_no_recent_activity')}</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
