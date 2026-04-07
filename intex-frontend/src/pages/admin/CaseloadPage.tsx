import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { DataTable, type ColumnDef } from '../../components/DataTable'

type Safehouse = { safehouseId: number; name: string }
type Resident = {
  residentId: number
  caseControlNo: string
  internalCode: string
  safehouseId: number
  caseCategory: string
  currentRiskLevel: string
  caseStatus: string
  assignedSocialWorker: string
  safehouse?: { name: string }
}

type PagedResult<T> = { items: T[]; page: number; pageSize: number; totalCount: number }

export function CaseloadPage() {
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [rows, setRows] = useState<Resident[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [safehouseId, setSafehouseId] = useState<string>('')
  const [caseStatus, setCaseStatus] = useState<string>('')
  const [caseCategory, setCaseCategory] = useState<string>('')
  const [riskLevel, setRiskLevel] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<Safehouse[]>('/api/safehouses')
        if (!cancelled) setSafehouses(res.data)
      } catch {
        // safehouses filter is optional; ignore error
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const params: Record<string, string | number> = { page, pageSize }
        if (caseStatus) params.caseStatus = caseStatus
        if (safehouseId) params.safehouseId = Number(safehouseId)
        if (caseCategory) params.caseCategory = caseCategory
        if (riskLevel) params.riskLevel = riskLevel
        if (search) params.search = search

        const res = await api.get<PagedResult<Resident>>('/api/residents', { params })
        if (!cancelled) {
          setRows(res.data.items)
          setTotal(res.data.totalCount)
        }
      } catch {
        if (!cancelled) setError('Unable to load residents.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page, pageSize, caseStatus, safehouseId, caseCategory, riskLevel, search])

  const columns = useMemo<ColumnDef<Resident>[]>(
    () => [
      { header: 'Case No.', render: (r) => r.caseControlNo },
      {
        header: 'Name',
        render: (r) => (
          <span className="rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-accent">
            {r.internalCode}
          </span>
        ),
      },
      { header: 'Safehouse', render: (r) => r.safehouse?.name ?? String(r.safehouseId) },
      { header: 'Category', render: (r) => r.caseCategory },
      { header: 'Risk Level', render: (r) => r.currentRiskLevel },
      { header: 'Status', render: (r) => r.caseStatus },
      { header: 'Social Worker', render: (r) => r.assignedSocialWorker },
      {
        header: 'Actions',
        render: (r) => (
          <div className="flex gap-2">
            <Link
              to={`/admin/residents/${r.residentId}`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              View
            </Link>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-surface-dark">Caseload Inventory</h1>
          <Link
            to="/admin/residents/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
          >
            Add Resident
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <select
              value={safehouseId}
              onChange={(e) => {
                setPage(1)
                setSafehouseId(e.target.value)
              }}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text"
            >
              <option value="">All safehouses</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={String(s.safehouseId)}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              value={caseStatus}
              onChange={(e) => {
                setPage(1)
                setCaseStatus(e.target.value)
              }}
              placeholder="Case Status"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
            />
            <input
              value={caseCategory}
              onChange={(e) => {
                setPage(1)
                setCaseCategory(e.target.value)
              }}
              placeholder="Case Category"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
            />
            <input
              value={riskLevel}
              onChange={(e) => {
                setPage(1)
                setRiskLevel(e.target.value)
              }}
              placeholder="Risk Level"
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
            />
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

