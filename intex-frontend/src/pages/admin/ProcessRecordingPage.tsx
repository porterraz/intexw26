import { useParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'

export function ProcessRecordingPage() {
  const { residentId } = useParams()
  return (
    <div className="min-h-full bg-[#060e09] text-white">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Process Recordings</h1>
        <div className="mt-2 text-sm text-slate-400">ResidentId: {residentId}</div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
          <div className="text-sm text-slate-300">
            History + entry form will be wired to `GET /api/process-recordings/resident/{residentId}` and `POST /api/process-recordings` next.
          </div>
        </div>
      </main>
    </div>
  )
}

