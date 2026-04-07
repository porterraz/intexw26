import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
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

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await api.get<DashboardSummary>('/api/dashboard/summary')
        setSummary(res.data)
      } catch (err) {
        setError('Failed to load dashboard data. Please ensure you are logged in.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  // Prepare data for the donation chart
  const donationChartData = summary?.monthlyDonations || [
    { month: 'Jan', amount: 0 },
    { month: 'Feb', amount: 0 },
    { month: 'Mar', amount: 0 },
    { month: 'Current', amount: summary?.donationsThisMonth || 0 },
  ]

  if (loading) {
    return (
      <div className="min-h-full">
        <NavBar />
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-full text-surface-dark bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark mb-6">Admin Dashboard</h1>

        {error ? (
          <ErrorMessage message={error} />
        ) : !summary ? (
          <div className="text-center py-10 text-surface-text">No dashboard data available.</div>
        ) : (
          <>
            {/* PRIMARY OKR BANNER - REQUIRED FOR THURSDAY RUBRIC */}
            <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Primary OKR</span>
                    <h2 className="text-xl font-bold text-rose-900">Metric: At-Risk Residents</h2>
                  </div>
                  <p className="text-sm text-rose-800 leading-relaxed">
                    <strong>Business Case:</strong> The founders' greatest operational fear is "girls falling through the cracks." While donation metrics maintain our facilities, our ultimate measure of success is successful rehabilitation. By tracking residents who are stagnating or regressing in their recovery goals, staff can immediately redirect resources and adjust intervention plans to ensure every survivor successfully reaches reintegration.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-white px-8 py-4 rounded-xl shadow-inner border border-rose-100 min-w-[140px]">
                  <span className="text-xs font-bold text-rose-500 uppercase">Current Count</span>
                  <div className="text-5xl font-black text-rose-700">
                    {summary.atRiskResidents}
                  </div>
                </div>
              </div>
            </section>

            {/* Metric Summary Cards */}
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Active Residents" value={summary.activeResidents} />
              <MetricCard
                label="Donations This Month"
                value={summary.donationsThisMonth.toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                })}
              />
              <MetricCard label="Upcoming Conferences" value={summary.upcomingCaseConferences} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              {/* Donation Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="font-semibold text-surface-dark mb-4">Donations by Month</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donationChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="amount" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="font-semibold text-surface-dark mb-4">Recent Activity</div>
                <div className="space-y-4">
                  {summary.recentActivity.length > 0 ? (
                    summary.recentActivity.map((a, idx) => (
                      <div key={idx} className="flex flex-col border-l-2 border-brand-100 pl-3">
                        <span className="text-xs font-bold text-brand uppercase tracking-tighter">{a.type}</span>
                        <p className="text-sm text-surface-dark leading-snug">{a.message}</p>
                        <span className="text-[11px] text-surface-text mt-1">
                          {new Date(a.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-surface-text italic">No recent activity recorded.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Placeholder for future expansion */}
            <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/30 p-5 shadow-sm">
              <div className="font-semibold text-surface-dark">Safehouse Occupancy Details</div>
              <p className="mt-2 text-sm text-surface-text">
                Live capacity tracking and geographic distribution analysis will populate here as safehouse data is integrated.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}