import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AdminStats {
  orders: number
  revenue: number
  newCustomers: number
  products: number
  pending: number
  completed: number
}

function AdminOrdersStatsGrid() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<AdminStats>({
    orders: 0,
    revenue: 0,
    newCustomers: 0,
    products: 0,
    pending: 0,
    completed: 0,
  })

  useEffect(() => {
    http.get('/api/admin/stats').then((res) => {
      const body = ((res as { data?: unknown })?.data ?? res) as Partial<AdminStats> | undefined
      if (body && typeof body === 'object') {
        setStats({
          orders: Number(body.orders ?? 0),
          revenue: Number(body.revenue ?? 0),
          newCustomers: Number(body.newCustomers ?? 0),
          products: Number(body.products ?? 0),
          pending: Number(body.pending ?? 0),
          completed: Number(body.completed ?? 0),
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount — http client is stable, re-subscribing would double-fetch

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  const completionRate = stats.orders > 0 ? Math.round((stats.completed / stats.orders) * 100) : 0

  return (
    <div
      className={cm.cn(
        cm.grid({ cols: 1, gap: 'lg' }),
        cm.sp('mb', 8),
        'sm:grid-cols-2 lg:grid-cols-4',
      )}
      data-mol-id="stats-row"
    >
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="stat-total-orders"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-blue-50 text-blue-600 rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')} data-icon="shopping_cart">
              shopping_cart
            </span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('adminOrdersStatsGrid.ordersTitle', {}, { defaultValue: 'Total Orders' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="stat-total-orders-value"
        >
          {stats.orders}
        </p>
      </div>
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="stat-pending"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-warning-light text-warning rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')} data-icon="pending">
              pending
            </span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('status.pending', {}, { defaultValue: 'Pending' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="stat-pending-value"
        >
          {stats.pending}
        </p>
      </div>
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="stat-completed"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-success-light text-success rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')} data-icon="check_circle">
              check_circle
            </span>
          </div>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 1 }),
              'text-success',
            )}
          >
            {t(
              'adminOrdersStatsGrid.rateBadge',
              { rate: completionRate },
              { defaultValue: '{{rate}}% rate' },
            )}
          </span>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('common.completed', {}, { defaultValue: 'Completed' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="stat-completed-value"
        >
          {stats.completed}
        </p>
      </div>
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="stat-revenue"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-purple-50 text-purple-600 rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')} data-icon="payments">
              payments
            </span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('adminOrdersStatsGrid.revenueTitle', {}, { defaultValue: 'Revenue' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="stat-revenue-value"
        >
          {fmt(stats.revenue)}
        </p>
      </div>
    </div>
  )
}

export default AdminOrdersStatsGrid
export { AdminOrdersStatsGrid }
