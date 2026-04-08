import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import { compareSortValues } from '../../lib/tableSort'
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
const SUPPORTER_TYPE_OPTIONS = [
  'MonetaryDonor',
  'InKindDonor',
  'Volunteer',
  'SkillsContributor',
  'SocialMediaAdvocate',
  'PartnerOrganization',
  'Individual',
  'Corporate',
  'Foundation',
]

const STATUS_OPTIONS = ['Active', 'Inactive', 'Paused']

export function DonorsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [rows, setRows] = useState<Supporter[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supporterType, setSupporterType] = useState(() => searchParams.get('supporterType') ?? '')
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '')
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'Display Name',
    direction: 'asc',
  })

  useEffect(() => {
    const next = new URLSearchParams()
    if (supporterType) next.set('supporterType', supporterType)
    if (status) next.set('status', status)
    if (search) next.set('search', search)
    setSearchParams(next, { replace: true })
  }, [supporterType, status, search, setSearchParams])

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
      } catch (err) {
        if (!cancelled) {
          if (isAxiosError(err) && err.response?.status === 401) {
            setError(
              'Not authorized. Sign out and sign in again so your session uses a real server token (demo login now talks to the API).'
            )
          } else if (isAxiosError(err) && err.code === 'ERR_NETWORK') {
            setError(
              'Cannot reach the API. Start the backend and ensure VITE_API_BASE_URL matches it (default http://localhost:5007).'
            )
          } else {
            setError('Unable to load supporters.')
          }
        }
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
      {
        header: 'Display Name',
        sortValue: (s) => s.displayName,
        render: (s) => s.displayName,
      },
      {
        header: 'Type',
        sortValue: (s) => s.supporterType,
        render: (s) => s.supporterType,
      },
      {
        header: 'Country',
        sortValue: (s) => s.country,
        render: (s) => s.country,
      },
      {
        header: 'Status',
        sortValue: (s) => s.status,
        render: (s) => s.status,
      },
      {
        header: 'First Donation',
        sortValue: (s) =>
          s.firstDonationDate ? new Date(s.firstDonationDate).getTime() : Number.POSITIVE_INFINITY,
        render: (s) => (s.firstDonationDate ? new Date(s.firstDonationDate).toLocaleDateString() : '—'),
      },
      {
        header: 'Actions',
        render: (s) => (
          <Link
            to={`/admin/donors/${s.supporterId}`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            View
          </Link>
        ),
      },
    ],
    []
  )

  const sortedRows = useMemo(() => {
    const col = columns.find((c) => c.header === sort.column)
    if (!col?.sortValue) return [...rows]
    const mult = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      return compareSortValues(va, vb) * mult
    })
  }, [rows, sort.column, sort.direction, columns])

  const handleSortColumn = useCallback(
    (header: string) => {
      if (!columns.find((c) => c.header === header)?.sortValue) return
      setSort((prev) => {
        if (prev.column === header) {
          return { column: header, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        }
        return { column: header, direction: 'asc' }
      })
    },
    [columns]
  )

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-surface-dark">Donors &amp; Contributions</h1>
          <button
            onClick={() => navigate('/admin/donors/new')}
            className="rounded-md border border-brand-100 px-4 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50"
          >
            Add Supporter
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={supporterType}
              onChange={(e) => {
                setPage(1)
                setSupporterType(e.target.value)
              }}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text"
            >
              <option value="">All supporter types</option>
              {SUPPORTER_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Search"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
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
              rows={sortedRows}
              page={page}
              pageSize={pageSize}
              totalCount={total}
              onPageChange={setPage}
              sort={{
                column: sort.column,
                direction: sort.direction,
                onColumnClick: handleSortColumn,
              }}
            />
          )}
        </section>
      </main>
    </div>
  )
}

