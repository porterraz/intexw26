import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { NavBar } from '../../components/NavBar'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { api } from '../../lib/api'
import { formatDateTime, formatCompactUsd } from '../../lib/locale'

// ── types ──

interface BreakdownItem { label: string; count: number }
interface PlatformReach { platform: string; totalReach: number; avgEngagementRate: number }

interface Analytics {
  totalResidents: number
  activeResidents: number
  atRiskResidents: number
  reintegrationRate: number
  totalDonors: number
  totalDonationsUsd: number
  donationsThisMonth: number
  donationTrend: { month: string; amount: number }[]
  socialMediaTrend: { month: string; reach: number; engagementRate: number }[]
  reintegrationBreakdown: BreakdownItem[]
  riskDistribution: BreakdownItem[]
  caseCategoryBreakdown: BreakdownItem[]
  platformReach: PlatformReach[]
  recentActivity: { type: string; message: string; timestamp: string }[]
}

// ── palette ──

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']
const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8']
const RISK_COLORS: Record<string, string> = { Low: '#10b981', Moderate: '#f59e0b', High: '#ef4444', Critical: '#7f1d1d' }

// ── tiny stat card ──

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

// ── chart wrapper ──

function ChartCard({ title, subtitle, span = 1, children }: { title: string; subtitle?: string; span?: number; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${span === 2 ? 'lg:col-span-2' : ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

// ── custom tooltip ──

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="text-slate-900">${payload[0].value.toLocaleString()}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Analytics>('/api/dashboard/analytics')
      .then(r => setData(r.data))
      .catch(() => setError(t('admin_load_error')))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) return <div className="min-h-full"><NavBar /><LoadingSpinner /></div>

  return (
    <div className="min-h-full bg-slate-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('admin_dashboard_title')}</h1>
          <p className="text-sm text-slate-500">{t('admin_dashboard_subtitle')}</p>
        </div>

        {error ? <ErrorMessage message={error} /> : !data ? (
          <div className="py-8 text-center text-slate-500">{t('admin_no_data')}</div>
        ) : (
          <div className="space-y-6">

            {/* ── KPI row ── */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label={t('admin_total_residents')} value={data.totalResidents} />
              <StatCard label={t('admin_active_residents')} value={data.activeResidents} />
              <StatCard label={t('admin_at_risk_residents')} value={data.atRiskResidents} />
              <StatCard
                label={t('admin_reintegration_rate')}
                value={`${Math.round(data.reintegrationRate * 100)}%`}
                sub={t('admin_reintegration_sub')}
              />
              <StatCard label={t('admin_total_donors')} value={data.totalDonors} />
              <StatCard
                label={t('admin_total_donations')}
                value={formatCompactUsd(data.totalDonationsUsd, lang)}
              />
            </section>

            {/* ── Row 2: Donation trend + Reintegration pie ── */}
            <section className="grid gap-4 lg:grid-cols-3">
              <ChartCard title={t('admin_donation_trend')} subtitle={t('admin_last_12_months')} span={2}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.donationTrend}>
                      <defs>
                        <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#donGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title={t('admin_reintegration_breakdown')}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.reintegrationBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        label={(props: Record<string, unknown>) => `${props.label} ${((props.percent as number) * 100).toFixed(0)}%`}
                      >
                        {data.reintegrationBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </section>

            {/* ── Row 3: Social media reach + Risk distribution ── */}
            <section className="grid gap-4 lg:grid-cols-3">
              <ChartCard title={t('admin_social_reach_trend')} subtitle={t('admin_last_12_months')} span={2}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.socialMediaTrend}>
                      <defs>
                        <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={28} />
                      <Area yAxisId="left" type="monotone" dataKey="reach" name={t('admin_reach')} stroke="#8b5cf6" strokeWidth={2} fill="url(#reachGrad)" />
                      <Area yAxisId="right" type="monotone" dataKey="engagementRate" name={t('admin_engagement')} stroke="#f59e0b" strokeWidth={2} fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title={t('admin_risk_distribution')}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.riskDistribution} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.riskDistribution.map((d, i) => (
                          <Cell key={i} fill={RISK_COLORS[d.label] ?? '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </section>

            {/* ── Row 4: Case categories + Platform reach + Recent activity ── */}
            <section className="grid gap-4 lg:grid-cols-3">
              <ChartCard title={t('admin_case_categories')}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.caseCategoryBreakdown} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={95} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.caseCategoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title={t('admin_platform_reach')}>
                <div className="space-y-3">
                  {data.platformReach.map((p, i) => (
                    <div key={p.platform} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{p.platform}</span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${COLORS[i % COLORS.length]}15`, color: COLORS[i % COLORS.length] }}>
                          {p.avgEngagementRate.toFixed(2)}% eng
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-slate-900">{p.totalReach.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400">{t('admin_total_reach')}</p>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title={t('admin_recent_activity')}>
                <div className="max-h-64 space-y-2.5 overflow-auto pr-1">
                  {data.recentActivity.length > 0 ? data.recentActivity.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{item.type}</div>
                      <p className="mt-0.5 text-xs text-slate-700">{item.message}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{formatDateTime(item.timestamp, lang)}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400">{t('admin_no_recent_activity')}</p>
                  )}
                </div>
              </ChartCard>
            </section>

          </div>
        )}
      </main>
    </div>
  )
}
