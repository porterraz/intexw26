import { useParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'

export function VisitationPage() {
  const { residentId } = useParams()
  return (
    <div className="min-h-full bg-[#060e09] text-white">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Home Visitations</h1>
        <div className="mt-2 text-sm text-slate-400">ResidentId: {residentId}</div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
          <div className="text-sm text-slate-300">
            History + entry form will be wired to `GET /api/home-visitations/resident/{residentId}` and `POST /api/home-visitations` next.
          </div>
        </div>
      </main>
    </div>
  )
}

