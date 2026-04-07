import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'
import { createHomeVisitation, getCaseConferences, getHomeVisitations, type HomeVisitation } from '../../lib/api'

export function VisitationPage() {
  const { residentId } = useParams()
  const parsedResidentId = useMemo(() => Number(residentId), [residentId])
  const [date, setDate] = useState('')
  const [assessment, setAssessment] = useState('')
  const [items, setItems] = useState<HomeVisitation[]>([])
  const [conferenceItems, setConferenceItems] = useState<HomeVisitation[]>([])
  const [activeTab, setActiveTab] = useState<'visitations' | 'conferences'>('visitations')
  const [loading, setLoading] = useState(true)
  const [conferenceLoading, setConferenceLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conferenceError, setConferenceError] = useState<string | null>(null)

  async function loadHistory() {
    if (!Number.isFinite(parsedResidentId) || parsedResidentId <= 0) {
      setLoading(false)
      setConferenceLoading(false)
      setError('Invalid resident id.')
      setConferenceError('Invalid resident id.')
      return
    }
    setLoading(true)
    setConferenceLoading(true)
    setError(null)
    setConferenceError(null)
    try {
      const [history, conferences] = await Promise.all([
        getHomeVisitations(parsedResidentId),
        getCaseConferences(parsedResidentId),
      ])
      setItems(history)
      setConferenceItems(conferences)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visitation history.')
      setConferenceError(e instanceof Error ? e.message : 'Failed to load case conferences.')
    } finally {
      setLoading(false)
      setConferenceLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedResidentId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date || !assessment.trim()) {
      setError('Please provide both date and assessment.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createHomeVisitation({
        residentId: parsedResidentId,
        date,
        assessment: assessment.trim(),
      })
      setAssessment('')
      setDate('')
      await loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create visitation entry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Visitations &amp; Case Conferences</h1>
        <div className="mt-2 text-sm text-surface-text">ResidentId: {residentId}</div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-surface-dark">New Visitation Entry</h2>
          <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-text">ResidentId</label>
              <input
                value={Number.isFinite(parsedResidentId) ? parsedResidentId : ''}
                disabled
                className="w-full rounded-md border border-slate-200 bg-brand-50 px-3 py-2 text-sm text-surface-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-text">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-surface-text">Assessment</label>
              <textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                placeholder="Home visitation assessment details"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
              >
                {submitting ? 'Saving...' : 'Save Visitation'}
              </button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('visitations')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === 'visitations'
                  ? 'bg-brand text-white'
                  : 'bg-brand-50 text-surface-text hover:text-surface-dark'
              }`}
            >
              Home Visitations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conferences')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === 'conferences'
                  ? 'bg-brand text-white'
                  : 'bg-brand-50 text-surface-text hover:text-surface-dark'
              }`}
            >
              Case Conferences
            </button>
          </div>

          {activeTab === 'visitations' ? (
            <>
              <h2 className="mt-4 text-lg font-semibold text-surface-dark">Visitation History</h2>
              {loading ? (
                <p className="mt-3 text-sm text-surface-text">Loading visitations...</p>
              ) : items.length === 0 ? (
                <p className="mt-3 text-sm text-surface-text">No visitation history found for this resident yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-surface-text">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Assessment</th>
                        <th className="px-3 py-2 font-medium">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.visitationId} className="border-b border-slate-100 align-top">
                          <td className="px-3 py-2 text-surface-dark">{new Date(row.visitDate).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-surface-text">{row.observations}</td>
                          <td className="px-3 py-2 text-surface-text">{row.visitOutcome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold text-brand">Case Conferences</h2>
              {conferenceLoading ? (
                <p className="mt-3 text-sm text-surface-text">Loading case conferences...</p>
              ) : conferenceItems.length === 0 ? (
                <p className="mt-3 text-sm text-surface-text">
                  No case conference records found. Add visitations with "Conference" in assessment/notes.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-surface-text">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Conference Notes</th>
                        <th className="px-3 py-2 font-medium">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conferenceItems.map((row) => (
                        <tr key={row.visitationId} className="border-b border-slate-100 align-top">
                          <td className="px-3 py-2 text-surface-dark">{new Date(row.visitDate).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-surface-text">{row.observations}</td>
                          <td className="px-3 py-2 text-surface-text">{row.visitOutcome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {conferenceError && <p className="mt-3 text-sm text-red-500">{conferenceError}</p>}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

