import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'
import { getAllSegments, getAllChurnPredictions, type SegmentEntry, type ChurnEntry } from '../../lib/api'
import { compareSortValues } from '../../lib/tableSort'
import { formatDate } from '../../lib/locale'
import { DataTable, type ColumnDef } from '../../components/DataTable'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { useAuth } from '../../state/AuthContext'

type Supporter = {
  supporterId: number
  supporterType: string
  displayName: string
  country: string
  status: string
  firstDonationDate: string | null
}
type DonorSortKey = 'displayName' | 'type' | 'country' | 'status' | 'segment' | 'churnRisk' | 'firstDonation' | 'actions'

const PERSONA_COLORS: Record<string, string> = {
  Champions: 'bg-green-100 text-green-800 border-green-200',
  'Steady Supporters': 'bg-blue-100 text-blue-800 border-blue-200',
  'Light Givers': 'bg-amber-100 text-amber-800 border-amber-200',
}
const DEFAULT_PERSONA_COLOR = 'bg-slate-100 text-slate-700 border-slate-200'

const CHURN_COLORS: Record<string, string> = {
  Low: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  High: 'bg-red-100 text-red-800 border-red-200',
}
const DEFAULT_CHURN_COLOR = 'bg-slate-100 text-slate-700 border-slate-200'

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
  const { t, i18n } = useTranslation()
  const { hasRole } = useAuth()
  const canManage = hasRole('Admin')
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
  const [segments, setSegments] = useState<Record<string, SegmentEntry>>({})
  const [churnPredictions, setChurnPredictions] = useState<Record<string, ChurnEntry>>({})
  const [sort, setSort] = useState<{ column: DonorSortKey; direction: 'asc' | 'desc' }>({
    column: 'displayName',
    direction: 'asc',
  })

  useEffect(() => {
    getAllSegments().then(setSegments)
    getAllChurnPredictions().then(setChurnPredictions)
  }, [])

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
            setError(t('donors_error_unauthorized'))
          } else if (isAxiosError(err) && err.code === 'ERR_NETWORK') {
            setError(t('donors_error_network'))
          } else {
            setError(t('donors_error_load'))
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

  const columnDefs = useMemo<Array<{ key: DonorSortKey } & ColumnDef<Supporter>>>(
    () => [
      {
        key: 'displayName',
        header: t('donors_col_display_name'),
        sortValue: (s) => s.displayName,
        render: (s) => s.displayName,
      },
      {
        key: 'type',
        header: t('donors_col_type'),
        sortValue: (s) => s.supporterType,
        render: (s) => s.supporterType,
      },
      {
        key: 'country',
        header: t('donors_col_country'),
        sortValue: (s) => s.country,
        render: (s) => s.country,
      },
      {
        key: 'status',
        header: t('donors_col_status'),
        sortValue: (s) => s.status,
        render: (s) => s.status,
      },
      {
        key: 'segment',
        header: 'ML Segment',
        sortValue: (s) => segments[String(s.supporterId)]?.persona ?? '',
        render: (s) => {
          const persona = segments[String(s.supporterId)]?.persona
          if (!persona) return <span className="text-xs text-surface-text">—</span>
          const color = PERSONA_COLORS[persona] ?? DEFAULT_PERSONA_COLOR
          return (
            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
              {persona}
            </span>
          )
        },
      },
      {
        key: 'churnRisk',
        header: 'Churn Risk',
        sortValue: (s) => {
          const risk = churnPredictions[String(s.supporterId)]?.churnRisk
          const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
          return risk ? order[risk] ?? 3 : 4
        },
        render: (s) => {
          const risk = churnPredictions[String(s.supporterId)]?.churnRisk
          if (!risk) return <span className="text-xs text-surface-text">—</span>
          const color = CHURN_COLORS[risk] ?? DEFAULT_CHURN_COLOR
          return (
            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
              {risk}
            </span>
          )
        },
      },
      {
        key: 'firstDonation',
        header: t('donors_col_first_donation'),
        sortValue: (s) =>
          s.firstDonationDate ? new Date(s.firstDonationDate).getTime() : Number.POSITIVE_INFINITY,
        render: (s) => (s.firstDonationDate ? formatDate(s.firstDonationDate, i18n.resolvedLanguage) : '—'),
      },
      ...(canManage
        ? [{
            key: 'actions' as const,
            header: t('donors_col_actions'),
            render: (s: Supporter) => (
              <Link
                to={`/admin/donors/${s.supporterId}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {t('common_view')}
              </Link>
            ),
          }]
        : []),
    ],
    [t, i18n.resolvedLanguage, canManage, segments, churnPredictions]
  )
  const columns = useMemo<ColumnDef<Supporter>[]>(() => columnDefs.map(({ key: _, ...col }) => col), [columnDefs])

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
          <h1 className="text-2xl font-bold text-surface-dark">{t('donors_title')}</h1>
          {canManage ? (
            <button
              onClick={() => navigate('/admin/donors/new')}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              {t('donors_add_supporter')}
            </button>
          ) : null}
        </div>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-surface p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              id="donors-supporter-type"
              name="supporterType"
              value={supporterType}
              onChange={(e) => {
                setPage(1)
                setSupporterType(e.target.value)
              }}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text"
            >
              <option value="">{t('donors_all_supporter_types')}</option>
              {SUPPORTER_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              id="donors-status"
              name="status"
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              className="rounded-md border border-brand-100 bg-surface px-3 py-2 text-sm text-surface-text"
            >
              <option value="">{t('donors_all_statuses')}</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              id="donors-search"
              name="search"
              value={search}
              onChange={(e) => {
                setPage(1)
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
              page={page}
              pageSize={pageSize}
              totalCount={total}
              onPageChange={setPage}
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
