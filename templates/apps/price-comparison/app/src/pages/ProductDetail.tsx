import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { PriceHistoryChart, type PriceHistoryPoint } from '../components/PriceHistoryChart.js'
import { type RetailerPriceRow, RetailerPriceTable } from '../components/RetailerPriceTable.js'
import { fmtUsd, unwrapSingle } from '../lib/unwrap.js'

interface ApiPriceEntry {
  id: string
  source_id: string
  price: number
  currency: string
  url: string | null
  in_stock: boolean
  is_current: boolean
}

interface ApiSource {
  id: string
  name: string
  slug: string
  base_url: string
}

interface ApiHistoryPoint {
  recorded_at: string
  price: number
  source_id?: string
}

interface ApiProduct {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  description?: string | null
  best_price?: number | null
  price?: number | null
  prices?: ApiPriceEntry[]
  sources?: ApiSource[]
}

const RETAILER_GLYPH: Record<string, string> = {
  amazon: 'shopping_cart',
  bestbuy: 'storefront',
  target: 'storefront',
  walmart: 'storefront',
  bh: 'photo_camera',
}

const PERIODS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '1y', label: '1Y' },
] as const

const HISTORY_BUCKET_LABEL = (iso: string): string => {
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

export function ProductDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [retailers, setRetailers] = useState<RetailerPriceRow[]>([])
  const [history, setHistory] = useState<PriceHistoryPoint[]>([])
  const [period, setPeriod] = useState<string>('30d')
  const [alertTarget, setAlertTarget] = useState('')
  const [alertChannel, setAlertChannel] = useState<'email' | 'push'>('email')
  const [alertStatus, setAlertStatus] = useState<'idle' | 'pending' | 'created' | 'error'>('idle')
  const [alertMessage, setAlertMessage] = useState<string>('')
  const [watchStatus, setWatchStatus] = useState<
    'idle' | 'pending' | 'added' | 'duplicate' | 'error'
  >('idle')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)
    http
      .get(`/api/products/${id}`)
      .then((res) => {
        if (cancelled) return
        const p = unwrapSingle<ApiProduct>(res)
        if (!p) return
        setProduct(p)
        const sourceById = new Map((p.sources ?? []).map((s) => [s.id, s]))
        const lowestPrice = Math.min(...(p.prices ?? []).map((x) => x.price))
        const rows = (p.prices ?? []).map((entry): RetailerPriceRow => {
          const src = sourceById.get(entry.source_id)
          return {
            id: entry.id,
            retailer: src?.name ?? entry.source_id,
            glyph: src ? (RETAILER_GLYPH[src.slug] ?? 'storefront') : 'storefront',
            price_cents: entry.price,
            shipping_cents: 0,
            in_stock: entry.in_stock,
            url: entry.url ?? src?.base_url ?? '#',
            is_best: entry.in_stock && entry.price === lowestPrice,
          }
        })
        setRetailers(rows)
        if (!alertTarget) setAlertTarget(((p.best_price ?? 0) / 100).toFixed(2))
      })
      .catch(() => {
        if (!cancelled)
          setErrorMsg(
            t('productDetail.loadFailed', {}, { defaultValue: 'Could not load this product.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id, retryKey])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get(`/api/prices/history/${id}?period=${period}`)
      .then((res) => {
        if (cancelled) return
        const wrapped = (res as { data?: { history?: ApiHistoryPoint[] } }).data
        const points = wrapped?.history ?? []
        const grouped: Record<string, { price: number; count: number }> = {}
        for (const p of points) {
          const lbl = HISTORY_BUCKET_LABEL(p.recorded_at)
          if (!grouped[lbl]) grouped[lbl] = { price: 0, count: 0 }
          grouped[lbl].price += p.price
          grouped[lbl].count += 1
        }
        const series: PriceHistoryPoint[] = Object.entries(grouped).map(([label, v]) => ({
          label,
          price_cents: Math.round(v.price / Math.max(1, v.count)),
        }))
        setHistory(series)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, id, period])

  const handleSetAlert = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    const tp = Number(alertTarget)
    if (!Number.isFinite(tp) || tp <= 0) {
      setAlertStatus('error')
      setAlertMessage(
        t('productDetail.alertInvalid', {}, { defaultValue: 'Enter a valid target price.' }),
      )
      return
    }
    setAlertStatus('pending')
    setAlertMessage('')
    try {
      const resp = await http.post('/api/alerts', {
        productId: id,
        targetPrice: tp,
        alertType: 'below',
        channel: alertChannel,
      })
      if ((resp as { status?: number }).status && (resp as { status?: number }).status! < 300) {
        void track({
          name: 'price.alert_created',
          properties: { product_id: id, target: tp, channel: alertChannel },
        })
        setAlertStatus('created')
        setAlertMessage(
          t(
            'productDetail.alertCreatedAt',
            { target: tp.toFixed(2) },
            {
              defaultValue:
                'Alert active. We will email when any retailer drops below ${{target}}.',
            },
          ),
        )
      } else {
        setAlertStatus('error')
        setAlertMessage(
          t('productDetail.alertFailed', {}, { defaultValue: 'Could not create alert.' }),
        )
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setAlertStatus('created')
        setAlertMessage(
          t(
            'productDetail.alertExists',
            {},
            { defaultValue: 'You already have an active alert for this product.' },
          ),
        )
      } else {
        setAlertStatus('error')
        setAlertMessage(
          t('productDetail.alertFailed', {}, { defaultValue: 'Could not create alert.' }),
        )
      }
    }
  }

  const handleAddWatch = async () => {
    if (!id) return
    setWatchStatus('pending')
    try {
      await http.post('/api/watchlist', { productId: id })
      void track({ name: 'product.tracked', properties: { product_id: id } })
      setWatchStatus('added')
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setWatchStatus(status === 409 ? 'duplicate' : 'error')
    }
  }

  const best = retailers.find((r) => r.is_best) ?? retailers[0]
  const minPrice = retailers.reduce((m, r) => Math.min(m, r.price_cents), Infinity)
  const maxPrice = retailers.reduce((m, r) => Math.max(m, r.price_cents), 0)
  const drop =
    maxPrice > 0 && best ? Math.round(((maxPrice - best.price_cents) / maxPrice) * 100) : 0

  if (loading && !product) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-test="product-loading">
        {t('productDetail.loading', {}, { defaultValue: 'Loading product…' })}
      </div>
    )
  }
  if (errorMsg && !product) {
    return (
      <div className={cm.cn(cm.sp('p', 8))} data-test="product-error">
        <LoadErrorBanner
          data-test="error-banner"
          message={errorMsg}
          onRetry={() => setRetryKey((k) => k + 1)}
          retryMolId="error-retry"
        />
      </div>
    )
  }
  if (!product) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)} data-test="product-missing">
        {t('productDetail.notFound', {}, { defaultValue: 'Product not found.' })}
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}
      data-test="product-detail-page"
    >
      <nav>
        <Link
          to="/search"
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
          {t('productDetail.backToSearch', {}, { defaultValue: 'Back to search' })}
        </Link>
      </nav>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
            'relative',
          )}
        >
          <div className={cm.cn('min-w-0 max-w-2xl space-y-3')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-primary/80',
              )}
            >
              {product.brand ?? '—'} · {product.category ?? '—'}
            </p>
            <h1
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight leading-tight')}
              data-test="product-detail-name"
            >
              {product.name}
            </h1>
            {product.description && (
              <p className={cm.cn(cm.textSize('base'), 'text-on-primary/85 leading-relaxed')}>
                {product.description}
              </p>
            )}
          </div>
          <div className={cm.cn('space-y-2 min-w-[14rem]')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-primary/80',
              )}
            >
              {t('productDetail.bestNow', {}, { defaultValue: 'Best price now' })}
            </p>
            <p
              data-test="product-detail-best-price"
              className={cm.cn(
                'text-5xl font-extrabold tracking-tighter tabular-nums leading-none',
              )}
            >
              {best ? fmtUsd(best.price_cents) : '—'}
            </p>
            {best && (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider rounded-full bg-surface/20 backdrop-blur-md px-3 py-1 w-fit',
                )}
              >
                {best.retailer}
              </p>
            )}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-primary/80',
              )}
            >
              <span>
                {fmtUsd(minPrice)}–{fmtUsd(maxPrice)}
              </span>
              {drop > 0 && (
                <span
                  className={cm.cn('rounded-full bg-secondary/90 px-2 py-0.5 text-on-secondary')}
                >
                  {t('productDetail.savings', { pct: drop }, { defaultValue: 'Save {{pct}}%' })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddWatch}
              disabled={
                watchStatus === 'pending' || watchStatus === 'added' || watchStatus === 'duplicate'
              }
              data-test="add-watchlist"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full bg-surface/25 backdrop-blur-md text-on-primary uppercase tracking-wider hover:bg-surface/35 transition-colors disabled:opacity-60',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                visibility
              </span>
              {watchStatus === 'added'
                ? t('productDetail.watchAdded', {}, { defaultValue: 'On watchlist' })
                : watchStatus === 'duplicate'
                  ? t('productDetail.watchDuplicate', {}, { defaultValue: 'Already watching' })
                  : watchStatus === 'pending'
                    ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                    : t('productDetail.watchAdd', {}, { defaultValue: 'Add to watchlist' })}
            </button>
          </div>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div className={cm.cn('lg:col-span-2')}>
          <PriceHistoryChart
            points={history}
            targetCents={alertTarget ? Math.round(Number(alertTarget) * 100) : undefined}
            eyebrow={t(
              'productDetail.historyEyebrow',
              { period },
              { defaultValue: 'Last {{period}}' },
            )}
            heading={t('productDetail.historyHeading', {}, { defaultValue: 'Price history' })}
            periods={PERIODS.map((p) => ({ ...p, active: p.key === period }))}
            onSelectPeriod={setPeriod}
          />
          <p className={cm.cn(cm.sp('mt', 3))}>
            <Link
              to={`/products/${product.id}/history`}
              data-test="product-deep-history-link"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('productDetail.deepHistoryCta', {}, { defaultValue: 'See full price history' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </p>
        </div>
        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 space-y-4',
          )}
        >
          <header>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
              {t('productDetail.alertEyebrow', {}, { defaultValue: 'Price alert' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('productDetail.alertHeading', {}, { defaultValue: 'Ping me when it drops' })}
            </h2>
          </header>
          <form
            onSubmit={handleSetAlert}
            className={cm.cn('space-y-4')}
            data-test="product-alert-form"
          >
            <label
              className={cm.cn(
                'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('productDetail.alertField', {}, { defaultValue: 'Target price (USD)' })}
              <input
                type="number"
                step="0.01"
                min="0"
                value={alertTarget}
                onChange={(e) => setAlertTarget(e.target.value)}
                data-test="alert-target-input"
                aria-label={t(
                  'productDetail.alertField',
                  {},
                  { defaultValue: 'Target price (USD)' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('mt', 1),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('base'),
                  'rounded-xl border-2 border-outline-variant/40 bg-surface-container-low text-on-surface tabular-nums focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors',
                )}
              />
            </label>
            <fieldset>
              <legend
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('productDetail.alertChannel', {}, { defaultValue: 'Channel' })}
              </legend>
              <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 2))}>
                {(['email', 'push'] as const).map((ch) => (
                  <label
                    key={ch}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-wider cursor-pointer',
                      alertChannel === ch
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    <input
                      type="radio"
                      name="alert-channel"
                      value={ch}
                      checked={alertChannel === ch}
                      onChange={() => setAlertChannel(ch)}
                      className={cm.cn('sr-only')}
                    />
                    {t(`common.channel.${ch}`, {}, { defaultValue: ch })}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={alertStatus === 'pending'}
              data-test="set-alert"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'w-full rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary uppercase tracking-wider hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                notifications_active
              </span>
              {alertStatus === 'pending'
                ? t('productDetail.alertSubmitting', {}, { defaultValue: 'Setting…' })
                : t('productDetail.alertSubmit', {}, { defaultValue: 'Set alert' })}
            </button>
            {alertStatus !== 'idle' && alertMessage && (
              <p
                role="status"
                data-test="product-alert-status"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl text-center',
                  alertStatus === 'error'
                    ? 'bg-error/10 text-error'
                    : 'bg-secondary/15 text-secondary',
                )}
              >
                {alertMessage}
              </p>
            )}
          </form>
        </aside>
      </section>

      <RetailerPriceTable
        rows={retailers}
        eyebrow={t('productDetail.tableEyebrow', {}, { defaultValue: 'Live prices' })}
        heading={t('productDetail.tableHeading', {}, { defaultValue: 'Compare retailers' })}
      />
    </div>
  )
}
