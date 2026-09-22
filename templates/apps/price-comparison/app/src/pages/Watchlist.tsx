import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ConfirmButton } from '../components/ConfirmButton.js'
import { ErrorBanner } from '../components/ErrorBanner.js'
import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiWatchItem {
  id: string
  user_id: string
  product_id: string
  product?: {
    id: string
    name: string
    brand?: string | null
    category?: string | null
    best_price?: number | null
    price?: number | null
  } | null
}

interface WatchEntry {
  watchId: string
  product: ProductPriceCardProduct
}

const TABS = [
  { key: 'all', label: 'All', glyph: 'visibility' },
  { key: 'dropped', label: 'Drops', glyph: 'trending_down' },
] as const

const toCard = (p: NonNullable<ApiWatchItem['product']>): ProductPriceCardProduct => {
  const list = Number(p.price ?? 0)
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

export function Watchlist() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<WatchEntry[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all')
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)
    void (async () => {
      try {
        const res = await http.get('/api/watchlist')
        if (cancelled) return
        const list = unwrapList<ApiWatchItem>(res)
          .filter((x) => x.product)
          .map((x) => ({ watchId: x.id, product: toCard(x.product!) }))
        setItems(list)
      } catch (_error) {
        if (!cancelled)
          setErrorMsg(
            t('watchlist.loadFailed', {}, { defaultValue: 'Could not load your watchlist.' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, retryKey, t])

  const handleRemove = async (watchId: string, productId: string) => {
    setRemovingId(watchId)
    try {
      await http.delete(`/api/watchlist/${watchId}`)
      void track({ name: 'product.untracked', properties: { product_id: productId } })
      setItems((prev) => prev.filter((x) => x.watchId !== watchId))
    } finally {
      setRemovingId(null)
    }
  }

  const filtered = items.filter(({ product: p }) => {
    if (tab === 'dropped') return (p.drop_pct ?? 0) > 0
    return true
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')} data-test="watchlist-page">
      <header
        className={cm.cn(
          cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('watchlist.eyebrow', {}, { defaultValue: 'Your watch' })}
          </p>
          <h1
            className={cm.cn(
              'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('watchlist.heading', {}, { defaultValue: 'Watchlist' })}
          </h1>
          <p
            data-test="watchlist-summary"
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              'text-on-surface-variant max-w-3xl',
            )}
          >
            {t(
              'watchlist.summary',
              { count: items.length, appName: APP_NAME },
              {
                defaultValue:
                  '{{count}} products on watch. {{appName}} checks every retailer hourly and pings you when any of them drop below your target.',
              },
            )}
          </p>
        </div>
        <Link
          to="/search"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary uppercase tracking-wider hover:opacity-95 transition-all shadow-md shadow-primary/20',
          )}
        >
          {t('watchlist.addCta', {}, { defaultValue: 'Find products to watch' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </header>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => setTab(tabDef.key)}
            data-test={`watchlist-tab-${tabDef.key}`}
            aria-pressed={tab === tabDef.key}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-wider transition-colors',
              tab === tabDef.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              {tabDef.glyph}
            </span>
            {t(`watchlist.tab.${tabDef.key}`, {}, { defaultValue: tabDef.label })}
          </button>
        ))}
      </div>

      {errorMsg ? (
        <ErrorBanner message={errorMsg} onRetry={() => setRetryKey((k) => k + 1)} />
      ) : filtered.length === 0 ? (
        <div
          data-test="watchlist-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant/40')}
          >
            visibility_off
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.fontWeight('semibold'))}>
            {loading
              ? t('watchlist.loading', {}, { defaultValue: 'Loading your watchlist…' })
              : t(
                  'watchlist.empty',
                  {},
                  { defaultValue: 'Nothing here yet — add a product from search.' },
                )}
          </p>
        </div>
      ) : (
        <ul
          data-test="watchlist-grid"
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {filtered.map(({ watchId, product }) => (
            <li
              key={watchId}
              className={cm.cn('relative')}
              data-test={`watchlist-item-${product.id}`}
            >
              <ProductPriceCard product={product} />
              <ConfirmButton
                testId={`watchlist-remove-${watchId}`}
                label={t('watchlist.remove', {}, { defaultValue: 'Remove from watchlist' })}
                confirmLabel={t('watchlist.confirmRemove', {}, { defaultValue: 'Confirm remove?' })}
                onConfirm={() => handleRemove(watchId, product.id)}
                disabled={removingId === watchId}
                className={cm.cn(
                  'absolute top-3 right-3 rounded-full bg-surface-container/80 backdrop-blur-md text-on-surface hover:bg-error/20 hover:text-error transition-colors disabled:opacity-50',
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('px', 3),
                  'h-9 text-xs font-bold uppercase tracking-wider',
                )}
                armedClassName="bg-error text-on-primary w-max px-3"
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
                  close
                </span>
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
