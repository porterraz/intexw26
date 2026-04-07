import { useParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'

export function VisitationPage() {
  const { residentId } = useParams()
  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Home Visitations</h1>
        <div className="mt-2 text-sm text-surface-text">ResidentId: {residentId}</div>
        <div className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
          <div className="text-sm text-surface-text">
            History + entry form will be wired to `GET /api/home-visitations/resident/{residentId}` and `POST /api/home-visitations` next.
          </div>
        </div>
      </main>
    </div>
  )
}

