import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { NavBar } from '../../components/NavBar'
import {
  createProcessRecording,
  deleteProcessRecording,
  getProcessRecordings,
  type ProcessRecording,
} from '../../lib/api'

export function ProcessRecordingPage() {
  const { residentId } = useParams()
  const parsedResidentId = useMemo(() => Number(residentId), [residentId])
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ProcessRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadHistory() {
    if (!Number.isFinite(parsedResidentId) || parsedResidentId <= 0) {
      setLoading(false)
      setError('Invalid resident id.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const history = await getProcessRecordings(parsedResidentId)
      setItems(history)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load process recordings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedResidentId])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date || !notes.trim()) {
      setError('Please provide both date and notes.')
      return
    }
    const confirmed = window.confirm('Are you sure you want to save this process recording?')
    if (!confirmed) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await createProcessRecording({
        residentId: parsedResidentId,
        date,
        notes: notes.trim(),
      })
      setItems((prev) => [created, ...prev].sort((a, b) => +new Date(b.sessionDate) - +new Date(a.sessionDate)))
      setDate('')
      setNotes('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create process recording.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onConfirmDelete() {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    setError(null)
    try {
      await deleteProcessRecording(confirmDeleteId)
      setItems((prev) => prev.filter((row) => row.recordingId !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete process recording.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Process Recordings</h1>
        <div className="mt-2 text-sm text-surface-text">ResidentId: {residentId}</div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-surface-dark">New Recording</h2>
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
              <label className="mb-1 block text-sm font-medium text-surface-text">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                placeholder="Session narrative / notes"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
              >
                {submitting ? 'Saving...' : 'Save Recording'}
              </button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-surface-dark">Recording History</h2>
          {loading ? (
            <p className="mt-3 text-sm text-surface-text">Loading recordings...</p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-surface-text">No recordings found for this resident yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-surface-text">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.recordingId} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 text-surface-dark">{new Date(row.sessionDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-surface-text">{row.sessionNarrative}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(row.recordingId)}
                          disabled={deletingId === row.recordingId}
                          className="rounded-md border border-brand-100 px-2.5 py-1.5 text-xs font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-60"
                        >
                          {deletingId === row.recordingId ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && (
            <p className="mt-3 text-xs text-surface-text">
              Displaying latest recordings from `/api/process-recordings/resident/{'{residentId}'}`.
            </p>
          )}
        </section>
      </main>
      <ConfirmDeleteModal
        open={confirmDeleteId !== null}
        title="Delete this process recording?"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  )
}
