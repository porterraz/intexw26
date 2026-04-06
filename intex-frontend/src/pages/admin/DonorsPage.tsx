import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import { DataTable, type ColumnDef } from '../../components/DataTable'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'

type Supporter = {
  supporterId: number
  supporterType: string
  displayName: string
  country: string
  status: string
  firstDonationDate: string | null
}

type PagedResult<T> = { items: T[]; page: number; pageSize: number; totalCount: number }

export function DonorsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [rows, setRows] = useState<Supporter[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supporterType, setSupporterType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const params: Record<string, string | number> = { page, pageSize }
        if (supporterType) params.supporterType = supporterType
        if (status) params.status = status
        if (search) params.search = search

        const res = await api.get<PagedResult<Supporter>>('/api/supporters', { params })
        if (!cancelled) {
          setRows(res.data.items)
          setTotal(res.data.totalCount)
        }
      } catch {
        if (!cancelled) setError('Unable to load supporters.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [page, pageSize, supporterType, status, search])

  const columns = useMemo<ColumnDef<Supporter>[]>(
    () => [
      { header: 'Display Name', render: (s) => s.displayName },
      { header: 'Type', render: (s) => s.supporterType },
      { header: 'Country', render: (s) => s.country },
      { header: 'Status', render: (s) => s.status },
      {
        header: 'First Donation',
        render: (s) => (s.firstDonationDate ? new Date(s.firstDonationDate).toLocaleDateString() : '—'),
      },
      {
        header: 'Actions',
        render: (s) => (
          <Link
            to={`/admin/donors/${s.supporterId}`}
            className="text-sm font-semibold text-emerald-300 hover:underline"
          >
            View
          </Link>
        ),
      },
    ],
    []
  )

  return (
    <div className="min-h-full bg-[#060e09] text-white">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Donors &amp; Contributions</h1>
          <button
            onClick={() => navigate('/admin/donors')}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Add Supporter
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={supporterType}
              onChange={(e) => {
                setPage(1)
                setSupporterType(e.target.value)
              }}
              placeholder="Supporter type"
              className="rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
            />
            <input
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              placeholder="Status"
              className="rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
            />
            <input
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Search"
              className="rounded-md border border-white/20 bg-transparent px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </section>

        <section className="mt-4">
          {error ? (
            <ErrorMessage message={error} />
          ) : loading ? (
            <LoadingSpinner />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              page={page}
              pageSize={pageSize}
              totalCount={total}
              onPageChange={setPage}
            />
          )}
        </section>
      </main>
    </div>
  )
}

