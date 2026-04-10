import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { MetricCard } from '../../components/MetricCard'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'

type BreakdownItem = { label: string; count: number }

type Analytics = {
  totalResidents: number
  activeResidents: number
  atRiskResidents: number
  reintegrationRate: number
  totalDonors: number
  totalDonationsUsd: number
  donationsThisMonth: number
  donationTrend: { month: string; amount: number }[]
  reintegrationBreakdown: BreakdownItem[]
  riskDistribution: BreakdownItem[]
  caseCategoryBreakdown: BreakdownItem[]
}

type Safehouse = {
  safehouseId: number
  name: string
  currentOccupancy: number
  capacityGirls: number
}

type Supporter = {
  supporterId: number
  supporterType: string
  status: string
}

type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number }

const PIE_COLORS = ['#0f766e', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ea580c']
const RISK_COLORS: Record<string, string> = { Low: '#10b981', Medium: '#f59e0b', Moderate: '#f59e0b', High: '#ef4444', Critical: '#7f1d1d' }
const REINTEGRATION_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8', '#8b5cf6', '#ec4899']

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
      <div className="font-semibold text-surface-dark">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function ReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [supporterTotal, setSupporterTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [analyticsRes, safehousesRes, supportersRes] = await Promise.all([
          api.get<Analytics>('/api/dashboard/analytics'),
          api.get<Safehouse[]>('/api/safehouses'),
          api.get<Paged<Supporter>>('/api/supporters', { params: { page: 1, pageSize: 500 } }),
        ])

        if (cancelled) return
        setAnalytics(analyticsRes.data)
        setSafehouses(safehousesRes.data)
        setSupporters(supportersRes.data.items)
        setSupporterTotal(supportersRes.data.totalCount)
      } catch {
        if (!cancelled) setError(t('reports_error_load'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [t])

  const supporterTypeBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of supporters) {
      counts.set(s.supporterType, (counts.get(s.supporterType) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [supporters])

  const safehouseOccupancy = useMemo(
    () =>
      safehouses.map((s) => ({
        name: s.name,
        occupancyPct:
          s.capacityGirls > 0 ? Number(((s.currentOccupancy / s.capacityGirls) * 100).toFixed(1)) : 0,
      })),
    [safehouses]
  )

  const activeSupporters = useMemo(
    () => supporters.filter((s) => s.status.toLowerCase() === 'active').length,
    [supporters]
  )

  const riskChartData = useMemo(() => {
    if (!analytics) return []
    const order = ['Critical', 'High', 'Medium', 'Low']
    return order.map(
      (lvl) => analytics.riskDistribution.find((d) => d.label === lvl) ?? { label: lvl, count: 0 }
    )
  }, [analytics])

  const donationTrendData = useMemo(() => {
    if (!analytics) return []
    return analytics.donationTrend.map((d) => ({
      month: d.month,
      total: Number(Number(d.amount).toFixed(2)),
    }))
  }, [analytics])

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">{t('reports_title')}</h1>

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* ── KPI cards: Donations ── */}
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <button
                type="button"
                onClick={() => navigate('/admin/donors')}
                className="text-left rounded-xl border border-brand-100 bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label={t('reports_open_supporters')}
                title={t('reports_open_supporters')}
              >
                <MetricCard label={t('reports_metric_supporters')} value={supporterTotal} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/donors?status=Active')}
                className="text-left rounded-xl border border-brand-100 bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label={t('reports_open_active_supporters')}
                title={t('reports_open_active_supporters')}
              >
                <MetricCard label={t('reports_metric_active_supporters')} value={activeSupporters} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/donations')}
                className="text-left rounded-xl border border-brand-100 bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label={t('reports_open_donations')}
                title={t('reports_open_donations')}
              >
                <MetricCard label={t('reports_metric_donations_loaded')} value={analytics?.totalDonors ?? 0} />
              </button>
              <MetricCard label={t('reports_metric_donations_this_month')} value={analytics?.donationsThisMonth ?? 0} />
            </section>

            {/* ── KPI cards: Outcomes ── */}
            {analytics && (
              <section className="mt-4 grid gap-4 md:grid-cols-4">
                <MetricCard label="Total Residents" value={analytics.totalResidents} />
                <MetricCard label="Active Residents" value={analytics.activeResidents} />
                <MetricCard label="At-Risk Residents" value={analytics.atRiskResidents} />
                <MetricCard
                  label="Reintegration Rate"
                  value={`${Math.round(analytics.reintegrationRate * 100)}%`}
                />
              </section>
            )}

            {/* ── Donation charts ── */}
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <SectionCard title={t('reports_donations_trend')}>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height={288} minWidth={0}>
                    <BarChart data={donationTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard title={t('reports_supporters_by_type')}>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height={288} minWidth={0}>
                    <PieChart>
                      <Pie data={supporterTypeBreakdown} dataKey="value" nameKey="name" outerRadius={95} label>
                        {supporterTypeBreakdown.map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </section>

            {/* ── Outcomes: Risk distribution + Reintegration breakdown ── */}
            {analytics && (
              <section className="mt-6 grid gap-4 lg:grid-cols-2">
                <SectionCard title="Risk Level Distribution (active residents)">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height={288} minWidth={0}>
                      <BarChart data={riskChartData} layout="vertical" barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {riskChartData.map((d) => (
                            <Cell key={d.label} fill={RISK_COLORS[d.label] ?? '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Reintegration Status Breakdown">
                  {analytics.reintegrationBreakdown.length === 0 ? (
                    <p className="text-sm text-surface-text">No reintegration data available.</p>
                  ) : (
                    <div className="h-72 w-full overflow-visible">
                      <ResponsiveContainer width="100%" height={288} minWidth={0}>
                        <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                          <Pie
                            data={analytics.reintegrationBreakdown}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            label={({ label, percent }: { label: string; percent: number }) =>
                              `${label} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {analytics.reintegrationBreakdown.map((_, i) => (
                              <Cell key={i} fill={REINTEGRATION_COLORS[i % REINTEGRATION_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </SectionCard>
              </section>
            )}

            {/* ── Program performance: Case categories + Safehouse occupancy ── */}
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              {analytics && analytics.caseCategoryBreakdown.length > 0 && (
                <SectionCard title="Case Category Breakdown">
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height={320} minWidth={0}>
                      <BarChart
                        data={analytics.caseCategoryBreakdown}
                        layout="vertical"
                        margin={{ left: 20 }}
                        barSize={18}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={120}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              )}

              <SectionCard title={t('reports_safehouse_occupancy')}>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <BarChart data={safehouseOccupancy} layout="vertical" margin={{ left: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={160} />
                      <Tooltip />
                      <Bar dataKey="occupancyPct" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
