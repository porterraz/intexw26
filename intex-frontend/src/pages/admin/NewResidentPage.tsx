import { NavBar } from '../../components/NavBar'

export function NewResidentPage() {
  return (
    <div className="min-h-full bg-[#060e09] text-white">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">New Resident</h1>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
          <div className="text-sm text-slate-300">
            Form will post to `POST /api/residents` next.
          </div>
        </div>
      </main>
    </div>
  )
}

