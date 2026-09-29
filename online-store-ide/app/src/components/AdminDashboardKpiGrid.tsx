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

export default function AdminDashboardKpiGrid() {
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
  const avgOrderValue = stats.orders > 0 ? fmt(Math.round(stats.revenue / stats.orders)) : fmt(0)

  return (
    <div
      className={cm.cn(
        cm.grid({ gap: 'lg' }),
        cm.sp('mb', 8),
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      )}
      data-mol-id="kpi-grid"
    >
      {/* Card 1: Total Revenue */}
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="kpi-revenue"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-success-light text-success rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')}>payments</span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('adminDashboard.totalRevenue', {}, { defaultValue: 'Total Revenue' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="kpi-revenue-value"
        >
          {fmt(stats.revenue)}
        </p>
      </div>
      {/* Card 2: Orders */}
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="kpi-orders"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-blue-50 text-blue-600 rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')}>shopping_bag</span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('adminDashboard.orders', {}, { defaultValue: 'Orders' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="kpi-orders-value"
        >
          {stats.orders}
        </p>
      </div>
      {/* Card 3: Avg Order Value */}
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="kpi-aov"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-warning-light text-warning rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')}>trending_up</span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('adminDashboard.avgOrderValue', {}, { defaultValue: 'Avg. Order Value' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-foreground tabular-nums',
          )}
          data-mol-id="kpi-aov-value"
        >
          {avgOrderValue}
        </p>
      </div>
      {/* Card 4: New Customers */}
      <div
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm border border-border')}
        data-mol-id="kpi-customers"
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <div className={cm.cn(cm.sp('p', 2), 'bg-purple-50 text-purple-600 rounded-lg')}>
            <span className={cm.cn('material-symbols-outlined')}>group</span>
          </div>
        </div>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t('adminDashboard.newCustomers', {}, { defaultValue: 'New Customers' })}
        </p>
        <h4
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'tabular-nums',
          )}
          data-mol-id="kpi-customers-value"
        >
          {stats.newCustomers}
        </h4>
      </div>
    </div>
  )
}
export { AdminDashboardKpiGrid }
