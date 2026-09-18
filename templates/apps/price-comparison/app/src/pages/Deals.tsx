import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'
import { unwrapList } from '../lib/unwrap.js'

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

export function Deals() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [deals, setDeals] = useState<ProductPriceCardProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get('/api/prices/trends/drops?limit=20&days=60')
        if (cancelled) return
        const drops = unwrapList<ApiTrendingDrop>(res)
        setDeals(drops.map(dropToCard).filter((x): x is ProductPriceCardProduct => x !== null))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const sorted = [...deals].sort((a, b) => (b.drop_pct ?? 0) - (a.drop_pct ?? 0))
  const hottest = sorted[0]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')} data-test="deals-page">
      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-error to-primary text-on-primary',
        )}
      >
        <div className={cm.cn('relative space-y-4 max-w-2xl')}>
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[10px] font-black uppercase tracking-widest',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              local_fire_department
            </span>
            {t('deals.eyebrow', {}, { defaultValue: 'Trending drops' })}
          </p>
          <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}>
            {t('deals.heading', {}, { defaultValue: 'Hottest drops right now' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-primary/85 leading-relaxed')}>
            {t(
              'deals.subheading',
              {},
              {
                defaultValue:
                  'Live, retailer-verified price drops — sorted by deepest discount. Jump in fast, the deepest cuts evaporate within hours.',
              },
            )}
          </p>
          <div
            data-test="deals-summary"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider',
            )}
          >
            {hottest && (
              <span className={cm.cn('rounded-full bg-surface/20 backdrop-blur-md px-3 py-1')}>
                {t(
                  'deals.hottest',
                  { name: hottest.brand, pct: hottest.drop_pct ?? 0 },
                  { defaultValue: 'Hottest: {{name}} {{pct}}% off' },
                )}
              </span>
            )}
            <span className={cm.cn('rounded-full bg-secondary px-3 py-1 text-on-secondary')}>
              {t(
                'deals.totalCount',
                { count: deals.length },
                { defaultValue: '{{count}} live drops' },
              )}
            </span>
          </div>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div
          data-test="deals-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
          )}
        >
          {loading
            ? t('deals.loading', {}, { defaultValue: 'Loading deals…' })
            : t('deals.empty', {}, { defaultValue: 'No live drops right now — try again soon.' })}
        </div>
      ) : (
        <div
          data-test="deals-grid"
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {sorted.map((p) => (
            <ProductPriceCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
