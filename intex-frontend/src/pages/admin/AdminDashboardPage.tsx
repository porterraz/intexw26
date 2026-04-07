import { useEffect, useMemo, useState } from 'react'
import { NavBar } from '../../components/NavBar'
import { MetricCard } from '../../components/MetricCard'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { api } from '../../lib/api'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type RecentActivityItem = { timestamp: string; type: string; message: string }
type Summary = {
  activeResidents: number
  donationsThisMonth: number
  upcomingCaseConferences: number
  atRiskResidents: number
  recentActivity: RecentActivityItem[]
}

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<Summary>('/api/dashboard/summary')
        if (!cancelled) setSummary(res.data)
      } catch {
        if (!cancelled) setError('Unable to load dashboard summary.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const donationChartData = useMemo(
    () => [
      { month: 'Jan', amount: 0 },
      { month: 'Feb', amount: 0 },
      { month: 'Mar', amount: 0 },
      { month: 'Apr', amount: summary?.donationsThisMonth ?? 0 },
    ],
    [summary]
  )

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Admin Dashboard</h1>

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : !summary ? (
          <LoadingSpinner />
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricCard label="Active Residents" value={summary.activeResidents} />
              <MetricCard
                label="Donations This Month"
                value={summary.donationsThisMonth.toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                })}
              />
              <MetricCard label="At-Risk Residents" value={summary.atRiskResidents} />
              <MetricCard label="Upcoming Conferences" value={summary.upcomingCaseConferences} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm lg:col-span-2">
                <div className="font-semibold text-surface-dark">Donations by month</div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
                <div className="font-semibold text-surface-dark">Recent activity</div>
                <ul className="mt-3 space-y-3">
                  {summary.recentActivity.map((a, idx) => (
                    <li key={idx} className="text-sm">
                      <div className="text-surface-dark">{a.message}</div>
                      <div className="text-surface-text">
                        {a.type} · {new Date(a.timestamp).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
              <div className="font-semibold text-surface-dark">Safehouse occupancy</div>
              <div className="mt-2 text-sm text-surface-text">
                This table will populate from `GET /api/safehouses` once safehouses are seeded.
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

