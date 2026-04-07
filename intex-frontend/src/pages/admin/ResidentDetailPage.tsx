import { Link, useParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'

export function ResidentDetailPage() {
  const { id } = useParams()
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
      </main>
    </div>
  )
}

