import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CreatorStat } from '../components/CreatorStatGrid.js'
import { CreatorStatGrid } from '../components/CreatorStatGrid.js'
import type { SaleRow } from '../components/RecentSalesTable.js'
import { RecentSalesTable } from '../components/RecentSalesTable.js'
import { RevenueHeroCard } from '../components/RevenueHeroCard.js'

interface Analytics {
  totalRevenueCents: number
  monthRevenueCents: number
  monthChangeCents: number
  monthChangePct: number
  totalSales: number
  totalDownloads: number
  totalProducts: number
  monthSales: number
  conversionPct: number
  sparkline: number[]
  topProducts: { slug: string; name: string; sales_count: number; revenue_cents: number }[]
}

interface ApiSale {
  id: string
  product_name: string
  product_slug?: string
  customer_name: string
  customer_email?: string
  customer_avatar?: string
  amount_cents: number
  occurred_at: string
  status: SaleRow['status']
  license_key?: string
}

const EMPTY_ANALYTICS: Analytics = {
  totalRevenueCents: 0,
  monthRevenueCents: 0,
  monthChangeCents: 0,
  monthChangePct: 0,
  totalSales: 0,
  totalDownloads: 0,
  totalProducts: 0,
  monthSales: 0,
  conversionPct: 0,
  sparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  topProducts: [],
}

function unwrapList(res: unknown): ApiSale[] {
  if (Array.isArray(res)) return res as ApiSale[]
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (Array.isArray(data)) return data as ApiSale[]
    // useHttpClient wraps API JSON in `{ data: <json>, status, ... }`,
    // and our API returns `{ data: [...] }`, so peel the second layer.
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      const inner = (data as { data: unknown }).data
      if (Array.isArray(inner)) return inner as ApiSale[]
    }
  }
  return []
}

function unwrapObject(res: unknown): Analytics | null {
  if (Array.isArray(res) && res.length > 0 && typeof res[0] === 'object') {
    return res[0] as Analytics
  }
  if (res && typeof res === 'object') {
    if ('data' in res) {
      const data = (res as { data: unknown }).data
      if (Array.isArray(data) && data.length > 0) return data[0] as Analytics
      if (data && typeof data === 'object') return data as Analytics
    }
    if ('totalRevenueCents' in res) return res as Analytics
  }
  return null
}

function toSaleRow(s: ApiSale): SaleRow {
  return {
    id: s.id,
    productName: s.product_name,
    productSlug: s.product_slug,
    customerName: s.customer_name,
    customerEmail: s.customer_email,
    customerAvatar: s.customer_avatar,
    amountCents: s.amount_cents,
    occurredAt: s.occurred_at,
    status: s.status,
    licenseKey: s.license_key,
  }
}

function formatUsdCompact(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      http.get('/api/analytics').catch(() => null),
      http.get('/api/sales').catch(() => null),
    ])
      .then(([analyticsRes, salesRes]) => {
        const a = unwrapObject(analyticsRes)
        if (a) setAnalytics(a)
        setSales(unwrapList(salesRes).slice(0, 5).map(toSaleRow))
      })
      .finally(() => setLoading(false))
  }, [http])

  const stats: CreatorStat[] = [
    {
      key: 'monthRevenue',
      label: t('dashboard.stat.monthRevenue', {}, { defaultValue: 'Revenue (30d)' }),
      value: formatUsdCompact(analytics.monthRevenueCents),
      // Negative percentages already carry their '-' sign; only prepend '+'
      // for gains (otherwise a -12.3 delta rendered as "+-12.3%").
      delta:
        analytics.monthChangePct >= 0
          ? t(
              'dashboard.stat.monthDelta',
              { pct: analytics.monthChangePct.toFixed(1) },
              { defaultValue: '+{{pct}}%' },
            )
          : t(
              'dashboard.stat.monthDeltaDown',
              { pct: analytics.monthChangePct.toFixed(1) },
              { defaultValue: '{{pct}}%' },
            ),
      deltaPositive: analytics.monthChangePct >= 0,
      icon: 'payments',
      accent: 'primary',
    },
    {
      key: 'sales',
      label: t('dashboard.stat.sales', {}, { defaultValue: 'Sales (30d)' }),
      value: analytics.monthSales.toLocaleString(),
      icon: 'point_of_sale',
      accent: 'success',
    },
    {
      key: 'downloads',
      label: t('dashboard.stat.downloads', {}, { defaultValue: 'Downloads' }),
      value: analytics.totalDownloads.toLocaleString(),
      icon: 'download',
      accent: 'info',
    },
    {
      key: 'conversion',
      label: t('dashboard.stat.conversion', {}, { defaultValue: 'Conversion' }),
      value: `${analytics.conversionPct.toFixed(1)}%`,
      icon: 'trending_up',
      accent: 'accent',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(8))}>
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Creator dashboard' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface',
            )}
          >
            {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subtitle',
              { count: analytics.monthSales },
              { defaultValue: '{{count}} sales in the last 30 days. Keep shipping.' },
            )}
          </p>
        </div>
        <Link
          to="/products/new"
          data-testid="dashboard-add-product"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl shadow-md shadow-primary/30 hover:bg-primary-hover transition-colors',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          {t('dashboard.addProduct', {}, { defaultValue: 'Add product' })}
        </Link>
      </header>

      <RevenueHeroCard
        totalRevenueCents={analytics.totalRevenueCents}
        changePct={analytics.monthChangePct}
        changeAbsCents={analytics.monthChangeCents}
        rangeLabel={t('dashboard.range30', {}, { defaultValue: '30d' })}
        sparkline={analytics.sparkline}
      />

      <CreatorStatGrid stats={stats} />

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn('lg:col-span-2')}>
          {loading && sales.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest text-center text-on-surface-variant',
              )}
            >
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          ) : (
            <RecentSalesTable sales={sales} />
          )}
        </div>
        <aside
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
        >
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-on-surface',
            )}
          >
            {t('dashboard.topProducts', {}, { defaultValue: 'Top products' })}
          </h3>
          <ul className={cm.stack(3)}>
            {analytics.topProducts.map((p) => (
              <li
                key={p.slug}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 3),
                  'rounded-xl hover:bg-bg-secondary transition-colors',
                )}
              >
                <Link
                  to={`/shop/${p.slug}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.fontWeight('semibold'),
                    'text-on-surface hover:text-primary',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-primary-dark"
                    style={{ fontSize: 20 }}
                  >
                    inventory_2
                  </span>
                  <span>{p.name}</span>
                </Link>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatUsdCompact(p.revenue_cents)}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  )
}

export default Dashboard
