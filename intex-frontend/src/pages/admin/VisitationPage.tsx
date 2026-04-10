import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { NavBar } from '../../components/NavBar'
import {
  createHomeVisitation,
  deleteHomeVisitation,
  getCaseConferences,
  getHomeVisitations,
  updateHomeVisitation,
  type HomeVisitation,
} from '../../lib/api'

function toDateInputValue(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  return new Date(t).toISOString().slice(0, 10)
}

export function VisitationPage() {
  const { residentId } = useParams()
  const parsedResidentId = useMemo(() => Number(residentId), [residentId])
  const [date, setDate] = useState('')
  const [assessment, setAssessment] = useState('')
  const [entryType, setEntryType] = useState<'Home Visitation' | 'Case Conference'>('Home Visitation')
  const [items, setItems] = useState<HomeVisitation[]>([])
  const [conferenceItems, setConferenceItems] = useState<HomeVisitation[]>([])
  const [activeTab, setActiveTab] = useState<'visitations' | 'conferences'>('visitations')
  const [loading, setLoading] = useState(true)
  const [conferenceLoading, setConferenceLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conferenceError, setConferenceError] = useState<string | null>(null)
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)
  const [editingVisitationId, setEditingVisitationId] = useState<number | null>(null)
  const [editVisitDate, setEditVisitDate] = useState('')
  const [editObservations, setEditObservations] = useState('')
  const [editVisitOutcome, setEditVisitOutcome] = useState('')
  const [savingVisitationId, setSavingVisitationId] = useState<number | null>(null)
  const [confirmDeleteVisitationId, setConfirmDeleteVisitationId] = useState<number | null>(null)
  const [deletingVisitationId, setDeletingVisitationId] = useState<number | null>(null)

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

  const pastAssessmentChoices = useMemo(() => {
    const source = entryType === 'Case Conference' ? conferenceItems : items
    const seen = new Set<string>()
    const out: string[] = []
    for (const row of source) {
      const s = row.observations?.trim()
      if (s && !seen.has(s)) {
        seen.add(s)
        out.push(s)
      }
    }
    out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return out
  }, [entryType, items, conferenceItems])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date || !assessment.trim()) {
      setError(`Please provide both date and ${entryType === 'Case Conference' ? 'conference notes' : 'assessment'}.`)
      return
    }
    const confirmed = window.confirm(`Are you sure you want to save this ${entryType === 'Case Conference' ? 'case conference' : 'visitation'} entry?`)
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    try {
      await createHomeVisitation({
        residentId: parsedResidentId,
        date,
        assessment: assessment.trim(),
        entryType,
      })
      setAssessment('')
      setDate('')
      setEntryType('Home Visitation')
      setShowNewEntryForm(false)
      await loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create visitation entry.')
    } finally {
      setSubmitting(false)
    }
  }

  function startEditVisitation(row: HomeVisitation) {
    setEditingVisitationId(row.visitationId)
    setEditVisitDate(toDateInputValue(row.visitDate))
    setEditObservations(row.observations)
    setEditVisitOutcome(row.visitOutcome)
    setError(null)
    setConferenceError(null)
  }

  function cancelEditVisitation() {
    setEditingVisitationId(null)
    setEditVisitDate('')
    setEditObservations('')
    setEditVisitOutcome('')
  }

  async function saveEditVisitation(row: HomeVisitation) {
    if (!editVisitDate || !editObservations.trim()) {
      const msg = 'Please provide both date and notes/assessment.'
      setError(msg)
      setConferenceError(msg)
      return
    }
    if (!editVisitOutcome.trim()) {
      const msg = 'Please provide an outcome.'
      setError(msg)
      setConferenceError(msg)
      return
    }
    setSavingVisitationId(row.visitationId)
    setError(null)
    setConferenceError(null)
    try {
      await updateHomeVisitation(row, {
        visitDate: editVisitDate,
        observations: editObservations.trim(),
        visitOutcome: editVisitOutcome.trim(),
      })
      await loadHistory()
      cancelEditVisitation()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update record.'
      setError(msg)
      setConferenceError(msg)
    } finally {
      setSavingVisitationId(null)
    }
  }

  async function onConfirmDeleteVisitation() {
    if (!confirmDeleteVisitationId) return
    setDeletingVisitationId(confirmDeleteVisitationId)
    setError(null)
    setConferenceError(null)
    try {
      await deleteHomeVisitation(confirmDeleteVisitationId)
      setConfirmDeleteVisitationId(null)
      if (editingVisitationId === confirmDeleteVisitationId) cancelEditVisitation()
      await loadHistory()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete record.'
      setError(msg)
      setConferenceError(msg)
    } finally {
      setDeletingVisitationId(null)
    }
  }

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Visitations &amp; Case Conferences</h1>
        <div className="mt-2 text-sm text-surface-text">ResidentId: {residentId}</div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          {!showNewEntryForm ? (
            <button
              type="button"
              onClick={() => setShowNewEntryForm(true)}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              New Visitation / Conference Entry
            </button>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-surface-dark">New Visitation / Conference Entry</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewEntryForm(false)
                    setDate('')
                    setAssessment('')
                    setEntryType('Home Visitation')
                    setError(null)
                  }}
                  className="rounded-md border border-brand-100 px-3 py-1.5 text-sm font-semibold text-surface-dark hover:bg-brand-50"
                >
                  Cancel
                </button>
              </div>
              <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <div>
                  <label htmlFor="visitation-entry-type" className="mb-1 block text-sm font-medium text-surface-text">
                    Entry Type
                  </label>
                  <select
                    id="visitation-entry-type"
                    name="entryType"
                    value={entryType}
                    onChange={(e) => {
                      setEntryType(e.target.value as 'Home Visitation' | 'Case Conference')
                      setAssessment('')
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                  >
                    <option value="Home Visitation">Home Visitation</option>
                    <option value="Case Conference">Case Conference</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="visitation-residentId" className="mb-1 block text-sm font-medium text-surface-text">
                    ResidentId
                  </label>
                  <input
                    id="visitation-residentId"
                    name="residentId"
                    value={Number.isFinite(parsedResidentId) ? parsedResidentId : ''}
                    disabled
                    className="w-full rounded-md border border-slate-200 bg-brand-50 px-3 py-2 text-sm text-surface-dark"
                  />
                </div>
                <div>
                  <label htmlFor="visitation-date" className="mb-1 block text-sm font-medium text-surface-text">
                    Date
                  </label>
                  <input
                    id="visitation-date"
                    name="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="visitation-assessment" className="mb-1 block text-sm font-medium text-surface-text">
                    {entryType === 'Case Conference' ? 'Conference Notes' : 'Assessment'}
                  </label>
                  {pastAssessmentChoices.length > 0 ? (
                    <select
                      id="visitation-assessment"
                      name="assessment"
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      required
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                    >
                      <option value="">
                        {entryType === 'Case Conference'
                          ? 'Select from past conference notes…'
                          : 'Select from past assessments…'}
                      </option>
                      {pastAssessmentChoices.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.length > 140 ? `${opt.slice(0, 137)}…` : opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-surface-text">
                        No prior {entryType === 'Case Conference' ? 'conference notes' : 'assessments'} for this resident
                        yet. Enter text for this first record; later entries can be chosen from the dropdown.
                      </p>
                      <textarea
                        id="visitation-assessment"
                        name="assessment"
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                        placeholder={
                          entryType === 'Case Conference'
                            ? 'Case conference notes and decisions'
                            : 'Home visitation assessment details'
                        }
                      />
                    </>
                  )}
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
                  >
                    {submitting ? 'Saving...' : entryType === 'Case Conference' ? 'Save Case Conference' : 'Save Visitation'}
                  </button>
                </div>
              </form>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            </>
          )}
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
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) =>
                        editingVisitationId === row.visitationId ? (
                          <tr key={row.visitationId} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2" colSpan={3}>
                              <div className="grid gap-3 md:grid-cols-2">
                                <input
                                  id={`visitation-edit-date-${row.visitationId}`}
                                  name="editVisitDate"
                                  type="date"
                                  value={editVisitDate}
                                  onChange={(e) => setEditVisitDate(e.target.value)}
                                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                                />
                                <input
                                  id={`visitation-edit-outcome-${row.visitationId}`}
                                  name="editVisitOutcome"
                                  value={editVisitOutcome}
                                  onChange={(e) => setEditVisitOutcome(e.target.value)}
                                  placeholder="Outcome"
                                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                                />
                                <textarea
                                  id={`visitation-edit-observations-${row.visitationId}`}
                                  name="editObservations"
                                  value={editObservations}
                                  onChange={(e) => setEditObservations(e.target.value)}
                                  rows={3}
                                  placeholder="Assessment / notes"
                                  className="md:col-span-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEditVisitation(row)}
                                  disabled={savingVisitationId === row.visitationId}
                                  className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                                >
                                  {savingVisitationId === row.visitationId ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditVisitation}
                                  disabled={savingVisitationId === row.visitationId}
                                  className="rounded-md border border-brand-100 px-2.5 py-1.5 text-xs font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={row.visitationId} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 text-surface-dark">{new Date(row.visitDate).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-surface-text">{row.observations}</td>
                            <td className="px-3 py-2 text-surface-text">{row.visitOutcome}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditVisitation(row)}
                                  disabled={editingVisitationId !== null && editingVisitationId !== row.visitationId}
                                  className="rounded-md border border-brand-100 px-2.5 py-1.5 text-xs font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-60"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteVisitationId(row.visitationId)}
                                  disabled={deletingVisitationId === row.visitationId}
                                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                >
                                  {deletingVisitationId === row.visitationId ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
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
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conferenceItems.map((row) =>
                        editingVisitationId === row.visitationId ? (
                          <tr key={row.visitationId} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2" colSpan={3}>
                              <div className="grid gap-3 md:grid-cols-2">
                                <input
                                  id={`conference-edit-date-${row.visitationId}`}
                                  name="editVisitDate"
                                  type="date"
                                  value={editVisitDate}
                                  onChange={(e) => setEditVisitDate(e.target.value)}
                                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                                />
                                <input
                                  id={`conference-edit-outcome-${row.visitationId}`}
                                  name="editVisitOutcome"
                                  value={editVisitOutcome}
                                  onChange={(e) => setEditVisitOutcome(e.target.value)}
                                  placeholder="Outcome"
                                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                                />
                                <textarea
                                  id={`conference-edit-observations-${row.visitationId}`}
                                  name="editObservations"
                                  value={editObservations}
                                  onChange={(e) => setEditObservations(e.target.value)}
                                  rows={3}
                                  placeholder="Conference notes"
                                  className="md:col-span-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-surface-dark"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEditVisitation(row)}
                                  disabled={savingVisitationId === row.visitationId}
                                  className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                                >
                                  {savingVisitationId === row.visitationId ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditVisitation}
                                  disabled={savingVisitationId === row.visitationId}
                                  className="rounded-md border border-brand-100 px-2.5 py-1.5 text-xs font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={row.visitationId} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-2 text-surface-dark">{new Date(row.visitDate).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-surface-text">{row.observations}</td>
                            <td className="px-3 py-2 text-surface-text">{row.visitOutcome}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditVisitation(row)}
                                  disabled={editingVisitationId !== null && editingVisitationId !== row.visitationId}
                                  className="rounded-md border border-brand-100 px-2.5 py-1.5 text-xs font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-60"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteVisitationId(row.visitationId)}
                                  disabled={deletingVisitationId === row.visitationId}
                                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                >
                                  {deletingVisitationId === row.visitationId ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {conferenceError && <p className="mt-3 text-sm text-red-500">{conferenceError}</p>}
            </>
          )}
        </section>
      </main>
      <ConfirmDeleteModal
        open={confirmDeleteVisitationId !== null}
        title="Delete this visitation / conference record?"
        onCancel={() => setConfirmDeleteVisitationId(null)}
        onConfirm={() => void onConfirmDeleteVisitation()}
      />
    </div>
  )
}
