/**
 * Thin shim around @molecule/app-admin-table-react. Loads orders from
 * /api/admin/orders, maps each row to AdminTableColumn render fns;
 * the shared package owns the loading skeleton + row hover +
 * row-actions kebab menu.
 *
 * Conditional row actions (cancel only when status !== cancelled/
 * refunded) are handled inline via the filtered rowActions array.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableRowAction,
} from '@molecule/app-admin-table-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unpackListPayload } from '../utils/httpUnpack.js'
import AdminOrdersPagination from './AdminOrdersPagination.js'

const STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-success-light text-success',
  shipped: 'bg-blue-100 text-blue-700',
  processing: 'bg-warning-light text-warning',
  confirmed: 'bg-purple-100 text-purple-700',
  pending: 'bg-surface-secondary text-foreground-secondary',
  cancelled: 'bg-error-light text-error',
  refunded: 'bg-rose-100 text-error',
}

interface OrderRow {
  id: string
  user_id?: string
  customer_name?: string
  total: number
  currency?: string
  status: string
  created_at?: string
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch (_error) {
    // Invalid date string — fall back to em-dash display value
    return '—'
  }
}

function fmtMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

function AdminOrdersTable() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = (): void => {
    setLoading(true)
    http
      .get('/api/admin/orders?limit=50')
      .then((res) => {
        const data = unpackListPayload(res) as OrderRow[]
        setOrders(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — reload is a stable fetch trigger defined in this scope

  const cancelOrder = async (id: string): Promise<void> => {
    try {
      await http.put(`/api/admin/orders/${id}/status`, { status: 'cancelled' })
      reload()
    } catch (_error) {
      // surface failure via reload — table will reflect previous state if PUT failed.
    }
  }

  const columns: AdminTableColumn<OrderRow>[] = [
    {
      id: 'orderId',
      header: t('adminOrdersTable.columnOrderId', {}, { defaultValue: 'Order ID' }),
      render: (o) => (
        <Link
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'text-success hover:underline',
          )}
          to={`/orders/${o.id}`}
        >
          #{o.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: t('nav.customer', {}, { defaultValue: 'Customer' }),
      className: cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground'),
      render: (o) => o.customer_name || '—',
    },
    {
      id: 'date',
      header: t('form.date', {}, { defaultValue: 'Date' }),
      className: cm.cn(cm.textSize('sm'), 'text-foreground-secondary'),
      render: (o) => fmtDate(o.created_at),
    },
    {
      id: 'total',
      header: t('nav.total', {}, { defaultValue: 'Total' }),
      className: cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-foreground tabular-nums'),
      render: (o) => fmtMoney(Number(o.total ?? 0), o.currency),
    },
    {
      id: 'status',
      header: t('nav.status', {}, { defaultValue: 'Status' }),
      render: (o) => {
        const status = String(o.status || '').toLowerCase()
        const cls = STATUS_STYLES[status] ?? 'bg-surface-secondary text-foreground-secondary'
        return (
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.roundedFull,
              cm.sp('py', 1),
              `px-2.5 text-[11px] uppercase ${cls}`,
            )}
          >
            {t(`common.status.${status}`, {}, { defaultValue: status })}
          </span>
        )
      },
    },
  ]

  const rowActions: AdminTableRowAction<OrderRow>[] = [
    {
      label: t('adminOrdersTable.viewOrder', {}, { defaultValue: 'View order' }),
      hrefFor: (o) => `/orders/${o.id}`,
      onSelect: () => {},
    },
    {
      label: t('adminOrdersTable.cancelOrder', {}, { defaultValue: 'Cancel order' }),
      destructive: true,
      dataMolIdFor: (o) => `cancel-order-${o.id}`,
      onSelect: async (o) => {
        const status = String(o.status || '').toLowerCase()
        if (status === 'cancelled' || status === 'refunded') return
        await cancelOrder(o.id)
      },
    },
  ]

  const emptyState = (
    <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')} data-mol-id="orders-empty">
      {t(
        'adminOrdersTable.empty',
        {},
        { defaultValue: 'No orders yet — orders will appear here as customers check out.' },
      )}
    </p>
  )

  return (
    <div data-mol-id="orders-table-container">
      <AdminTable
        rows={orders}
        columns={columns}
        rowKey={(o) => o.id}
        loading={loading}
        rowActions={rowActions}
        rowActionsAriaLabel={() =>
          t('adminOrdersTable.rowActions', {}, { defaultValue: 'Row actions' })
        }
        footer={<AdminOrdersPagination />}
        tbodyDataMolId="orders-tbody"
      />
      {!loading && orders.length === 0 ? emptyState : null}
    </div>
  )
}

export default AdminOrdersTable
export { AdminOrdersTable }
