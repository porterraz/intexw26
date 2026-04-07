import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type ColumnDef } from '../../components/DataTable'
import { ErrorMessage } from '../../components/ErrorMessage'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { NavBar } from '../../components/NavBar'
import { api } from '../../lib/api'

type Donation = {
  donationId: number
  supporterId: number
  donationType: string
  donationDate: string
  channelSource: string
  currencyCode: string | null
  amount: number | null
  estimatedValue: number | null
  impactUnit: string
  isRecurring: boolean
  campaignName: string | null
  notes: string
}

type PagedResult<T> = { items: T[]; page: number; pageSize: number; totalCount: number }

export function AdminDonationsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [rows, setRows] = useState<Donation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const res = await api.get<PagedResult<Donation>>('/api/donations', { params: { page, pageSize } })
        if (!cancelled) {
          setRows(res.data.items)
          setTotal(res.data.totalCount)
        }
      } catch {
        if (!cancelled) setError('Unable to load donations.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [page, pageSize])

  const columns = useMemo<ColumnDef<Donation>[]>(
    () => [
      { header: 'Donation ID', render: (d) => d.donationId },
      { header: 'Date', render: (d) => new Date(d.donationDate).toLocaleDateString() },
      { header: 'Supporter ID', render: (d) => <Link className="text-brand hover:underline" to={`/admin/donors/${d.supporterId}`}>{d.supporterId}</Link> },
      { header: 'Type', render: (d) => d.donationType },
      { header: 'Channel', render: (d) => d.channelSource },
      {
        header: 'Value',
        render: (d) => {
          const value = d.amount ?? d.estimatedValue ?? 0
          const currency = d.currencyCode ?? (d.amount ? 'PHP' : '')
          return currency ? `${currency} ${value.toLocaleString()}` : value.toLocaleString()
        },
      },
      { header: 'Recurring', render: (d) => (d.isRecurring ? 'Yes' : 'No') },
      { header: 'Campaign', render: (d) => d.campaignName ?? '—' },
    ],
    []
  )

  return (
    <div className="min-h-full bg-brand-50 text-surface-dark">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-surface-dark">Donations</h1>
        <p className="mt-1 text-sm text-surface-text">Donation records from the full backend dataset.</p>

        <section className="mt-4">
          {error ? (
            <ErrorMessage message={error} />
          ) : loading ? (
            <LoadingSpinner />
          ) : (
            <DataTable columns={columns} rows={rows} page={page} pageSize={pageSize} totalCount={total} onPageChange={setPage} />
          )}
        </section>
      </main>
    </div>
  )
}

