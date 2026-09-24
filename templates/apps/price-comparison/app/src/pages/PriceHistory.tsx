import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { PriceHistoryChart, type PriceHistoryPoint } from '../components/PriceHistoryChart.js'
import { fmtUsd } from '../lib/unwrap.js'

interface ApiHistoryPoint {
  recorded_at: string
  price: number
  source_id: string
}

interface ApiHistoryResponse {
  product?: {
    id: string
    name: string
    brand?: string | null
    best_price?: number | null
  } | null
  history?: ApiHistoryPoint[]
  stats?: { min: number; max: number; avg: number; current: number }
}

interface ApiSource {
  id: string
  name: string
  slug: string
}

const HISTORY_LABEL = (iso: string): string => {
  const d = new Date(iso)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[d.getMonth()]} ${d.getDate()}`
}

const RETAILER_GLYPH: Record<string, string> = {
  amazon: 'shopping_cart',
  bestbuy: 'storefront',
  target: 'storefront',
  walmart: 'storefront',
  bh: 'photo_camera',
}

export function PriceHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [data, setData] = useState<ApiHistoryResponse | null>(null)
  const [perRetailer, setPerRetailer] = useState<
    Array<{ source: ApiSource; series: PriceHistoryPoint[]; dropPct: number }>
  >([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)
    void (async () => {
      try {
        const [hRes, sRes] = await Promise.all([
          http.get(`/api/prices/history/${id}?period=1y`),
          http.get('/api/sources'),
        ])
        if (cancelled) return
        const wrapped = (hRes as { data?: ApiHistoryResponse }).data ?? {}
        setData(wrapped)
        const sources: ApiSource[] = (sRes as { data?: ApiSource[] | { data?: ApiSource[] } }).data
          ? Array.isArray((sRes as { data: unknown }).data)
            ? (sRes as { data: ApiSource[] }).data
            : ((sRes as { data: { data: ApiSource[] } }).data.data ?? [])
          : []

        const points = wrapped.history ?? []
        const perBySource: Record<string, ApiHistoryPoint[]> = {}
        for (const p of points) {
          if (!perBySource[p.source_id]) perBySource[p.source_id] = []
          perBySource[p.source_id].push(p)
        }
        const out: Array<{ source: ApiSource; series: PriceHistoryPoint[]; dropPct: number }> = []
        for (const src of sources) {
          const pts = perBySource[src.id] ?? []
          if (pts.length === 0) continue
          const grouped: Record<string, { price: number; count: number }> = {}
          for (const p of pts) {
            const lbl = HISTORY_LABEL(p.recorded_at)
            if (!grouped[lbl]) grouped[lbl] = { price: 0, count: 0 }
            grouped[lbl].price += p.price
            grouped[lbl].count += 1
          }
          const series = Object.entries(grouped).map(([label, v]) => ({
            label,
            price_cents: Math.round(v.price / Math.max(1, v.count)),
          }))
          const max = Math.max(...series.map((s) => s.price_cents))
          const min = Math.min(...series.map((s) => s.price_cents))
          const dropPct = max > 0 ? Math.round(((max - min) / max) * 100) : 0
          out.push({ source: src, series, dropPct })
        }
        setPerRetailer(out)
      } catch (_error) {
        if (!cancelled)
          setErrorMsg(
            t('priceHistory.loadFailed', {}, { defaultValue: 'Could not load price history.' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id, retryKey])

  if (loading && !data) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-test="history-loading">
        {t('priceHistory.loading', {}, { defaultValue: 'Loading price history…' })}
      </div>
    )
  }
  if (errorMsg && !data?.product) {
    return (
      <div className={cm.cn(cm.sp('p', 8))} data-test="history-error">
        <LoadErrorBanner
          data-test="error-banner"
          message={errorMsg}
          onRetry={() => setRetryKey((k) => k + 1)}
          retryMolId="error-retry"
        />
      </div>
    )
  }
  if (!data?.product) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-test="history-missing">
        {t('priceHistory.notFound', {}, { defaultValue: 'Product not found.' })}
      </div>
    )
  }

  const product = data.product
  const stats = data.stats
  const blendedPoints = (data.history ?? []).reduce(
    (acc: Record<string, { price: number; count: number }>, p) => {
      const lbl = HISTORY_LABEL(p.recorded_at)
      if (!acc[lbl]) acc[lbl] = { price: 0, count: 0 }
      acc[lbl].price += p.price
      acc[lbl].count += 1
      return acc
    },
    {},
  )
  const blendedSeries: PriceHistoryPoint[] = Object.entries(blendedPoints).map(([label, v]) => ({
    label,
    price_cents: Math.round(v.price / Math.max(1, v.count)),
  }))

  const insights = stats
    ? [
        {
          label: t('priceHistory.statAvg', {}, { defaultValue: 'Average (1y)' }),
          value: fmtUsd(stats.avg),
          tone: 'neutral' as const,
          glyph: 'show_chart',
        },
        {
          label: t('priceHistory.statMin', {}, { defaultValue: 'Lowest ever' }),
          value: fmtUsd(stats.min),
          tone: 'good' as const,
          glyph: 'arrow_downward',
        },
        {
          label: t('priceHistory.statMax', {}, { defaultValue: 'Highest ever' }),
          value: fmtUsd(stats.max),
          tone: 'bad' as const,
          glyph: 'arrow_upward',
        },
        {
          label: t('priceHistory.statCurrent', {}, { defaultValue: 'Current best' }),
          value: fmtUsd(stats.current),
          tone: 'good' as const,
          glyph: 'event',
        },
      ]
    : []

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}
      data-test="price-history-page"
    >
      <nav>
        <Link
          to={`/products/${product.id}`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant hover:text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('priceHistory.backToProduct', {}, { defaultValue: 'Back to product' })}
        </Link>
      </nav>

      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {product.brand ?? '—'} ·{' '}
          {t('priceHistory.eyebrow', {}, { defaultValue: 'Price history deep-dive' })}
        </p>
        <h1
          data-test="history-product-name"
          className={cm.cn(
            'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {product.name}
        </h1>
        <p
          className={cm.cn(
            cm.flex({ align: 'baseline', gap: 'sm' }),
            cm.sp('mt', 2),
            cm.textSize('lg'),
            'text-on-surface-variant',
          )}
        >
          <span>{t('priceHistory.bestNow', {}, { defaultValue: 'Best now:' })}</span>
          <span
            data-test="history-best-now"
            className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tighter text-primary')}
          >
            {fmtUsd(Number(product.best_price ?? 0))}
          </span>
        </p>
      </header>

      {insights.length > 0 && (
        <div
          data-test="history-insights"
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}
        >
          {insights.map((ins) => (
            <div
              key={ins.label}
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
                ins.tone === 'good'
                  ? 'border-l-4 border-l-secondary'
                  : ins.tone === 'bad'
                    ? 'border-l-4 border-l-error'
                    : 'border-l-4 border-l-tertiary',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 rounded-lg',
                  ins.tone === 'good'
                    ? 'bg-secondary/15 text-secondary'
                    : ins.tone === 'bad'
                      ? 'bg-error/15 text-error'
                      : 'bg-tertiary/15 text-tertiary',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>{ins.glyph}</span>
              </span>
              <p
                className={cm.cn(
                  'mt-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {ins.label}
              </p>
              <p
                className={cm.cn(
                  'mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-on-surface',
                )}
              >
                {ins.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <PriceHistoryChart
        points={blendedSeries}
        eyebrow={t('priceHistory.allEyebrow', {}, { defaultValue: 'All retailers blended' })}
        heading={t('priceHistory.allHeading', {}, { defaultValue: 'Best price across the market' })}
      />

      {perRetailer.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <header>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
              {t('priceHistory.byRetailerEyebrow', {}, { defaultValue: 'Per retailer' })}
            </p>
            <h2 className={cm.cn('mt-1 text-2xl font-extrabold tracking-tight text-on-surface')}>
              {t('priceHistory.byRetailerHeading', {}, { defaultValue: 'Who drops the deepest?' })}
            </h2>
          </header>
          <div
            data-test="history-by-retailer"
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-3')}
          >
            {perRetailer.map((r) => (
              <article
                key={r.source.id}
                data-test={`history-retailer-${r.source.slug}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-3',
                )}
              >
                <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-9 w-9 rounded-lg bg-primary/15 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-lg')}>
                      {RETAILER_GLYPH[r.source.slug] ?? 'storefront'}
                    </span>
                  </span>
                  <p
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('extrabold'),
                      'text-on-surface tracking-tight',
                    )}
                  >
                    {r.source.name}
                  </p>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'ml-auto rounded-full uppercase tracking-wider',
                      r.dropPct >= 15
                        ? 'bg-secondary/15 text-secondary'
                        : 'bg-tertiary/15 text-tertiary',
                    )}
                  >
                    -{r.dropPct}%
                  </span>
                </header>
                <PriceHistoryChart points={r.series} />
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
