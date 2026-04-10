import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'

type LabelDecimalSeries = { labels: string[]; values: number[] }
type LabelIntSeries = { labels: string[]; values: number[] }

type MlInsights = {
  bestPlatform?: string | null
  bestPlatformAvg?: number | null
  bestPostType?: string | null
  bestHour?: number | null
  bestDay?: string | null
  bestTopic?: string | null
  ctaLiftPct?: number | null
  storyLiftPct?: number | null
}

type MlDashboardPayload = {
  meta: {
    nPosts: number
    weeklyMean: number
    weeklyMedian: number
    weeklyStd: number
  }
  platformAvgReferrals: LabelDecimalSeries
  platformDonationSignalRate: LabelDecimalSeries
  postTypeAvgReferrals: LabelDecimalSeries
  postTypeAvgEngagement: LabelDecimalSeries
  hourAvgReferrals: LabelDecimalSeries
  dayOfWeekAvgReferrals: LabelDecimalSeries
  cadence: LabelIntSeries
  topPostTypePlatformCombos: { label: string; avgReferrals: number }[]
  insights?: MlInsights | null
}

function zipDecimal(s: LabelDecimalSeries) {
  return s.labels.map((name, i) => ({ name, value: s.values[i] ?? 0 }))
}

function zipCadence(s: LabelIntSeries) {
  return s.labels.map((name, i) => ({ week: name, posts: s.values[i] ?? 0 }))
}

const CHART_COLORS = ['#4f46e5', '#2563eb', '#0ea5e9', '#059669', '#d97706', '#dc2626', '#9333ea', '#ec4899']

function PlaybookCard({
  label,
  value,
  sub,
  accent = 'indigo',
}: {
  label: string
  value: string
  sub?: string
  accent?: 'indigo' | 'green' | 'amber' | 'sky' | 'purple'
}) {
  const colors = {
    indigo: 'border-indigo-200 bg-indigo-50/60',
    green: 'border-green-200 bg-green-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    sky: 'border-sky-200 bg-sky-50/60',
    purple: 'border-purple-200 bg-purple-50/60',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-surface-text">{label}</div>
      <div className="mt-1 text-xl font-bold text-surface-dark">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-surface-text">{sub}</div>}
    </div>
  )
}

function Section({
  title,
  hint,
  children,
  tall,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  tall?: boolean
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-surface-dark">{title}</h2>
      {hint && <p className="mt-1 text-sm text-surface-text">{hint}</p>}
      <div className={`mt-4 w-full ${tall ? 'h-80' : 'h-64'}`}>{children}</div>
    </section>
  )
}

export function SocialMediaPage() {
  const [data, setData] = useState<MlDashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<MlDashboardPayload>('/api/social-media/ml-dashboard')
        if (!cancelled) setData(res.data)
      } catch {
        if (!cancelled) setError('Unable to load social media analytics.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dualPostType = useMemo(() => {
    if (!data) return []
    const maxR = Math.max(...data.postTypeAvgReferrals.values, 1e-6)
    const maxE = Math.max(...data.postTypeAvgEngagement.values, 1e-6)
    return data.postTypeAvgReferrals.labels.map((name, i) => ({
      name,
      referrals: +(data.postTypeAvgReferrals.values[i] ?? 0).toFixed(2),
      engagement: +(((data.postTypeAvgEngagement.values[i] ?? 0) / maxE) * maxR).toFixed(2),
    }))
  }, [data])

  const comboChartData = useMemo(() => {
    if (!data) return []
    return data.topPostTypePlatformCombos.slice(0, 10).map((c) => ({
      name: c.label.length > 30 ? `${c.label.slice(0, 28)}...` : c.label,
      full: c.label,
      referrals: c.avgReferrals,
    }))
  }, [data])

  const platformPieData = useMemo(() => {
    if (!data) return []
    return zipDecimal(data.platformAvgReferrals)
  }, [data])

  const ins = data?.insights

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-dark">Social Media Strategy</h1>
          <p className="mt-1 text-sm text-surface-text">
            ML-powered recommendations based on {data?.meta.nPosts ?? '...'} posts. What to post, when, and where to maximize donation referrals.
          </p>
        </div>

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : !data ? (
          <div className="mt-10 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* ─── Playbook: the actionable summary ─── */}
            <div className="mt-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-indigo-900">Your Posting Playbook</h2>
              <p className="mt-1 text-sm text-indigo-700/80">
                Based on analysis of {data.meta.nPosts} posts — here's exactly what the data says you should do.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PlaybookCard
                  label="Best content type"
                  value={ins?.bestPostType ?? data.postTypeAvgReferrals.labels[0] ?? '—'}
                  sub={`Highest avg donation referrals`}
                  accent="indigo"
                />
                <PlaybookCard
                  label="Best platform"
                  value={ins?.bestPlatform ?? data.platformAvgReferrals.labels[0] ?? '—'}
                  sub={ins?.bestPlatformAvg != null ? `${ins.bestPlatformAvg.toFixed(1)} avg referrals/post` : undefined}
                  accent="green"
                />
                <PlaybookCard
                  label="Best day & time"
                  value={`${ins?.bestDay ?? data.dayOfWeekAvgReferrals.labels[0] ?? '—'} at ${ins?.bestHour != null ? `${ins.bestHour}:00` : '—'}`}
                  sub="Posts at this time get the most referrals"
                  accent="amber"
                />
                <PlaybookCard
                  label="Best topic"
                  value={ins?.bestTopic ?? '—'}
                  sub="Topic with highest referral rate"
                  accent="sky"
                />
              </div>

              {(ins?.storyLiftPct != null || ins?.ctaLiftPct != null) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {ins?.storyLiftPct != null && ins.storyLiftPct > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/60 px-4 py-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                        {ins.storyLiftPct > 100 ? `${Math.round(ins.storyLiftPct / 100)}x` : `+${Math.round(ins.storyLiftPct)}%`}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-green-900">Include a resident story</div>
                        <div className="text-xs text-green-700/80">
                          Posts featuring a resident story generate {ins.storyLiftPct > 100 ? `${(ins.storyLiftPct / 100).toFixed(1)}x` : `${Math.round(ins.storyLiftPct)}%`} more donation referrals
                        </div>
                      </div>
                    </div>
                  )}
                  {ins?.ctaLiftPct != null && (
                    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${ins.ctaLiftPct > 0 ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${ins.ctaLiftPct > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ins.ctaLiftPct > 0 ? '+' : ''}{Math.round(ins.ctaLiftPct)}%
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${ins.ctaLiftPct > 0 ? 'text-green-900' : 'text-amber-900'}`}>
                          {ins.ctaLiftPct > 0 ? 'Call-to-action helps' : 'Call-to-action impact is mixed'}
                        </div>
                        <div className={`text-xs ${ins.ctaLiftPct > 0 ? 'text-green-700/80' : 'text-amber-700/80'}`}>
                          {ins.ctaLiftPct > 0
                            ? `Adding a CTA boosts referrals by ${Math.round(ins.ctaLiftPct)}%`
                            : `CTA posts show ${Math.abs(Math.round(ins.ctaLiftPct))}% fewer referrals — focus on storytelling instead`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Key metric tiles ─── */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Total posts analyzed</div>
                <div className="text-xl font-semibold text-surface-dark">{data.meta.nPosts}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Avg posts / week</div>
                <div className="text-xl font-semibold text-surface-dark">{data.meta.weeklyMean.toFixed(1)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Median posts / week</div>
                <div className="text-xl font-semibold text-surface-dark">{data.meta.weeklyMedian.toFixed(0)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Cadence volatility</div>
                <div className="text-xl font-semibold text-surface-dark">{data.meta.weeklyStd.toFixed(1)}</div>
              </div>
            </div>

            {/* ─── Charts: What to Post ─── */}
            <h2 className="mt-8 text-lg font-bold text-surface-dark">What to Post</h2>
            <p className="mt-1 text-sm text-surface-text">Which content types and platforms drive the most donation referrals.</p>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <Section title="Referrals by Post Type" hint="Post types with at least 8 posts. Higher = more donation referrals per post.">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={zipDecimal(data.postTypeAvgReferrals)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Avg referrals" radius={[6, 6, 0, 0]}>
                      {zipDecimal(data.postTypeAvgReferrals).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Referrals by Platform" hint="Which platform delivers the most donation referrals per post.">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={platformPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${(+value).toFixed(1)}`}
                    >
                      {platformPieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Section>
            </div>

            <div className="mt-6">
              <Section title="Referrals vs Engagement by Post Type" hint="Blue bars = avg donation referrals. Orange bars = engagement rate (scaled). High referrals + high engagement = your sweet spot.">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <ComposedChart data={dualPostType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="referrals" name="Avg donation referrals" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" name="Engagement (scaled)" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* ─── Charts: When to Post ─── */}
            <h2 className="mt-8 text-lg font-bold text-surface-dark">When to Post</h2>
            <p className="mt-1 text-sm text-surface-text">Timing matters. These charts show when posts generate the most donation referrals.</p>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <Section title="Best Hour of Day" hint="Average donation referrals by hour posted. Find the peak.">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={zipDecimal(data.hourAvgReferrals)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Avg referrals" fill="#d97706" radius={[4, 4, 0, 0]}>
                      {zipDecimal(data.hourAvgReferrals).map((entry, i) => (
                        <Cell
                          key={i}
                          fill={ins?.bestHour != null && entry.name === `${String(ins.bestHour).padStart(2, '0')}:00` ? '#059669' : '#d97706'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Best Day of Week" hint="Average donation referrals by day. Plan your content calendar around the peak days.">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={zipDecimal(data.dayOfWeekAvgReferrals)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Avg referrals" fill="#2563eb" radius={[6, 6, 0, 0]}>
                      {zipDecimal(data.dayOfWeekAvgReferrals).map((entry, i) => (
                        <Cell
                          key={i}
                          fill={ins?.bestDay != null && entry.name === ins.bestDay ? '#059669' : '#2563eb'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* ─── Charts: How Often & Best Combos ─── */}
            <h2 className="mt-8 text-lg font-bold text-surface-dark">Posting Cadence & Top Combinations</h2>
            <p className="mt-1 text-sm text-surface-text">How consistently you post, and which post type + platform combos perform best.</p>

            <div className="mt-4">
              <Section title="Posts per Week Over Time" hint="Consistency matters for audience growth. Gaps in posting can hurt reach." tall>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={zipCadence(data.cadence)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="posts" name="Posts" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Section>
            </div>

            <div className="mt-6">
              <Section title="Top 10 Post Type + Platform Combos" hint="The specific combinations that generate the most donation referrals. Focus on the top ones." tall>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={comboChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => [(+v).toFixed(2), 'Avg referrals']}
                      labelFormatter={(_, p) => String((p?.[0]?.payload as { full?: string } | undefined)?.full ?? '')}
                    />
                    <Bar dataKey="referrals" name="Avg referrals" radius={[0, 6, 6, 0]}>
                      {comboChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-surface-text">
              <strong>How to read this page:</strong> The Posting Playbook at the top gives you the specific actions.
              The charts below provide the supporting evidence. All data is computed from your {data.meta.nPosts} posts
              in the database. The ML model (Random Forest, R&sup2; = 0.58) predicts donation referrals with 36% better
              accuracy than guessing the average. Refresh nightly via the automated pipeline.
            </div>
          </>
        )}
      </main>
    </div>
  )
}
