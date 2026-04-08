import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useAuth } from '../state/AuthContext'
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
  const { t } = useTranslation()
  const { user } = useAuth()
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
        if (!cancelled) setError(t('impact_load_error'))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const headline = useMemo(() => snapshot?.headline || t('impact_title'), [snapshot, t])

  return (
    <div className="min-h-full text-surface-dark">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium text-brand hover:text-brand-dark">
            {t('back_to_home')}
          </Link>
          <Link to="/login" className="text-sm font-medium text-surface-text hover:text-surface-dark">
            {t('nav_login')}
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
            <MetricCard label={t('impact_girls_served')} value={stats.totalGirlsServed} />
            <MetricCard label={t('impact_active_safehouses')} value={stats.activeSafehouses} />
            <MetricCard label={t('impact_reintegration_rate')} value={`${Math.round(stats.reintegrationRate * 100)}%`} />
            <MetricCard label={t('impact_total_donors')} value={stats.totalDonors} />
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-surface-dark">{t('impact_success_stories')}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: t('impact_story_1_title'),
                text: t('impact_story_1_text'),
              },
              {
                title: t('impact_story_2_title'),
                text: t('impact_story_2_text'),
              },
              {
                title: t('impact_story_3_title'),
                text: t('impact_story_3_text'),
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
                <div className="font-semibold text-surface-dark">{s.title}</div>
                <div className="mt-2 text-sm text-surface-text">{s.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-brand-100 bg-surface p-6 text-surface-dark md:p-8">
          <h2 className="text-xl font-semibold">{t('impact_support_recovery_title')}</h2>
          <p className="mt-2 max-w-2xl text-surface-text">
            {t('impact_support_recovery_text')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {user?.roles?.includes('Donor') || user?.roles?.includes('Admin') ? (
              <Link
                className="inline-flex rounded-md bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-dark"
                to="/donate"
              >
                {t('impact_make_donation')}
              </Link>
            ) : (
              <Link
                className="inline-flex rounded-md bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-dark"
                to="/login"
              >
                {t('impact_login_to_donate')}
              </Link>
            )}
            <a
              className="inline-flex rounded-md border border-brand-100 px-4 py-2 font-semibold text-surface-dark hover:bg-brand-50"
              href="mailto:donations@novapath.org"
            >
              {t('impact_contact_donations_team')}
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
