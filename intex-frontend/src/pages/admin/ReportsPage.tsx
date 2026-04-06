import { NavBar } from '../../components/NavBar'

export function ReportsPage() {
  return (
    <div className="min-h-full bg-[#060e09] text-white">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
          <div className="text-sm text-slate-300">
            Donation trends, resident outcomes, safehouse performance, and reintegration charts will be wired to analytics endpoints next.
          </div>
        </div>
      </main>
    </div>
  )
}

