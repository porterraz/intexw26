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
import { useAuth } from '../../state/AuthContext'

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

function parseStringList(data: unknown): string[] {
  if (!Array.isArray(data)) return []
  return data
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function dedupeSortedStrings(values: string[]): string[] {
  const byKey = new Map<string, string>()
  for (const raw of values) {
    const s = raw.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (!byKey.has(key)) byKey.set(key, s)
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function pickCaseCategoryField(r: Resident & { CaseCategory?: string }): string {
  return (r.caseCategory ?? r.CaseCategory ?? '').trim()
}

function pickCaseStatusField(r: Resident & { CaseStatus?: string }): string {
  return (r.caseStatus ?? r.CaseStatus ?? '').trim()
}

/** Load category dropdown options: dedicated endpoints, then paginated residents (covers 404 / odd JSON / PascalCase rows). */
async function loadCaseCategoryOptions(): Promise<string[]> {
  const paths = ['/api/residents/case-categories', '/api/residents/categories'] as const
  for (const path of paths) {
    try {
      const res = await api.get<unknown>(path)
      const parsed = dedupeSortedStrings(parseStringList(res.data))
      if (parsed.length > 0) return parsed
    } catch {
      // try next path or resident scan
    }
  }

  const pageSize = 100
  const items: Resident[] = []
  let page = 1
  let totalCount = 0
  while (true) {
    const res = await api.get<PagedResult<Resident>>('/api/residents', { params: { page, pageSize } })
    if (page === 1) totalCount = res.data.totalCount
    items.push(...res.data.items)
    if (items.length >= totalCount || res.data.items.length < pageSize) break
    page += 1
  }

  return dedupeSortedStrings(items.map((r) => pickCaseCategoryField(r)))
}

/** Columns shown in simple (default) table view */
const SIMPLE_COLUMN_KEYS = new Set<CaseloadSortKey>(['name', 'risk', 'category', 'socialWorker'])

/** Sort keys still valid when simple columns only are visible */
const SIMPLE_SORTABLE_KEYS = new Set<CaseloadSortKey>(['name', 'risk', 'category', 'socialWorker'])

const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical']

const TABLE_PAGE_SIZE = 25

const filterControlClass =
  'rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text'

function matchesTextFilter(dbValue: string, selected: string): boolean {
  if (!selected.trim()) return true
  return (
    dbValue.trim().localeCompare(selected.trim(), undefined, { sensitivity: 'base' }) === 0
  )
}

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
  const { token, hasRole } = useAuth()
  const canManage = hasRole('Admin')
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [rows, setRows] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [safehouseId, setSafehouseId] = useState<string>('')
  const [caseStatus, setCaseStatus] = useState<string>('')
  const [caseCategory, setCaseCategory] = useState<string>('')
  const [riskLevel, setRiskLevel] = useState<string>('')
  const [socialWorker, setSocialWorker] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [socialWorkerOptions, setSocialWorkerOptions] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [sort, setSort] = useState<{ column: CaseloadSortKey; direction: 'asc' | 'desc' }>({
    column: 'name',
    direction: 'asc',
  })
  const [detailedView, setDetailedView] = useState(false)
  const [tablePage, setTablePage] = useState(1)

  useEffect(() => {
    setTablePage(1)
  }, [caseStatus, safehouseId, caseCategory, riskLevel, socialWorker, debouncedSearch])

  useEffect(() => {
    if (detailedView) return
    if (!SIMPLE_SORTABLE_KEYS.has(sort.column)) {
      setSort({ column: 'name', direction: 'asc' })
    }
  }, [detailedView, sort.column])

  useEffect(() => {
    if (!detailedView) {
      setSafehouseId('')
      setCaseStatus('')
    }
  }, [detailedView])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    if (!token) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<unknown>('/api/residents/social-workers')
        if (!cancelled) setSocialWorkerOptions(dedupeSortedStrings(parseStringList(res.data)))
      } catch {
        if (!cancelled) setSocialWorkerOptions([])
      }
      try {
        const categories = await loadCaseCategoryOptions()
        if (!cancelled) setCategoryOptions(categories)
      } catch {
        if (!cancelled) setCategoryOptions([])
      }
      try {
        const res = await api.get<unknown>('/api/residents/case-statuses')
        if (!cancelled) setStatusOptions(dedupeSortedStrings(parseStringList(res.data)))
      } catch {
        if (!cancelled) setStatusOptions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

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
        if (socialWorker) params.assignedSocialWorker = socialWorker
        if (debouncedSearch) params.search = debouncedSearch

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
  }, [caseStatus, safehouseId, caseCategory, riskLevel, socialWorker, debouncedSearch, t])

  /** Simple: Name, Category, Risk, Social Worker, Actions. Detailed: same, then Case No., Safehouse, Status, then Actions. */
  const allColumnDefs = useMemo<Array<{ key: CaseloadSortKey } & ColumnDef<Resident>>>(
    () => [
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
        key: 'category',
        header: t('caseload_col_category'),
        sortValue: (r) => pickCaseCategoryField(r),
        render: (r) => pickCaseCategoryField(r),
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
        key: 'socialWorker',
        header: t('caseload_col_social_worker'),
        sortValue: (r) => r.assignedSocialWorker,
        render: (r) => r.assignedSocialWorker,
      },
      {
        key: 'caseNo',
        header: t('caseload_col_case_no'),
        sortValue: (r) => r.caseControlNo,
        render: (r) => r.caseControlNo,
      },
      {
        key: 'safehouse',
        header: t('caseload_col_safehouse'),
        sortValue: (r) => r.safehouse?.name ?? String(r.safehouseId),
        render: (r) => r.safehouse?.name ?? String(r.safehouseId),
      },
      {
        key: 'status',
        header: t('caseload_col_status'),
        sortValue: (r) => pickCaseStatusField(r),
        render: (r) => pickCaseStatusField(r),
      },
      ...(canManage
        ? [{
            key: 'actions' as const,
            header: t('caseload_col_actions'),
            render: (r: Resident) => (
              <div className="flex gap-2">
                <Link
                  to={`/admin/residents/${r.residentId}`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  {t('common_view')}
                </Link>
              </div>
            ),
          }]
        : []),
    ],
    [t, canManage]
  )

  const columnDefs = useMemo(() => {
    if (detailedView) return allColumnDefs
    return allColumnDefs.filter((c) => {
      if (c.key === 'actions') return canManage
      return SIMPLE_COLUMN_KEYS.has(c.key)
    })
  }, [allColumnDefs, detailedView, canManage])

  const columns = useMemo<ColumnDef<Resident>[]>(() => columnDefs.map(({ key: _, ...col }) => col), [columnDefs])

  /** Apply current filters in the UI to whatever the API returned (covers binding/trim mismatches and over-fetch). */
  const displayRows = useMemo(() => {
    return rows.filter((r) => {
      if (!matchesTextFilter(pickCaseCategoryField(r), caseCategory)) return false
      if (!matchesTextFilter(pickCaseStatusField(r), caseStatus)) return false
      if (!matchesTextFilter(r.assignedSocialWorker, socialWorker)) return false
      if (riskLevel.trim() && !matchesTextFilter(r.currentRiskLevel, riskLevel)) return false
      if (safehouseId && r.safehouseId !== Number(safehouseId)) return false
      const q = debouncedSearch.trim()
      if (q) {
        const n = q.toLowerCase()
        if (
          !r.caseControlNo.toLowerCase().includes(n) &&
          !r.internalCode.toLowerCase().includes(n)
        ) {
          return false
        }
      }
      return true
    })
  }, [rows, caseCategory, caseStatus, socialWorker, riskLevel, safehouseId, debouncedSearch])

  const sortedRows = useMemo(() => {
    const col = columnDefs.find((c) => c.key === sort.column)
    if (!col?.sortValue) return [...displayRows]
    const mult = sort.direction === 'asc' ? 1 : -1
    return [...displayRows].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      return compareSortValues(va, vb) * mult
    })
  }, [displayRows, sort.column, sort.direction, columnDefs])

  const totalTablePages = Math.max(1, Math.ceil(sortedRows.length / TABLE_PAGE_SIZE))

  useEffect(() => {
    setTablePage((p) => Math.min(p, totalTablePages))
  }, [totalTablePages])

  const pagedRows = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE
    return sortedRows.slice(start, start + TABLE_PAGE_SIZE)
  }, [sortedRows, tablePage])

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

  /** Distinct values from the API only. Do not merge filtered `rows` — after a filter applies, rows only match that filter and would shrink the dropdown. */
  const socialWorkerChoices = useMemo(() => {
    const byKey = new Map<string, string>()
    const add = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      if (!byKey.has(key)) byKey.set(key, trimmed)
    }
    for (const n of socialWorkerOptions) add(n)
    if (socialWorker) add(socialWorker)
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [socialWorkerOptions, socialWorker])

  const categoryChoices = useMemo(() => {
    const byKey = new Map<string, string>()
    const add = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      if (!byKey.has(key)) byKey.set(key, trimmed)
    }
    for (const c of categoryOptions) add(c)
    if (caseCategory) add(caseCategory)
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [categoryOptions, caseCategory])

  const statusChoices = useMemo(() => {
    const byKey = new Map<string, string>()
    const add = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      if (!byKey.has(key)) byKey.set(key, trimmed)
    }
    for (const s of statusOptions) add(s)
    if (caseStatus) add(caseStatus)
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [statusOptions, caseStatus])

  return (
    <div className="min-h-full text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-surface-dark">{t('caseload_title')}</h1>
          {canManage ? (
            <Link
              to="/admin/residents/new"
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              {t('caseload_add_resident')}
            </Link>
          ) : null}
        </div>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-4 shadow-sm">
          <div
            className={
              detailedView
                ? 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
                : 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }
          >
            {detailedView ? (
              <select
                id="caseload-safehouse"
                name="safehouseId"
                value={safehouseId}
                onChange={(e) => {
                  setSafehouseId(e.target.value)
                }}
                className={filterControlClass}
              >
                <option value="">{t('caseload_all_safehouses')}</option>
                {safehouses.map((s) => (
                  <option key={s.safehouseId} value={String(s.safehouseId)}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              id="caseload-category"
              name="caseCategory"
              value={caseCategory}
              onChange={(e) => {
                setCaseCategory(e.target.value)
              }}
              className={filterControlClass}
              aria-label={t('caseload_filter_case_category')}
            >
              <option value="">{t('caseload_all_categories')}</option>
              {categoryChoices.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              id="caseload-risk"
              name="riskLevel"
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value)
              }}
              className={filterControlClass}
            >
              <option value="">{t('caseload_filter_risk_level')}</option>
              {RISK_LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {detailedView ? (
              <select
                id="caseload-status"
                name="caseStatus"
                value={caseStatus}
                onChange={(e) => {
                  setCaseStatus(e.target.value)
                }}
                className={filterControlClass}
                aria-label={t('caseload_filter_case_status')}
              >
                <option value="">{t('caseload_all_statuses')}</option>
                {statusChoices.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              id="caseload-social-worker"
              name="assignedSocialWorker"
              value={socialWorker}
              onChange={(e) => {
                setSocialWorker(e.target.value)
              }}
              className={filterControlClass}
            >
              <option value="">{t('caseload_all_social_workers')}</option>
              {socialWorkerChoices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <input
              id="caseload-search"
              name="search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('caseload_search_name_case')}
              aria-label={t('caseload_search_name_case')}
              className={filterControlClass}
            />
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          {detailedView ? (
            <button
              type="button"
              onClick={() => setDetailedView(false)}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              {t('caseload_simple_view')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDetailedView(true)}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              {t('caseload_detailed_view')}
            </button>
          )}
        </div>

        <section className="mt-4">
          {error ? (
            <ErrorMessage message={error} />
          ) : loading ? (
            <LoadingSpinner />
          ) : (
            <DataTable
              columns={columns}
              rows={pagedRows}
              page={tablePage}
              pageSize={TABLE_PAGE_SIZE}
              totalCount={sortedRows.length}
              onPageChange={setTablePage}
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
