import { NavBar } from '../../components/NavBar'

export function NewResidentPage() {
  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-surface-dark">New Resident</h1>
        <div className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
          <div className="text-sm text-surface-text">
            Form will post to `POST /api/residents` next.
          </div>
        </div>
      </main>
    </div>
  )
}

