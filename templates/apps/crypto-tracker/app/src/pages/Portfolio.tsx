import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PortfolioHeroCard } from '../components/PortfolioHeroCard.js'
import { deltaClass, fmtPct, fmtUsd } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Holding {
  symbol: string
  name: string
  amount: number
  cost_basis_usd: number
  current_value_usd: number
  pnl_usd: number
  pnl_pct: number
  allocation_pct: number
}

interface PortfolioStats {
  total_value_usd: number
  change_24h_pct: number
  change_24h_usd: number
  cost_basis_usd: number
  total_pnl_usd: number
  total_pnl_pct: number
  asset_count: number
}

export function Portfolio() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [formSymbol, setFormSymbol] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCost, setFormCost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/portfolio_stats').catch(() => null),
      http.get('/api/portfolio').catch(() => null),
    ])
      .then(([statsRes, holdingsRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<PortfolioStats>(statsRes))
        setHoldings(unwrapList<Holding>(holdingsRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('portfolio.loadError', {}, { defaultValue: 'Failed to load portfolio.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, refreshTick])

  useEffect(() => {
    if (!showAdd) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdd(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showAdd])

  const submitHolding = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const amount = Number(formAmount)
    const cost = Number(formCost)
    if (
      !formSymbol.trim() ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      Number.isNaN(cost) ||
      cost < 0
    ) {
      setFormError(
        t('portfolio.addError', {}, { defaultValue: 'Enter symbol, positive amount, and cost.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await http.post('/api/portfolio', {
        symbol: formSymbol.trim().toLowerCase(),
        amount,
        cost_basis_usd: cost,
      })
      void track({
        name: 'holding.added',
        properties: { symbol: formSymbol.trim().toLowerCase(), amount, cost_basis_usd: cost },
      })
      setShowAdd(false)
      setFormSymbol('')
      setFormAmount('')
      setFormCost('')
      setRefreshTick((n) => n + 1)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const sparklineHistory = holdings.slice(0, 7).map((h, i) => 1 + i + (h.pnl_pct ?? 0) / 100)

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        'lg:px-10 space-y-8',
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('portfolio.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} ledger' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('portfolio.heading', {}, { defaultValue: 'Portfolio' })}
          </h1>
        </div>
        <button
          type="button"
          data-testid="portfolio-add-holding"
          onClick={() => setShowAdd(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
          )}
        >
          {t('portfolio.addHoldingCta', {}, { defaultValue: '+ Add holding' })}
        </button>
      </header>

      {showAdd ? (
        <div
          role="presentation"
          className={cm.cn(
            'fixed inset-0 z-40 bg-foreground/50 flex items-center justify-center',
            cm.sp('p', 4),
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-add-title"
            className={cm.cn('w-full max-w-md')}
          >
            <form
              onSubmit={submitHolding}
              data-testid="portfolio-add-form"
              className={cm.cn(
                'w-full rounded-2xl bg-surface border border-outline-variant shadow-xl',
                cm.sp('p', 6),
                'space-y-4',
              )}
            >
              <h2
                id="portfolio-add-title"
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              >
                {t('portfolio.addModal.heading', {}, { defaultValue: 'Add holding' })}
              </h2>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('portfolio.addModal.symbol', {}, { defaultValue: 'Symbol' })}
                </span>
                <input
                  type="text"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  required
                  placeholder="BTC"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md uppercase',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </span>
                <input
                  type="number"
                  step="any"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md tabular-nums',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('portfolio.addModal.cost', {}, { defaultValue: 'Cost basis (USD)' })}
                </span>
                <input
                  type="number"
                  step="any"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  required
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md tabular-nums',
                  )}
                />
              </label>
              {formError ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}>{formError}</p>
              ) : null}
              <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    'border border-outline rounded-md hover:bg-surface-container',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-md disabled:opacity-50',
                  )}
                >
                  {submitting
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('portfolio.addModal.save', {}, { defaultValue: 'Save holding' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {stats ? (
        <PortfolioHeroCard
          totalValueUsd={stats.total_value_usd}
          changePct={stats.change_24h_pct}
          changeUsd={stats.change_24h_usd}
          costBasisUsd={stats.cost_basis_usd}
          totalPnlUsd={stats.total_pnl_usd}
          totalPnlPct={stats.total_pnl_pct}
          assetCount={stats.asset_count}
          history={sparklineHistory}
        />
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : holdings.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('portfolio.empty', {}, { defaultValue: 'No holdings yet.' })}
        </p>
      ) : (
        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm overflow-hidden',
          )}
        >
          <header
            className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), 'border-b border-outline-variant/40')}
          >
            <h2 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('portfolio.holdingsHeading', {}, { defaultValue: 'Holdings' })}
            </h2>
          </header>
          {/* Wide holdings table: scroll horizontally on small screens
              instead of overflowing the card. */}
          <div className="overflow-x-auto">
            <table className={cm.cn('w-full')}>
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container/40">
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('portfolio.col.coin', {}, { defaultValue: 'Coin' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('portfolio.col.amount', {}, { defaultValue: 'Holdings' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('portfolio.col.value', {}, { defaultValue: 'Value' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('portfolio.col.cost', {}, { defaultValue: 'Cost basis' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('portfolio.col.pnl', {}, { defaultValue: 'P/L' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('portfolio.col.allocation', {}, { defaultValue: 'Allocation' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {holdings.map((h) => (
                  <tr
                    key={h.symbol}
                    className={cm.cn(
                      'hover:bg-surface-container/60 transition-colors duration-150',
                    )}
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
                      <Link
                        to={`/coin/${h.symbol}`}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.fontWeight('semibold'),
                          'hover:text-primary transition-colors',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.textSize('xs'),
                            'bg-primary-container text-on-primary-container font-extrabold uppercase tabular-nums',
                          )}
                          aria-hidden="true"
                        >
                          {h.symbol.slice(0, 2)}
                        </span>
                        <span>
                          {h.name}
                          <span
                            className={cm.cn(
                              'text-xs ml-2 uppercase font-mono tabular-nums text-on-surface-variant tracking-wider',
                            )}
                          >
                            {h.symbol}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 4),
                        'text-right tabular-nums font-mono',
                      )}
                    >
                      {h.amount.toFixed(4)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 4),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {fmtUsd(h.current_value_usd)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 4),
                        'text-right tabular-nums text-on-surface-variant',
                      )}
                    >
                      {fmtUsd(h.cost_basis_usd)}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4), 'text-right')}>
                      <div
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'tabular-nums',
                          deltaClass(h.pnl_usd),
                        )}
                      >
                        {fmtUsd(h.pnl_usd)}
                      </div>
                      <div className={cm.cn('text-xs tabular-nums', deltaClass(h.pnl_pct))}>
                        {fmtPct(h.pnl_pct)}
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4), 'text-right')}>
                      <div className="tabular-nums font-semibold">
                        {h.allocation_pct.toFixed(1)}%
                      </div>
                      <div
                        className={cm.cn(
                          'mt-1 h-1.5 w-24 ml-auto rounded-full bg-surface-container overflow-hidden',
                        )}
                      >
                        <div
                          className={cm.cn('h-full bg-primary')}
                          style={{ width: `${Math.min(100, h.allocation_pct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
