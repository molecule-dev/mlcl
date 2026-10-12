import { useEffect, useState } from 'react'

import { DataTableCard } from '@molecule/app-data-table-ui-react'
import { PaginationBar } from '@molecule/app-pagination-bar-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()
const PAGE_SIZE = 25
const STATUSES = ['open', 'paid', 'shipped', 'delivered'] as const

type SortDir = 'asc' | 'desc'

type Order = {
  id: string
  total: number
  status: string
  created_at: string
}

type Page = { rows: Order[]; total: number }

/**
 * Whether a row from `GET /api/orders` is an order the render can show without
 * lying. The three fields gated here are the ones the cells cannot degrade
 * gracefully: `id` (the row key), `total` (a non-number renders `$NaN`), and
 * `created_at` (a non-string renders "Invalid Date") — `status` falls back to
 * its raw value, but a row missing the others is not an order at all. The same
 * per-row gate the markdown-blog index applies to its posts (`body.every`).
 */
const isOrder = (row: unknown): row is Order =>
  typeof row === 'object' &&
  row !== null &&
  typeof (row as Order).id === 'string' &&
  typeof (row as Order).total === 'number' &&
  typeof (row as Order).created_at === 'string' &&
  typeof (row as Order).status === 'string'

/** Clickable column header that shows an up/down arrow for the active sort. */
function SortableHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string
  field: string
  sort: { field: string; dir: SortDir }
  onSort: (next: { field: string; dir: SortDir }) => void
}) {
  const isActive = sort.field === field
  const nextDir: SortDir = isActive && sort.dir === 'asc' ? 'desc' : 'asc'
  return (
    <button
      type="button"
      onClick={() => onSort({ field, dir: nextDir })}
      className={cm.flex({ align: 'center', gap: 'xs' })}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {label}
      <span aria-hidden="true" style={{ fontSize: '0.7em' }}>
        {isActive ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </span>
    </button>
  )
}

export function OrdersPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState<Page>({ rows: [], total: 0 })
  const [pageIndex, setPageIndex] = useState(1)
  /**
   * Whether a request is in flight — TRUE from the first render.
   *
   * The rows are empty until the effect's request resolves, so `loading: false`
   * made the skeleton/empty choice below take the EMPTY branch on the first
   * paint: `DataTableCard` rendered its `emptyMessage` — "No orders found." — for
   * a list nobody had read yet, and that authoritative-looking wrong answer is
   * what the reader (or a screenshot) sees on a slow first paint. Only a request
   * that actually answered may say the list is empty.
   */
  const [loading, setLoading] = useState(true)
  /**
   * Whether the last request failed.
   *
   * The rows already on screen are KEPT when one does (see the catch below) —
   * and the paginator is optimistic: it moves to the page the user asked for the
   * moment they click, which is what lets two quick clicks request pages 2 and
   * 3 (see the `cancelled` guard). So a failed load leaves page 1's rows under a
   * paginator reading page 2, and nothing on screen used to say so. This flag is
   * the missing disclosure.
   */
  const [loadFailed, setLoadFailed] = useState(false)
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({
    field: 'created_at',
    dir: 'desc',
  })
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  useEffect(() => {
    // A page/sort/filter change starts a NEW request while the previous one may
    // still be in flight (two quick "Next" clicks, a filter click mid-load).
    // Without this guard the LATE response wins: the older page's rows land
    // after the newer page's, so the table shows page 1 while the paginator
    // (driven by `pageIndex`) reads page 2 — and the stale response's handler
    // clears `loading` for the request the user is still waiting on. Same guard
    // as the paginated-user-list example's page.
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((pageIndex - 1) * PAGE_SIZE),
      sort: sort.field,
      dir: sort.dir,
    })
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/orders?${params.toString()}`)
      // `res.ok` is checked and the body coerced before it reaches state: a
      // non-2xx answer (401 expired session, 500) still resolves with a JSON
      // body (`{ error }`), which `r.json()` parses happily — without these
      // guards that object lands in `page`, `page.rows` is undefined, and
      // DataTableCard's `rows.map` throws instead of the failure being visible.
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: unknown) => {
        if (cancelled) return
        const body = (data ?? {}) as Partial<Page>
        // A 2xx proves the route ANSWERED, not that the body is a page: the mock
        // server answers 200 `{}` for an endpoint with no fixture, and a proxy
        // can rewrite a failure into a 200. Coerced silently that body cleared
        // the spinner and rendered the EMPTY state — "No orders found." for a
        // list nobody actually read — so it is reported as the failed load it is
        // (the rule the sibling list slices apply).
        if (!Array.isArray(body.rows)) {
          setLoadFailed(true)
          setLoading(false)
          return
        }
        // …and every ROW must be an order. `[{ … }]` passes the array check and
        // the cells below dereference each row: "Invalid Date" under `$NaN` was
        // presented as a real list (a shrunken rewrite, a partial answer). A
        // body carrying rows that are not orders is the failed load it is.
        if (!body.rows.every(isOrder)) {
          setLoadFailed(true)
          setLoading(false)
          return
        }
        setPage({
          rows: body.rows,
          total: typeof body.total === 'number' ? body.total : 0,
        })
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        // The request failed (offline, 401, 500). Leave the rows already on
        // screen — blanking them would read as "you have no orders" — clear the
        // spinner so the user is not stuck loading forever, and SAY SO. The
        // paginator has already moved to the page the user asked for (that
        // optimism is what lets two quick clicks request pages 2 and 3), so
        // without this line the page shows page 1's orders under a page-2
        // header and reads as if they were page 2's.
        setLoadFailed(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pageIndex, sort, statusFilter])

  const handleSort = (next: { field: string; dir: SortDir }): void => {
    setSort(next)
    setPageIndex(1)
  }

  const totalPages = Math.max(1, Math.ceil(page.total / PAGE_SIZE))

  const columns = [
    {
      key: 'created_at',
      header: (
        <SortableHeader
          label={t('orders.col.date', undefined, { defaultValue: 'Date' })}
          field="created_at"
          sort={sort}
          onSort={handleSort}
        />
      ),
      cell: (o: Order) => new Date(o.created_at).toLocaleDateString(),
    },
    {
      key: 'total',
      header: (
        <SortableHeader
          label={t('orders.col.total', undefined, { defaultValue: 'Total' })}
          field="total"
          sort={sort}
          onSort={handleSort}
        />
      ),
      cell: (o: Order) => `$${(o.total / 100).toFixed(2)}`,
    },
    {
      key: 'status',
      header: (
        <SortableHeader
          label={t('orders.col.status', undefined, { defaultValue: 'Status' })}
          field="status"
          sort={sort}
          onSort={handleSort}
        />
      ),
      cell: (o: Order) => t(`orders.status.${o.status}`, undefined, { defaultValue: o.status }),
    },
  ]

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 6))}>
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('orders.title', undefined, { defaultValue: 'Orders' })}
      </h1>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('p', 1),
          'rounded-full border border-outline-variant/40 w-fit',
        )}
      >
        <button
          type="button"
          onClick={() => {
            setStatusFilter(null)
            setPageIndex(1)
          }}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full transition-colors',
            statusFilter === null
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('orders.all', undefined, { defaultValue: 'All' })}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatusFilter(s)
              setPageIndex(1)
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full transition-colors',
              statusFilter === s
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {t(`orders.status.${s}`, undefined, { defaultValue: s })}
          </button>
        ))}
      </div>
      {loadFailed ? (
        <p role="alert" data-mol-id="orders-load-failed" className={cm.textError}>
          {page.rows.length > 0
            ? t('orders.loadFailed', undefined, {
                defaultValue:
                  'Could not load these orders — the rows below are the last page that loaded.',
              })
            : // No rows at all: the "last page that loaded" line above describes
              // rows that do not exist, and a first-load failure is exactly when
              // the reader needs to be told nothing has been read yet.
              t('orders.loadFailedFirst', undefined, {
                defaultValue: 'Could not load the orders — nothing has been read yet.',
              })}
        </p>
      ) : null}
      <DataTableCard
        columns={columns}
        rows={page.rows}
        rowKey={(o: Order) => o.id}
        loading={loading}
        // A failed load must not let the table answer for the list: with no rows
        // and no spinner left, `DataTableCard` renders `emptyMessage` — which
        // said "No orders found." for a list nobody ever read, under the failure
        // alert above. Only an answer may say the list is empty.
        emptyMessage={
          loadFailed
            ? t('orders.emptyAfterFailure', undefined, {
                defaultValue: 'The orders could not be loaded — see the message above.',
              })
            : t('orders.empty', undefined, { defaultValue: 'No orders found.' })
        }
        dataMolId="orders-table"
      />
      <PaginationBar
        page={pageIndex}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        total={page.total}
        onPageChange={setPageIndex}
      />
    </div>
  )
}
