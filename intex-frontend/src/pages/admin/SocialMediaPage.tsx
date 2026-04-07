import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { NavBar } from '../../components/NavBar'
import { MetricCard } from '../../components/MetricCard'
import { api } from '../../lib/api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'

type AvgItem = { platform: string; avgEngagementRate: number }
type Analytics = {
  topPlatformByEngagement: string | null
  topPostTypeByDonations: string | null
  avgEngagementRateByPlatform: AvgItem[]
  bestPostingHour: number | null
  bestDayOfWeek: string | null
}

export function SocialMediaPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<Analytics>('/api/social-media/analytics')
        if (!cancelled) setData(res.data)
      } catch {
        if (!cancelled) setError('Unable to load social media analytics.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Social Media</h1>

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : !data ? (
          <LoadingSpinner />
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricCard label="Best Platform" value={data.topPlatformByEngagement ?? '—'} />
              <MetricCard label="Best Post Type" value={data.topPostTypeByDonations ?? '—'} />
              <MetricCard label="Best Posting Hour" value={data.bestPostingHour ?? '—'} />
              <MetricCard label="Best Day" value={data.bestDayOfWeek ?? '—'} />
            </section>

            <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
              <div className="mb-3 font-semibold text-surface-dark">Average engagement by platform</div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.avgEngagementRateByPlatform}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgEngagementRate" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-sm text-surface-text">
                This chart uses live data from `/api/social-media/analytics`.
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

