import { useEffect, useState } from 'react'
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
    <div className="min-h-full bg-[#060e09] text-white">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Social Media</h1>

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

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
              <div className="text-sm text-slate-300">
                Charts and recent posts table will be wired to `GET /api/social-media/posts` next.
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

