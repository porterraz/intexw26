import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getResidentRecommendations } from '../../lib/api'
import { NavBar } from '../../components/NavBar'

export function ResidentDetailPage() {
  const { id } = useParams()
  const residentId = Number(id)
  const [recommendations, setRecommendations] = useState<number[] | null>(null)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadRecommendations() {
      if (!Number.isFinite(residentId)) return
      setRecommendationsLoading(true)
      setRecommendationsError(null)

      try {
        const data = await getResidentRecommendations(residentId)
        if (!active) return
        setRecommendations(data)
      } catch {
        if (!active) return
        setRecommendationsError('Unable to load AI matches right now.')
      } finally {
        if (active) setRecommendationsLoading(false)
      }
    }

    void loadRecommendations()
    return () => {
      active = false
    }
  }, [residentId])

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/admin/residents" className="text-sm font-semibold text-surface-text hover:text-surface-dark">
          ← Back to caseload
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-surface-dark">Resident Detail</h1>
        <div className="mt-2 text-sm text-surface-text">ResidentId: {id}</div>

        <div className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
          <div className="text-sm text-surface-text">
            Detail layout + tabs (Process Recordings / Home Visitations) will be wired to `GET /api/residents/{id}`.
          </div>
        </div>

        <section className="mt-6 rounded-2xl bg-surface border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-surface-dark">AI-Assisted Peer Matches</h2>
          <p className="mt-1 text-sm text-surface-text">
            Suggested peer connections based on the latest recommendation model output.
          </p>

          {recommendationsLoading ? (
            <p className="mt-4 text-sm text-surface-text">Loading recommendations...</p>
          ) : recommendationsError ? (
            <p className="mt-4 text-sm text-red-500">{recommendationsError}</p>
          ) : recommendations === null ? (
            <p className="mt-4 text-sm text-surface-text">
              No recommendation data is available yet for this resident.
            </p>
          ) : recommendations.length === 0 ? (
            <p className="mt-4 text-sm text-surface-text">No peer matches were found for this resident.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendations.map((recommendedId) => (
                <span
                  key={recommendedId}
                  className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-surface-dark"
                >
                  Resident #{recommendedId}
                </span>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

