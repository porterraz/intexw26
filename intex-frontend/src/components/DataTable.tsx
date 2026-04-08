import React from 'react'

export type ColumnDef<T> = {
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  /** If set, the column header is clickable when `sort` is provided. */
  sortValue?: (row: T) => string | number
}

export function DataTable<T>({
  columns,
  rows,
  page,
  pageSize,
  totalCount,
  onPageChange,
  sort,
}: {
  columns: ColumnDef<T>[]
  rows: T[]
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (nextPage: number) => void
  sort?: {
    column: string | null
    direction: 'asc' | 'desc'
    onColumnClick: (header: string) => void
  }
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-brand-50 text-surface-dark">
            <tr>
              {columns.map((c) => {
                const sortable = Boolean(sort && c.sortValue)
                const active = sort?.column === c.header
                return (
                  <th
                    key={c.header}
                    className={`whitespace-nowrap px-4 py-3 font-semibold ${c.className ?? ''}`}
                    aria-sort={
                      sortable
                        ? active
                          ? sort!.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => sort!.onColumnClick(c.header)}
                        className="inline-flex items-center gap-1 rounded-md -mx-1 px-1 py-0.5 text-left font-semibold text-surface-dark hover:bg-brand-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        <span>{c.header}</span>
                        {active ? (
                          <span className="text-xs font-normal text-surface-text" aria-hidden>
                            {sort!.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="text-surface-text">
                {columns.map((c) => (
                  <td key={c.header} className={`whitespace-nowrap px-4 py-3 ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-surface-text" colSpan={columns.length}>
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-brand-100 bg-surface px-4 py-3">
        <div className="text-sm text-surface-text">
          Page {page} of {totalPages} · {totalCount} total
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-brand-100 px-3 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-50"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            className="rounded-md border border-brand-100 px-3 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50 disabled:opacity-50"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

