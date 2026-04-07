import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { MetricCard } from '../../components/MetricCard'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'

type DashboardSummary = {
  activeResidents: number
  donationsThisMonth: number
  upcomingCaseConferences: number
  atRiskResidents: number
  recentActivity: { timestamp: string; type: string; message: string }[]
}

type Safehouse = {
  safehouseId: number
  name: string
  currentOccupancy: number
  capacityGirls: number
}

type Supporter = {
  supporterId: number
  supporterType: string
  status: string
}

type Donation = {
  donationId: number
  donationDate: string
  amount: number | null
  estimatedValue: number | null
  donationType: string
}

type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number }

const PIE_COLORS = ['#0f766e', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ea580c']

async function fetchAllPages<T>(url: string, pageSize = 100): Promise<T[]> {
  const first = await api.get<Paged<T>>(url, { params: { page: 1, pageSize } })
  const all = [...first.data.items]
  const totalPages = Math.max(1, Math.ceil(first.data.totalCount / pageSize))

  for (let page = 2; page <= totalPages; page++) {
    const res = await api.get<Paged<T>>(url, { params: { page, pageSize } })
    all.push(...res.data.items)
  }

  return all
}

export function ReportsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [donations, setDonations] = useState<Donation[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, safehousesRes, supportersItems, donationsItems] = await Promise.all([
          api.get<DashboardSummary>('/api/dashboard/summary'),
          api.get<Safehouse[]>('/api/safehouses'),
          fetchAllPages<Supporter>('/api/supporters', 100),
          fetchAllPages<Donation>('/api/donations', 100),
        ])

        if (cancelled) return
        setSummary(summaryRes.data)
        setSafehouses(safehousesRes.data)
        setSupporters(supportersItems)
        setDonations(donationsItems)
      } catch {
        if (!cancelled) setError('Unable to load reports data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const donationByMonth = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const d of donations) {
      const dt = new Date(d.donationDate)
      if (Number.isNaN(dt.getTime())) continue
      const label = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const value = d.amount ?? d.estimatedValue ?? 0
      buckets.set(label, (buckets.get(label) ?? 0) + value)
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }))
  }, [donations])

  const supporterTypeBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of supporters) {
      counts.set(s.supporterType, (counts.get(s.supporterType) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [supporters])

  const safehouseOccupancy = useMemo(
    () =>
      safehouses.map((s) => ({
        name: s.name,
        occupancyPct:
          s.capacityGirls > 0 ? Number(((s.currentOccupancy / s.capacityGirls) * 100).toFixed(1)) : 0,
      })),
    [safehouses]
  )

  const activeSupporters = useMemo(
    () => supporters.filter((s) => s.status.toLowerCase() === 'active').length,
    [supporters]
  )

  return (
    <div className="min-h-full bg-brand-50 text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-surface-dark">Reports</h1>

        {error ? (
          <div className="mt-6">
            <ErrorMessage message={error} />
          </div>
        ) : loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <button
                type="button"
                onClick={() => navigate('/admin/donors')}
                className="text-left rounded-xl border border-brand-100 bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label="Open supporters page"
                title="Open supporters page"
              >
                <MetricCard label="Supporters" value={supporters.length} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/donors?status=Active')}
                className="text-left rounded-xl border border-brand-100 bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label="Open active supporters page"
                title="Open active supporters page"
              >
                <MetricCard label="Active Supporters" value={activeSupporters} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/donations')}
                className="text-left rounded-xl border border-brand-100 bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label="Open donations list"
                title="Open donations list"
              >
                <MetricCard label="Donations Loaded" value={donations.length} />
              </button>
              <MetricCard label="Donations This Month" value={summary?.donationsThisMonth ?? 0} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
                <div className="font-semibold text-surface-dark">Donations trend (last 8 months)</div>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donationByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
                <div className="font-semibold text-surface-dark">Supporters by type</div>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={supporterTypeBreakdown} dataKey="value" nameKey="name" outerRadius={95} label>
                        {supporterTypeBreakdown.map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-5 shadow-sm">
              <div className="font-semibold text-surface-dark">Safehouse occupancy (%)</div>
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safehouseOccupancy} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={160} />
                    <Tooltip />
                    <Bar dataKey="occupancyPct" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

