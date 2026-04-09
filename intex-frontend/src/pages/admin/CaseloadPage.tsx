import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { DataTable, type ColumnDef } from '../../components/DataTable'
import { compareSortValues } from '../../lib/tableSort'

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
type CaseloadSortKey = 'caseNo' | 'name' | 'safehouse' | 'category' | 'risk' | 'status' | 'socialWorker' | 'actions'

function getRiskLevelTextClass(riskLevel: string) {
  const normalized = riskLevel.trim().toLowerCase()
  if (normalized === 'low') return 'text-emerald-500'
  if (normalized === 'medium' || normalized === 'moderate') return 'text-amber-500'
  if (normalized === 'high') return 'text-rose-500'
  if (normalized === 'critical') return 'text-red-600 font-bold'
  return 'text-surface-text font-medium'
}

function riskSortValue(level: string): number {
  const n = level.trim().toLowerCase()
  if (n === 'low') return 1
  if (n === 'medium' || n === 'moderate') return 2
  if (n === 'high') return 3
  if (n === 'critical') return 4
  return 99
}

export function CaseloadPage() {
  const { t } = useTranslation()
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [rows, setRows] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [safehouseId, setSafehouseId] = useState<string>('')
  const [caseStatus, setCaseStatus] = useState<string>('')
  const [caseCategory, setCaseCategory] = useState<string>('')
  const [riskLevel, setRiskLevel] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<{ column: CaseloadSortKey; direction: 'asc' | 'desc' }>({
    column: 'name',
    direction: 'asc',
  })

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
        const params: Record<string, string | number> = {}
        if (caseStatus) params.caseStatus = caseStatus
        if (safehouseId) params.safehouseId = Number(safehouseId)
        if (caseCategory) params.caseCategory = caseCategory
        if (riskLevel) params.riskLevel = riskLevel
        if (search) params.search = search

        const fetchPageSize = 100
        const allRows: Resident[] = []
        let currentPage = 1
        let totalCount = 0

        while (true) {
          const res = await api.get<PagedResult<Resident>>('/api/residents', {
            params: { ...params, page: currentPage, pageSize: fetchPageSize },
          })

          if (currentPage === 1) totalCount = res.data.totalCount
          allRows.push(...res.data.items)

          if (allRows.length >= totalCount || res.data.items.length < fetchPageSize) break
          currentPage += 1
        }

        if (!cancelled) {
          setRows(allRows)
        }
      } catch (err) {
        if (!cancelled) {
          const status = axios.isAxiosError(err) ? err.response?.status : undefined
          if (status === 401 || status === 403) {
            setError(t('caseload_error_unauthorized'))
          } else {
            setError(t('caseload_error_load'))
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [caseStatus, safehouseId, caseCategory, riskLevel, search])

  const columnDefs = useMemo<Array<{ key: CaseloadSortKey } & ColumnDef<Resident>>>(
    () => [
      {
        key: 'caseNo',
        header: t('caseload_col_case_no'),
        sortValue: (r) => r.caseControlNo,
        render: (r) => r.caseControlNo,
      },
      {
        key: 'name',
        header: t('caseload_col_name'),
        sortValue: (r) => r.internalCode,
        render: (r) => (
          <span className="rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-accent">
            {r.internalCode}
          </span>
        ),
      },
      {
        key: 'safehouse',
        header: t('caseload_col_safehouse'),
        sortValue: (r) => r.safehouse?.name ?? String(r.safehouseId),
        render: (r) => r.safehouse?.name ?? String(r.safehouseId),
      },
      {
        key: 'category',
        header: t('caseload_col_category'),
        sortValue: (r) => r.caseCategory,
        render: (r) => r.caseCategory,
      },
      {
        key: 'risk',
        header: t('caseload_col_risk_level'),
        sortValue: (r) => riskSortValue(r.currentRiskLevel),
        render: (r) => (
          <span className={getRiskLevelTextClass(r.currentRiskLevel)}>
            {r.currentRiskLevel}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('caseload_col_status'),
        sortValue: (r) => r.caseStatus,
        render: (r) => r.caseStatus,
      },
      {
        key: 'socialWorker',
        header: t('caseload_col_social_worker'),
        sortValue: (r) => r.assignedSocialWorker,
        render: (r) => r.assignedSocialWorker,
      },
      {
        key: 'actions',
        header: t('caseload_col_actions'),
        render: (r) => (
          <div className="flex gap-2">
            <Link
              to={`/admin/residents/${r.residentId}`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {t('common_view')}
            </Link>
          </div>
        ),
      },
    ],
    [t]
  )
  const columns = useMemo<ColumnDef<Resident>[]>(() => columnDefs.map(({ key: _, ...col }) => col), [columnDefs])

  const sortedRows = useMemo(() => {
    const col = columnDefs.find((c) => c.key === sort.column)
    if (!col?.sortValue) return [...rows]
    const mult = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      return compareSortValues(va, vb) * mult
    })
  }, [rows, sort.column, sort.direction, columnDefs])

  const handleSortColumn = useCallback(
    (header: string) => {
      const selected = columnDefs.find((c) => c.header === header)
      if (!selected?.sortValue) return
      setSort((prev) => {
        if (prev.column === selected.key) {
          return { column: selected.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        }
        return { column: selected.key, direction: 'asc' }
      })
    },
    [columnDefs]
  )
  const activeSortHeader = columnDefs.find((c) => c.key === sort.column)?.header ?? null

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-surface-dark">{t('caseload_title')}</h1>
          <Link
            to="/admin/residents/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
          >
            {t('caseload_add_resident')}
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <select
              value={safehouseId}
              onChange={(e) => {
                setSafehouseId(e.target.value)
              }}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text"
            >
              <option value="">{t('caseload_all_safehouses')}</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={String(s.safehouseId)}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              value={caseStatus}
              onChange={(e) => {
                setCaseStatus(e.target.value)
              }}
              placeholder={t('caseload_filter_case_status')}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
            />
            <input
              value={caseCategory}
              onChange={(e) => {
                setCaseCategory(e.target.value)
              }}
              placeholder={t('caseload_filter_case_category')}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
            />
            <input
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value)
              }}
              placeholder={t('caseload_filter_risk_level')}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text placeholder:text-surface-text"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
              placeholder={t('common_search')}
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
              page={1}
              pageSize={Math.max(sortedRows.length, 1)}
              totalCount={sortedRows.length}
              onPageChange={() => {
                // Residents view intentionally renders all rows; pagination controls are inert.
              }}
              sort={{
                column: activeSortHeader,
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
