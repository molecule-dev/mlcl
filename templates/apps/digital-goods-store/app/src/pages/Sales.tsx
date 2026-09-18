import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { CreatorStat } from '../components/CreatorStatGrid.js'
import { CreatorStatGrid } from '../components/CreatorStatGrid.js'
import type { SaleRow } from '../components/RecentSalesTable.js'
import { RecentSalesTable } from '../components/RecentSalesTable.js'

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

function unwrap(res: unknown): ApiSale[] {
  if (Array.isArray(res)) return res as ApiSale[]
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data
    if (Array.isArray(data)) return data as ApiSale[]
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      const inner = (data as { data: unknown }).data
      if (Array.isArray(inner)) return inner as ApiSale[]
    }
  }
  return []
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

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function Sales() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | SaleRow['status']>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    http
      .get('/api/sales')
      .then((res) => setSales(unwrap(res).map(toSaleRow)))
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }, [http])

  const searchLower = search.trim().toLowerCase()
  const filtered = sales
    .filter((s) => filter === 'all' || s.status === filter)
    .filter(
      (s) =>
        !searchLower ||
        s.productName.toLowerCase().includes(searchLower) ||
        (s.customerName ?? '').toLowerCase().includes(searchLower) ||
        (s.customerEmail ?? '').toLowerCase().includes(searchLower),
    )
  const totalRevenue = sales
    .filter((s) => s.status !== 'refunded')
    .reduce((sum, s) => sum + s.amountCents, 0)
  const refundedCount = sales.filter((s) => s.status === 'refunded').length
  const licensedCount = sales.filter((s) => s.status === 'licensed').length

  const stats: CreatorStat[] = [
    {
      key: 'revenue',
      label: t('sales.stat.revenue', {}, { defaultValue: 'Net revenue' }),
      value: formatUsd(totalRevenue),
      icon: 'payments',
      accent: 'primary',
    },
    {
      key: 'count',
      label: t('sales.stat.count', {}, { defaultValue: 'Total sales' }),
      value: String(sales.length),
      icon: 'point_of_sale',
      accent: 'success',
    },
    {
      key: 'licensed',
      label: t('sales.stat.licensed', {}, { defaultValue: 'Licensed' }),
      value: String(licensedCount),
      icon: 'verified',
      accent: 'info',
    },
    {
      key: 'refunded',
      label: t('sales.stat.refunded', {}, { defaultValue: 'Refunded' }),
      value: String(refundedCount),
      icon: 'undo',
      accent: 'accent',
    },
  ]

  const FILTERS: { key: 'all' | SaleRow['status']; label: string }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'licensed', label: t('sales.filter.licensed', {}, { defaultValue: 'Licensed' }) },
    { key: 'pending', label: t('status.pending', {}, { defaultValue: 'Pending' }) },
    { key: 'refunded', label: t('sales.filter.refunded', {}, { defaultValue: 'Refunded' }) },
  ]

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(8))}>
      <header>
        <Link
          to="/dashboard"
          data-testid="sales-back"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'text-on-surface-variant hover:text-primary',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            arrow_back
          </span>
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('sales.eyebrow', {}, { defaultValue: 'Revenue' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'text-on-surface',
          )}
        >
          {t('sales.title', {}, { defaultValue: 'Sales & licenses' })}
        </h1>
      </header>

      <CreatorStatGrid stats={stats} />

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
        <div className={cm.cn('relative flex-1 min-w-[240px]')}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="sales-search"
            placeholder={t(
              'sales.searchPlaceholder',
              {},
              { defaultValue: 'Search by product, customer, or email…' },
            )}
            aria-label={t('sales.searchAria', {}, { defaultValue: 'Search sales' })}
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 5),
              cm.sp('py', 3),
              cm.w('full'),
              cm.roundedFull,
              'bg-bg-secondary border border-border placeholder:text-on-surface-variant focus:outline-none focus:border-primary',
            )}
          />
        </div>
      </div>

      <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                : 'bg-bg-secondary text-on-surface-variant hover:bg-primary-light hover:text-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <RecentSalesTable
          sales={filtered}
          title={t('sales.tableTitle', {}, { defaultValue: 'Order history' })}
        />
      )}
    </div>
  )
}

export default Sales
