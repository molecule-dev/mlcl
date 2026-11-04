import { type ListRouteResult, useListRoute } from '@molecule/app-routing-react-router'

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const DATES = ['today', '7d', '30d']

/** Shared URL contract for the orders page's search boxes, filters and table. */
export function useAdminOrdersRoute(): ListRouteResult<'q' | 'status' | 'date'> & {
  filters: { status: string; date: string }
} {
  const list = useListRoute({
    pageSize: 10,
    filters: { q: {}, status: { defaultValue: '' }, date: { defaultValue: 'all' } },
  })
  return {
    ...list,
    filters: {
      ...list.filters,
      status: STATUSES.includes(list.filters.status ?? '') ? list.filters.status! : '',
      date: DATES.includes(list.filters.date ?? '') ? list.filters.date! : 'all',
    },
  }
}

/** UTC calendar ranges are stable across client/server time zones. */
export function orderDateRange(date: string): { start_date: string; end_date: string } | undefined {
  if (!DATES.includes(date)) return undefined
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  start.setUTCDate(start.getUTCDate() - (date === '7d' ? 6 : date === '30d' ? 29 : 0))
  return { start_date: start.toISOString(), end_date: end.toISOString() }
}
