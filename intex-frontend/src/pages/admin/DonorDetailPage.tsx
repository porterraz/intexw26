import { useParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'

export function DonorDetailPage() {
  const { id } = useParams()
  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">Donor Detail</h1>
        <div className="mt-2 text-sm text-surface-text">SupporterId: {id}</div>
        <div className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
          <div className="text-sm text-surface-text">
            Detail + donation history will be wired to `GET /api/supporters/{id}` next.
          </div>
        </div>
      </main>
    </div>
  )
}

