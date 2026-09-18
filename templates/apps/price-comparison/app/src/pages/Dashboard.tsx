import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type PriceDropEvent, PriceDropFeed } from '../components/PriceDropFeed.js'
import { PriceWatchKpiGrid, type PriceWatchKpiStats } from '../components/PriceWatchKpiGrid.js'
import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'
import { SavingsHeroCard } from '../components/SavingsHeroCard.js'
import { fmtUsd, unwrapList } from '../lib/unwrap.js'

interface ApiNotification {
  id: string
  user_id: string
  type: string
  payload: {
    product_id?: string
    product_name?: string
    retailer?: string
    old_price_cents?: number
    new_price_cents?: number
  }
  read_at: string | null
  created_at: string
}

interface ApiTrendingDrop {
  productId: string
  drop: number
  dropPercent: number
  currentPrice: number
  highPrice: number
  product: {
    id: string
    name: string
    brand?: string
    category?: string
    best_price?: number
    price?: number
  } | null
}

interface ApiAlert {
  id: string
  status: 'active' | 'paused' | 'triggered'
  product_id: string
  target_price: number
  product?: { id: string; name: string; best_price?: number | null } | null
}

interface ApiWatchItem {
  id: string
  product_id: string
  product?: {
    id: string
    name: string
    brand?: string
    category?: string
    best_price?: number
    price?: number
  } | null
}

interface DashboardStats extends PriceWatchKpiStats {
  top_retailers: { name: string; savings_cents: number }[]
}

const dropToCard = (d: ApiTrendingDrop): ProductPriceCardProduct | null => {
  const p = d.product
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? '—',
    category: p.category ?? '—',
    best_price_cents: d.currentPrice,
    list_price_cents: d.highPrice,
    retailer_count: 5,
    drop_pct: Math.round(d.dropPercent),
    in_stock: true,
  }
}

const watchToCard = (w: ApiWatchItem): ProductPriceCardProduct | null => {
  const p = w.product
  if (!p) return null
  const list = Number(p.price ?? p.best_price ?? 0)
  const best = Number(p.best_price ?? p.price ?? 0)
  const dropPct = list > best && list > 0 ? Math.round(((list - best) / list) * 100) : 0
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? '—',
    category: p.category ?? '—',
    best_price_cents: best,
    list_price_cents: list,
    retailer_count: 5,
    drop_pct: dropPct,
    in_stock: true,
  }
}

const notificationToEvent = (n: ApiNotification): PriceDropEvent => {
  const old = Number(n.payload.old_price_cents ?? 0)
  const next = Number(n.payload.new_price_cents ?? 0)
  const kind: PriceDropEvent['kind'] =
    n.type === 'restock' ? 'restock' : n.type === 'alert' ? 'alert' : next > old ? 'rise' : 'drop'
  return {
    id: n.id,
    product_id: n.payload.product_id ?? '',
    product_name: n.payload.product_name ?? n.type,
    retailer: n.payload.retailer ?? '',
    kind,
    old_price_cents: old,
    new_price_cents: next,
    ts: n.created_at,
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats>({
    total_savings_cents: 0,
    watching_count: 0,
    drops_this_week: 0,
    expiring_alerts: 0,
    top_retailers: [],
  })
  const [trending, setTrending] = useState<ProductPriceCardProduct[]>([])
  const [drops, setDrops] = useState<PriceDropEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const [watchRes, alertRes, dropRes, notifRes] = await Promise.all([
          http.get('/api/watchlist').catch(() => null),
          http.get('/api/alerts').catch(() => null),
          http.get('/api/prices/trends/drops?limit=8&days=30').catch(() => null),
          http.get('/api/notifications?limit=10').catch(() => null),
        ])
        if (cancelled) return

        const watches = unwrapList<ApiWatchItem>(watchRes)
        const alerts = unwrapList<ApiAlert>(alertRes)
        const trendingDrops = unwrapList<ApiTrendingDrop>(dropRes)
        const notifs = unwrapList<ApiNotification>(notifRes)

        const totalSavings = watches.reduce((sum, w) => {
          const p = w.product
          if (!p) return sum
          const list = Number(p.price ?? 0)
          const best = Number(p.best_price ?? 0)
          return sum + Math.max(0, list - best)
        }, 0)

        const dropsThisWeek = trendingDrops.length

        setStats({
          total_savings_cents: totalSavings,
          watching_count: watches.length,
          drops_this_week: dropsThisWeek,
          expiring_alerts: alerts.filter((a) => a.status === 'triggered').length,
          top_retailers: [],
        })
        setTrending(
          trendingDrops
            .map(dropToCard)
            .filter((x): x is ProductPriceCardProduct => x !== null)
            .slice(0, 4)
            .concat(
              trendingDrops.length === 0
                ? watches
                    .map(watchToCard)
                    .filter((x): x is ProductPriceCardProduct => x !== null)
                    .slice(0, 4)
                : [],
            ),
        )
        setDrops(notifs.map(notificationToEvent))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')} data-test="dashboard-page">
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('dashboard.eyebrow', {}, { defaultValue: 'Your price watch' })}
        </p>
        <h1
          data-test="dashboard-heading"
          className={cm.cn(
            'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('dashboard.heading', {}, { defaultValue: 'Welcome back, smart shopper' })}
        </h1>
      </header>

      <SavingsHeroCard
        totalSavingsCents={stats.total_savings_cents}
        watchingCount={stats.watching_count}
        weekDropCount={stats.drops_this_week}
      />

      <PriceWatchKpiGrid stats={stats} />

      <section>
        <header
          className={cm.cn(
            cm.flex({ align: 'end', justify: 'between', gap: 'md' }),
            cm.sp('mb', 5),
          )}
        >
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('dashboard.trendingEyebrow', {}, { defaultValue: 'Trending now' })}
            </p>
            <h2 className={cm.cn('mt-1 text-2xl font-extrabold tracking-tight text-on-surface')}>
              {t('dashboard.trendingHeading', {}, { defaultValue: 'Hot drops in your watchlist' })}
            </h2>
          </div>
          <Link
            to="/deals"
            data-test="dashboard-view-all-deals"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </header>
        {trending.length === 0 ? (
          <div
            data-test="dashboard-trending-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'dashboard.empty',
                  {},
                  { defaultValue: 'No drops yet — add products to your watchlist.' },
                )}
          </div>
        ) : (
          <div
            data-test="dashboard-trending-grid"
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {trending.slice(0, 4).map((p) => (
              <ProductPriceCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <PriceDropFeed
        events={drops}
        eyebrow={t('dashboard.recentEyebrow', {}, { defaultValue: 'Latest' })}
        heading={t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
        viewAllTo="/notifications"
        emptyLabel={
          loading
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : t(
                'dashboard.feedEmpty',
                { appName: APP_NAME },
                { defaultValue: 'No notifications yet — {{appName}} will fill this up.' },
              )
        }
      />

      {/* Hide top-retailers section in v1 dashboard since we don't track per-retailer
          savings on the backend yet — keep stats grid for KPI cards only. */}
      <p
        data-test="dashboard-totals"
        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
      >
        {t(
          'dashboard.totals',
          {
            savings: fmtUsd(stats.total_savings_cents),
            count: stats.watching_count,
            appName: APP_NAME,
          },
          {
            defaultValue:
              'You have saved {{savings}} across {{count}} watched products since joining {{appName}}.',
          },
        )}
      </p>
    </div>
  )
}
