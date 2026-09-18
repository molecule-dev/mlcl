import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { VendryKpiCard } from '../components/VendryKpiCard.js'
import {
  type VendryOrder,
  VendryOrderCard,
  type VendryOrderStatus,
  type VendryOrderVendorGroup,
} from '../components/VendryOrderCard.js'

interface ApiOrderItem {
  product_id?: string
  name?: string
  quantity?: number
  qty?: number
  price?: number
  price_cents?: number
}

interface ApiOrderVendor {
  vendor_id?: string
  vendor_name?: string
  vendor_slug?: string
  vendor_verified?: boolean
  status: VendryOrderStatus
  subtotal?: number
  subtotal_cents?: number
  tracking_number?: string | null
  carrier?: string | null
  items: ApiOrderItem[]
}

interface ApiOrder {
  id: string
  display_id?: string
  status: VendryOrderStatus
  total?: number
  total_cents?: number
  placed_at?: string
  created_at?: string
  vendors?: ApiOrderVendor[]
}

function coerceOrder(api: ApiOrder): VendryOrder {
  const vendor_groups: VendryOrderVendorGroup[] = (api.vendors ?? []).map((v) => ({
    vendor_id: v.vendor_id || 'self',
    vendor_name: v.vendor_name || 'Vendor',
    vendor_slug: v.vendor_slug,
    vendor_verified: v.vendor_verified,
    status: v.status,
    subtotal_cents: v.subtotal_cents ?? Math.round((v.subtotal ?? 0) * 100),
    items: v.items.map((i, idx) => ({
      id: `${api.id}-${i.product_id ?? idx}`,
      name: i.name || 'Item',
      vendor_name: v.vendor_name || 'Vendor',
      vendor_slug: v.vendor_slug,
      quantity: i.qty ?? i.quantity ?? 1,
      price_cents: i.price_cents ?? Math.round((i.price ?? 0) * 100),
    })),
    tracking_number: v.tracking_number ?? undefined,
    carrier: v.carrier ?? undefined,
  }))
  return {
    id: api.id,
    display_id: api.display_id ?? `VND-${api.id.slice(0, 6).toUpperCase()}`,
    placed_at: api.placed_at ?? api.created_at ?? new Date().toISOString(),
    status: api.status,
    total_cents: api.total_cents ?? Math.round((api.total ?? 0) * 100),
    vendor_groups,
  }
}

interface VendorDashboardKpis {
  gross_sales_cents: number
  gross_sales_change_pct: number
  net_payout_cents: number
  net_payout_change_pct: number
  orders_count: number
  orders_change_pct: number
  pending_payout_cents: number
  conversion_rate_pct: number
}

const FALLBACK_KPIS: VendorDashboardKpis = {
  gross_sales_cents: 1842500,
  gross_sales_change_pct: 12.4,
  net_payout_cents: 1695100,
  net_payout_change_pct: 11.8,
  orders_count: 184,
  orders_change_pct: 8.2,
  pending_payout_cents: 142400,
  conversion_rate_pct: 4.1,
}

const FALLBACK_ORDERS: VendryOrder[] = [
  {
    id: 'ord-3401',
    display_id: 'VND-3401',
    placed_at: '2026-04-28T09:14:00Z',
    status: 'paid',
    total_cents: 14400,
    vendor_groups: [
      {
        vendor_id: 'self',
        vendor_name: 'Mira & Co. Ceramics',
        status: 'paid',
        subtotal_cents: 14400,
        items: [
          {
            id: 'i-1',
            name: 'Sienna Stoneware Mug — set of 2',
            vendor_name: 'Mira & Co. Ceramics',
            quantity: 3,
            price_cents: 4800,
          },
        ],
      },
    ],
  },
  {
    id: 'ord-3402',
    display_id: 'VND-3402',
    placed_at: '2026-04-27T16:42:00Z',
    status: 'shipped',
    total_cents: 9200,
    vendor_groups: [
      {
        vendor_id: 'self',
        vendor_name: 'Mira & Co. Ceramics',
        status: 'shipped',
        subtotal_cents: 9200,
        tracking_number: '1Z 9871 4422 0019',
        carrier: 'UPS',
        items: [
          {
            id: 'i-2',
            name: 'Amber Glass Pendant Light',
            vendor_name: 'Mira & Co. Ceramics',
            quantity: 1,
            price_cents: 7800,
          },
          {
            id: 'i-3',
            name: 'Indigo-Dyed Tea Towel',
            vendor_name: 'Mira & Co. Ceramics',
            quantity: 1,
            price_cents: 1400,
          },
        ],
      },
    ],
  },
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

interface VendorMe {
  id: string
  name: string
  slug?: string
}

export function VendorDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth()
  const [kpis, setKpis] = useState<VendorDashboardKpis | null>(null)
  const [recentOrders, setRecentOrders] = useState<VendryOrder[] | null>(null)
  const [vendorName, setVendorName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http
        .get<VendorDashboardKpis | { data?: VendorDashboardKpis }>('/api/vendors/me/dashboard')
        .catch(() => null),
      http.get<{ data?: ApiOrder[] } | ApiOrder[]>('/api/vendors/me/orders').catch(() => null),
      http.get<VendorMe | { data?: VendorMe }>('/api/vendors/me').catch(() => null),
    ]).then(([kpiRes, ordersRes, meRes]) => {
      if (cancelled) return
      if (kpiRes) {
        const raw = (kpiRes as { data?: unknown }).data ?? kpiRes
        const k =
          raw && typeof raw === 'object' && 'gross_sales_cents' in (raw as Record<string, unknown>)
            ? (raw as VendorDashboardKpis)
            : ((raw as { data?: VendorDashboardKpis }).data as VendorDashboardKpis | undefined)
        if (k) setKpis(k)
      }
      if (ordersRes) {
        const raw = (ordersRes as { data?: unknown }).data ?? ordersRes
        const list = Array.isArray(raw)
          ? (raw as ApiOrder[])
          : ((raw as { data?: ApiOrder[] }).data ?? [])
        setRecentOrders(list.slice(0, 5).map(coerceOrder))
      }
      if (meRes) {
        const raw = (meRes as { data?: unknown }).data ?? meRes
        const me =
          raw && typeof raw === 'object' && 'name' in (raw as Record<string, unknown>)
            ? (raw as VendorMe)
            : ((raw as { data?: VendorMe }).data as VendorMe | undefined)
        if (me?.name) setVendorName(me.name)
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const effectiveKpis = kpis ?? FALLBACK_KPIS
  const effectiveOrders = recentOrders ?? FALLBACK_ORDERS
  const displayName =
    vendorName ?? (auth.user as { name?: string } | null)?.name ?? 'Mira & Co. Ceramics'

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1400px] space-y-10')}>
      <header
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div className={cm.cn(cm.stack(2))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-sky-700 dark:text-info',
            )}
          >
            {t(
              'vendorDashboard.eyebrow',
              { vendor: displayName },
              { defaultValue: 'Vendor admin · {{vendor}}' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl md:text-5xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t(
              'vendorDashboard.title',
              { name: displayName.split(' ')[0] },
              { defaultValue: 'Welcome back, {{name}}' },
            )}
          </h1>
          <p className={cm.cn(cm.maxW('xl'), 'text-on-surface-variant text-lg leading-relaxed')}>
            {t(
              'vendorDashboard.subtitle',
              {},
              { defaultValue: "Here's how your shop is performing this week." },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <Link
            to="/vendor/products/new"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/10',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              add
            </span>
            {t('vendorDashboard.newProductCta', {}, { defaultValue: 'New product' })}
          </Link>
          <Link
            to="/vendor/payouts"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('semibold'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.roundedFull,
              'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              account_balance
            </span>
            {t('vendorDashboard.payoutsCta', {}, { defaultValue: 'View payouts' })}
          </Link>
        </div>
      </header>

      {/* Hero gradient KPI */}
      <section
        className={cm.cn(
          cm.sp('p', 10),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-container to-info text-on-primary',
        )}
      >
        <div className="relative z-10">
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest opacity-80',
            )}
          >
            {t('vendorDashboard.heroLabel', {}, { defaultValue: 'Gross sales · last 30 days' })}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }),
              cm.sp('mt', 3),
            )}
          >
            <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
              {formatCurrency(effectiveKpis.gross_sales_cents)}
            </span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'bg-surface/20 backdrop-blur-md',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden>
                {effectiveKpis.gross_sales_change_pct >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {effectiveKpis.gross_sales_change_pct >= 0 ? '+' : ''}
              {effectiveKpis.gross_sales_change_pct.toFixed(1)}%
            </span>
          </div>
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'opacity-85')}>
            {t(
              'vendorDashboard.heroCaption',
              { payout: formatCurrency(effectiveKpis.net_payout_cents), appName: APP_NAME },
              {
                defaultValue:
                  '{{payout}} cleared after {{appName}} commission. Next payout Friday.',
              },
            )}
          </p>
        </div>
        <svg
          className={cm.cn(cm.sp('mt', 8), cm.w('full'), 'h-24 relative z-10')}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,80 Q40,70 80,55 T160,40 T240,30 T320,15 T400,5 L400,100 L0,100 Z"
            fill="white"
            opacity="0.25"
          />
          <path
            d="M0,80 Q40,70 80,55 T160,40 T240,30 T320,15 T400,5"
            fill="none"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
        <div
          className={
            'absolute -right-24 -bottom-24 w-[26rem] h-[26rem] rounded-full bg-surface/10 blur-3xl'
          }
          aria-hidden
        />
        <div
          className={'absolute right-12 top-12 w-32 h-32 rounded-full bg-info/40 blur-2xl'}
          aria-hidden
        />
      </section>

      {/* KPI grid */}
      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 lg:grid-cols-4')}>
        <VendryKpiCard
          icon="receipt_long"
          label={t('vendorDashboard.kpi.orders', {}, { defaultValue: 'Orders' })}
          value={effectiveKpis.orders_count.toLocaleString()}
          tone="info"
          trend={`${effectiveKpis.orders_change_pct >= 0 ? '+' : ''}${effectiveKpis.orders_change_pct.toFixed(1)}%`}
          trendDirection={effectiveKpis.orders_change_pct >= 0 ? 'up' : 'down'}
          caption={t('vendorDashboard.kpi.ordersCaption', {}, { defaultValue: 'vs last 30 days' })}
        />
        <VendryKpiCard
          icon="account_balance_wallet"
          label={t('vendorDashboard.kpi.netPayout', {}, { defaultValue: 'Net payout' })}
          value={formatCurrency(effectiveKpis.net_payout_cents)}
          tone="success"
          trend={`${effectiveKpis.net_payout_change_pct >= 0 ? '+' : ''}${effectiveKpis.net_payout_change_pct.toFixed(1)}%`}
          trendDirection={effectiveKpis.net_payout_change_pct >= 0 ? 'up' : 'down'}
          caption={t(
            'vendorDashboard.kpi.netPayoutCaption',
            { appName: APP_NAME },
            { defaultValue: 'After 8% {{appName}} commission' },
          )}
        />
        <VendryKpiCard
          icon="schedule"
          label={t('vendorDashboard.kpi.pendingPayout', {}, { defaultValue: 'Pending payout' })}
          value={formatCurrency(effectiveKpis.pending_payout_cents)}
          tone="warning"
          caption={t(
            'vendorDashboard.kpi.pendingPayoutCaption',
            {},
            { defaultValue: 'Releases this Friday' },
          )}
        />
        <VendryKpiCard
          icon="bar_chart"
          label={t('vendorDashboard.kpi.conversion', {}, { defaultValue: 'Conversion' })}
          value={`${effectiveKpis.conversion_rate_pct.toFixed(1)}%`}
          tone="primary"
          caption={t(
            'vendorDashboard.kpi.conversionCaption',
            {},
            { defaultValue: 'Visit-to-order this week' },
          )}
        />
      </section>

      {/* Recent orders */}
      <section className={cm.cn(cm.stack(4))}>
        <header className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-2xl tracking-tight font-extrabold text-on-surface',
            )}
          >
            {t('vendorDashboard.recentOrders.title', {}, { defaultValue: 'Recent orders' })}
          </h2>
          <Link
            to="/vendor/orders"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-orange-700 dark:text-primary hover:underline',
            )}
          >
            {t('vendorDashboard.recentOrders.cta', {}, { defaultValue: 'View all orders →' })}
          </Link>
        </header>
        <div className={cm.cn(cm.stack(4))}>
          {effectiveOrders.map((order) => (
            <VendryOrderCard key={order.id} order={order} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default VendorDashboard
