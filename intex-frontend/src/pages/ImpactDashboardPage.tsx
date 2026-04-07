import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { MetricCard } from '../components/MetricCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'

type PublicImpactSnapshot = {
  snapshotId: number
  snapshotDate: string
  headline: string
  summaryText: string
  metricPayloadJson: string
  isPublished: boolean
  publishedAt: string | null
}

type PublicStats = {
  totalGirlsServed: number
  activeSafehouses: number
  reintegrationRate: number
  totalDonors: number
  totalDonationsUsd: number
}

function tryParseMetrics(snapshot: PublicImpactSnapshot | null): Partial<PublicStats> | null {
  if (!snapshot?.metricPayloadJson) return null
  try {
    const obj = JSON.parse(snapshot.metricPayloadJson) as Record<string, unknown>
    const n = (v: unknown) => (typeof v === 'number' ? v : undefined)
    return {
      totalGirlsServed: n(obj.totalGirlsServed),
      activeSafehouses: n(obj.activeSafehouses),
      reintegrationRate: n(obj.reintegrationRate),
      totalDonors: n(obj.totalDonors),
    }
  } catch {
    return null
  }
}

export function ImpactDashboardPage() {
  const [snapshot, setSnapshot] = useState<PublicImpactSnapshot | null>(null)
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [impactRes, statsRes] = await Promise.allSettled([
          api.get<PublicImpactSnapshot>('/api/public/impact'),
          api.get<PublicStats>('/api/public/stats'),
        ])

        const impact = impactRes.status === 'fulfilled' ? impactRes.value.data : null
        const baseStats = statsRes.status === 'fulfilled' ? statsRes.value.data : null

        const metricsFromImpact = tryParseMetrics(impact)
        const merged = baseStats
          ? { ...baseStats, ...metricsFromImpact }
          : (metricsFromImpact as PublicStats | null)

        if (!cancelled) {
          setSnapshot(impact)
          setStats(merged)
        }
      } catch {
        if (!cancelled) setError('Unable to load impact data right now.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const headline = useMemo(() => snapshot?.headline || 'Our Impact', [snapshot])

  return (
    <div className="min-h-full text-surface-dark">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to home
          </Link>
          <Link to="/login" className="text-sm font-medium text-surface-text hover:text-surface-dark">
            Login
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-surface-dark">{headline}</h1>
        {snapshot?.summaryText && <p className="mt-2 max-w-3xl text-surface-text">{snapshot.summaryText}</p>}

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : !stats ? (
          <LoadingSpinner />
        ) : (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Girls Served" value={stats.totalGirlsServed} />
            <MetricCard label="Active Safehouses" value={stats.activeSafehouses} />
            <MetricCard label="Reintegration Rate" value={`${Math.round(stats.reintegrationRate * 100)}%`} />
            <MetricCard label="Total Donors" value={stats.totalDonors} />
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-surface-dark">Success stories</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Finding safety and stability',
                text: 'A survivor entered care, completed a safety plan, and reconnected with school support—without revealing identifying details.',
              },
              {
                title: 'Rebuilding trust',
                text: 'Through consistent counseling sessions and advocacy, a young person regained routines and confidence over time.',
              },
              {
                title: 'A path to reintegration',
                text: 'With coordinated follow-ups and family engagement, a case progressed toward reintegration with ongoing monitoring.',
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
                <div className="font-semibold text-surface-dark">{s.title}</div>
                <div className="mt-2 text-sm text-surface-text">{s.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-brand-100 bg-surface p-6 text-surface-dark md:p-8">
          <h2 className="text-xl font-semibold">Support recovery</h2>
          <p className="mt-2 max-w-2xl text-surface-text">
            Donations fund safe housing, clinical support, education planning, and reintegration services. All public reporting is anonymized.
          </p>
          <div className="mt-5">
            <a
              className="inline-flex rounded-md bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-dark"
              href="mailto:donations@novapath.org"
            >
              Contact to Donate
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}

