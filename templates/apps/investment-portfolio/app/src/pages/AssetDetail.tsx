import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TransactionFormModal } from '../components/TransactionFormModal.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Asset {
  symbol: string
  name: string
  asset_class?: string
  last_price_cents?: number
  day_change_pct?: number
  market_cap_cents?: number
  pe_ratio?: number | null
  dividend_yield_pct?: number | null
  fifty_two_week_high_cents?: number
  fifty_two_week_low_cents?: number
  history_30d?: { date: string; price_cents: number }[]
  description?: string
}

interface AssetTx {
  id: string
  occurred_at: string
  kind: 'buy' | 'sell' | 'dividend' | 'split'
  shares: number | string
  price_cents: number | string
  total_cents: number | string
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown): string {
  return `$${(num(cents) / 100).toFixed(2)}`
}

function fmtUsdShort(cents: unknown): string {
  const c = num(cents)
  const abs = Math.abs(c) / 100
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`
  return fmtUsd(c)
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function deltaClass(v: unknown): string {
  const n = num(v)
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return ''
}

const KIND_LABEL: Record<string, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  split: 'Split',
}

export function AssetDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { symbol } = useParams<{ symbol: string }>()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [txs, setTxs] = useState<AssetTx[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [txOpen, setTxOpen] = useState<null | 'buy' | 'sell'>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/holdings/${symbol}`).catch(() => null),
      http.get(`/api/transactions?symbol=${symbol}`).catch(() => null),
    ])
      .then(([aRes, tRes]) => {
        if (cancelled) return
        setAsset(unwrapSingle<Asset>(aRes))
        setTxs(unwrapList<AssetTx>(tRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('assetDetail.loadError', {}, { defaultValue: 'Failed to load asset.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, symbol, t, reloadCounter])

  const handleTxSuccess = useCallback(() => setReloadCounter((c) => c + 1), [])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !asset)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('assetDetail.notFound', {}, { defaultValue: 'Asset not found.' })}
      </div>
    )

  const history = (Array.isArray(asset.history_30d) ? asset.history_30d : []).map((p) => ({
    date: String(p.date ?? ''),
    price_cents: num((p as unknown as { price_cents?: unknown }).price_cents),
  }))
  const lastPrice = num(asset.last_price_cents)
  const dayChange = num(asset.day_change_pct)
  const marketCap = num(asset.market_cap_cents)
  const high52 = num(asset.fifty_two_week_high_cents)
  const low52 = num(asset.fifty_two_week_low_cents)
  const assetClass = asset.asset_class ?? '—'
  const description = asset.description ?? ''
  const prices = history.map((p) => p.price_cents)
  const max = prices.length > 0 ? Math.max(...prices) : 0
  const min = prices.length > 0 ? Math.min(...prices) : 0
  const range = Math.max(1, max - min)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/holdings" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('assetDetail.back', {}, { defaultValue: 'All holdings' })}
      </Link>

      <header
        className={cm.cn(
          cm.card(),
          cm.sp('p', 6),
          cm.flex({ align: 'start', justify: 'between', gap: 'lg' }),
          'flex-wrap',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-wide',
              'text-on-surface-variant',
            )}
          >
            {assetClass}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
            <span className={cm.cn('font-mono')}>{asset.symbol}</span>
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('normal'),
                'text-on-surface-variant',
                'ml-3',
              )}
            >
              {asset.name}
            </span>
          </h1>
          <p
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 3),
              'tabular-nums',
            )}
          >
            {fmtUsd(lastPrice)}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 1),
              'tabular-nums',
              deltaClass(dayChange),
            )}
          >
            {fmtPct(dayChange)} {t('assetDetail.today', {}, { defaultValue: 'today' })}
          </p>
        </div>
        <div className={cm.flex({ gap: 'sm' })}>
          <button
            type="button"
            onClick={() => setTxOpen('sell')}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {t('assetDetail.sellCta', {}, { defaultValue: 'Sell' })}
          </button>
          <button
            type="button"
            onClick={() => setTxOpen('buy')}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            {t('assetDetail.buyCta', {}, { defaultValue: 'Buy' })}
          </button>
        </div>
      </header>

      <TransactionFormModal
        open={txOpen !== null}
        onClose={() => setTxOpen(null)}
        onSuccess={handleTxSuccess}
        defaultSymbol={asset.symbol}
        defaultKind={txOpen ?? 'buy'}
      />

      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 4))}>
          {t('assetDetail.chartHeading', {}, { defaultValue: 'Price (30 days)' })}
        </h2>
        {history.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('assetDetail.chartEmpty', {}, { defaultValue: 'No price history available.' })}
          </p>
        ) : (
          <svg viewBox="0 0 600 220" className={cm.cn('w-full h-56')} role="img">
            <polyline
              fill="none"
              stroke={dayChange >= 0 ? 'var(--mol-color-success)' : 'var(--mol-color-error)'}
              strokeWidth="2"
              points={history
                .map((p, i, arr) => {
                  const x = (i / Math.max(1, arr.length - 1)) * 580 + 10
                  const y = 210 - ((p.price_cents - min) / range) * 200
                  return `${x.toFixed(1)},${y.toFixed(1)}`
                })
                .join(' ')}
            />
          </svg>
        )}
      </section>

      <section className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
        <div className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-3')}>
          <h2 className={cm.sectionHeading}>
            {t('assetDetail.fundamentalsHeading', {}, { defaultValue: 'Fundamentals' })}
          </h2>
          <Row
            label={t('assetDetail.marketCap', {}, { defaultValue: 'Market cap' })}
            value={marketCap > 0 ? fmtUsdShort(marketCap) : '—'}
          />
          <Row
            label={t('assetDetail.peRatio', {}, { defaultValue: 'P/E ratio' })}
            value={asset.pe_ratio != null ? num(asset.pe_ratio).toFixed(2) : '—'}
          />
          <Row
            label={t('assetDetail.dividend', {}, { defaultValue: 'Dividend yield' })}
            value={
              asset.dividend_yield_pct != null
                ? `${num(asset.dividend_yield_pct).toFixed(2)}%`
                : '—'
            }
          />
          <Row
            label={t('assetDetail.high52', {}, { defaultValue: '52-week high' })}
            value={high52 > 0 ? fmtUsd(high52) : '—'}
          />
          <Row
            label={t('assetDetail.low52', {}, { defaultValue: '52-week low' })}
            value={low52 > 0 ? fmtUsd(low52) : '—'}
          />
        </div>

        <div className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-3')}>
          <h2 className={cm.sectionHeading}>{t('nav.about', {}, { defaultValue: 'About' })}</h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {description ||
              t('assetDetail.aboutEmpty', {}, { defaultValue: 'No company overview available.' })}
          </p>
        </div>
      </section>

      <section className={cm.cn(cm.card(), 'overflow-hidden')}>
        <header
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            'bg-surface-container border-b border-outline-variant',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wide',
            )}
          >
            {t('assetDetail.txHeading', {}, { defaultValue: 'Your transactions' })}
          </h2>
        </header>
        {txs.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('assetDetail.txEmpty', {}, { defaultValue: 'No transactions for this ticker.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant')}>
            {txs.map((tx) => (
              <li
                key={tx.id}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between' }),
                )}
              >
                <div>
                  <p className={cm.fontWeight('medium')}>
                    {t(
                      `transactions.kind.${tx.kind}`,
                      {},
                      { defaultValue: KIND_LABEL[tx.kind] ?? tx.kind },
                    )}{' '}
                    {num(tx.shares).toFixed(4)} @ {fmtUsd(tx.price_cents)}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {fmtDate(tx.occurred_at)}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    'tabular-nums',
                    tx.kind === 'sell' || tx.kind === 'dividend' ? 'text-success' : '',
                  )}
                >
                  {fmtUsd(tx.total_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
      <dt className={'text-on-surface-variant'}>{label}</dt>
      <dd className={cm.cn('tabular-nums', cm.fontWeight('semibold'))}>{value}</dd>
    </div>
  )
}
