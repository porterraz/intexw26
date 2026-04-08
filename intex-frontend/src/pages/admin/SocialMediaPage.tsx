import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
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
}

function zipDecimal(s: LabelDecimalSeries) {
  return s.labels.map((name, i) => ({ name, value: s.values[i] ?? 0 }))
}

function zipCadence(s: LabelIntSeries) {
  return s.labels.map((name, i) => ({ week: name, posts: s.values[i] ?? 0 }))
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-surface-dark">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-surface-text">{hint}</p> : null}
      <div className="mt-4 h-72 w-full">{children}</div>
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
        if (!cancelled) setError('Unable to load social media analytics from the database.')
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
      referrals: data.postTypeAvgReferrals.values[i] ?? 0,
      engagementScaled:
        ((data.postTypeAvgEngagement.values[i] ?? 0) / maxE) * maxR,
    }))
  }, [data])

  const comboChartData = useMemo(() => {
    if (!data) return []
    return data.topPostTypePlatformCombos.map((c) => ({
      name: c.label.length > 42 ? `${c.label.slice(0, 40)}…` : c.label,
      full: c.label,
      referrals: c.avgReferrals,
    }))
  }, [data])

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Social Media</h1>
        <p className="mt-2 max-w-3xl text-sm text-surface-text">
          Live charts from your database: what to post, which platforms, posting cadence, timing, and
          donation referrals vs engagement. Data from{' '}
          <code className="rounded bg-brand-50 px-1 text-xs">GET /api/social-media/ml-dashboard</code>.
        </p>

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
            <div className="mt-6 grid gap-3 text-sm text-surface-text sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-brand-100 bg-white/80 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Posts in database</div>
                <div className="text-xl font-semibold text-surface-dark">{data.meta.nPosts}</div>
              </div>
              <div className="rounded-xl border border-brand-100 bg-white/80 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Mean posts / week</div>
                <div className="text-xl font-semibold text-surface-dark">
                  {data.meta.weeklyMean.toFixed(1)}
                </div>
              </div>
              <div className="rounded-xl border border-brand-100 bg-white/80 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Median posts / week</div>
                <div className="text-xl font-semibold text-surface-dark">
                  {data.meta.weeklyMedian.toFixed(0)}
                </div>
              </div>
              <div className="rounded-xl border border-brand-100 bg-white/80 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-surface-text">Cadence volatility (std)</div>
                <div className="text-xl font-semibold text-surface-dark">
                  {data.meta.weeklyStd.toFixed(1)}
                </div>
              </div>
            </div>

            <Section
              title="1. What should we post?"
              hint="Average donation referrals by post type (types with at least 8 posts)."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zipDecimal(data.postTypeAvgReferrals)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Avg referrals" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Section title="2a. Which platforms? (avg referrals)" hint="Historical averages — not causal.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zipDecimal(data.platformAvgReferrals)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Avg referrals" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
              <Section
                title="2b. Donation signal rate by platform"
                hint="Share of posts with referral count or a linked gift (ReferralPostId)."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zipDecimal(data.platformDonationSignalRate)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                    <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                    <Bar dataKey="value" name="Signal rate" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            <Section title="3. How often? (posts per ISO week)" hint="Line shows weekly volume over time.">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={zipCadence(data.cadence)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="posts" name="Posts" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Section>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Section title="4a. What time? (by hour)" hint="Average donation referrals by post hour.">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={zipDecimal(data.hourAvgReferrals)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="Avg referrals" stroke="#d97706" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Section>
              <Section title="4b. Day of week" hint="Average donation referrals.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zipDecimal(data.dayOfWeekAvgReferrals)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Avg referrals" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            <Section
              title="5. Donations vs engagement (by post type)"
              hint="Blue: avg donation referrals. Orange: engagement rate scaled to the same vertical scale for comparison."
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dualPostType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={72} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="referrals" name="Avg donation referrals" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engagementScaled" name="Engagement (scaled)" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </Section>

            <Section
              title="6. Strongest post type × platform pairs"
              hint="Top combinations by average donation referrals."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comboChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 9 }} />
                  <Tooltip
                    formatter={(v) => [Number(v).toFixed(2), 'Avg referrals']}
                    labelFormatter={(_, p) => String((p?.[0]?.payload as { full?: string } | undefined)?.full ?? '')}
                  />
                  <Bar dataKey="referrals" name="Avg referrals" fill="#9333ea" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </>
        )}
      </main>
    </div>
  )
}
