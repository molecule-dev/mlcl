import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unpackListPayload } from '../utils/httpUnpack.js'

function AdminDashboardRecentOrdersTable() {
  const cm = getClassMap()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  type OrderRow = {
    id: string
    customer_name?: string
    customer?: string
    product_name?: string
    product?: string
    total: number
    status: string
  }

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    http
      .get('/api/admin/orders?limit=5')
      .then((res) => {
        const data = unpackListPayload(res) as OrderRow[]
        setOrders(data)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — http client is stable, re-subscribing would double-fetch

  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    delivered: {
      bg: 'bg-success-light',
      text: 'text-success',
      label: t('common.status.delivered', {}, { defaultValue: 'Delivered' }),
    },
    shipped: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: t('common.status.shipped', {}, { defaultValue: 'Shipped' }),
    },
    processing: {
      bg: 'bg-warning-light',
      text: 'text-warning',
      label: t('common.status.processing', {}, { defaultValue: 'Processing' }),
    },
    confirmed: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      label: t('common.status.confirmed', {}, { defaultValue: 'Confirmed' }),
    },
    cancelled: {
      bg: 'bg-error-light',
      text: 'text-error',
      label: t('common.status.cancelled', {}, { defaultValue: 'Cancelled' }),
    },
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  return (
    <>
      {/* Recent Orders Table */}
      <div
        className={cm.cn('bg-surface rounded-lg shadow-sm border border-border overflow-hidden')}
      >
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ justify: 'between', align: 'center' }),
            'border-b border-slate-50',
          )}
        >
          <h5 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('recentOrdersTable.title', {}, { defaultValue: 'Recent Orders' })}
          </h5>
          <Link
            to="/admin/orders"
            className={cm.cn(
              'text-sm font-semibold text-primary hover:text-primary-dark transition-colors',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View All' })}
          </Link>
        </div>
        {/* overflow-x-auto: the 4-column table is wider than a 390px phone —
            let it scroll inside the card instead of widening the page. */}
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.w('full')}>
            <thead>
              <tr
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-left text-foreground-tertiary uppercase tracking-wider bg-surface-secondary/50',
                )}
              >
                <th className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                  {t('nav.customer', {}, { defaultValue: 'Customer' })}
                </th>
                <th className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                  {t('nav.product', {}, { defaultValue: 'Product' })}
                </th>
                <th className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </th>
                <th className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-border')} data-mol-id="recent-orders-tbody">
              {!loading && orders.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 8),
                      cm.textCenter,
                      cm.textSize('sm'),
                      'text-foreground-secondary',
                    )}
                  >
                    {t(
                      'recentOrdersTable.empty',
                      {},
                      {
                        defaultValue:
                          'No orders yet — orders will appear here once customers check out.',
                      },
                    )}
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const s = statusMap[order.status] ?? {
                  bg: 'bg-surface-secondary',
                  text: 'text-foreground',
                  label: order.status || t('settings.unknown', {}, { defaultValue: 'Unknown' }),
                }
                const customerDisplay =
                  order.customer_name ||
                  order.customer ||
                  t('settings.unknown', {}, { defaultValue: 'Unknown' })
                const initial = customerDisplay.charAt(0).toUpperCase()
                return (
                  <tr
                    key={order.id}
                    className={cm.cn(
                      cm.cursorPointer,
                      'hover:bg-surface-secondary transition-colors',
                    )}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                        <div
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'bg-border text-foreground-secondary',
                          )}
                        >
                          {initial}
                        </div>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                            'text-foreground',
                          )}
                        >
                          {customerDisplay}
                        </span>
                      </div>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        'text-foreground-secondary',
                      )}
                    >
                      {order.product_name ||
                        order.product ||
                        t('common.empty', {}, { defaultValue: '—' })}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 4),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'tabular-nums',
                      )}
                    >
                      {fmt(order.total || 0)}
                    </td>
                    <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          s.bg,
                          s.text,
                          'text-[10px] uppercase',
                        )}
                      >
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default AdminDashboardRecentOrdersTable
export { AdminDashboardRecentOrdersTable }
