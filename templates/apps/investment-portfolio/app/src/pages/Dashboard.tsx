import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AssetAllocationDonut } from '../components/AssetAllocationDonut.js'
import { HoldingHighlightRow } from '../components/HoldingHighlightRow.js'
import { PortfolioHeroCard } from '../components/PortfolioHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PortfolioSummary {
  total_value_cents: number
  cost_basis_cents: number
  total_pnl_cents: number
  total_pnl_pct: number
  day_change_cents: number
  day_change_pct: number
  cash_cents: number
  history_30d: { date: string; value_cents: number }[]
  allocation: { label: string; value_cents: number; pct: number; color: string }[]
}

interface Holding {
  symbol: string
  name: string
  asset_class: string
  market_value_cents: number
  day_change_pct: number
  pnl_pct: number
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown, opts: { compact?: boolean } = {}): string {
  const c = num(cents)
  const dollars = Math.abs(c) / 100
  const sign = c < 0 ? '-' : ''
  if (opts.compact && dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(2)}M`
  if (opts.compact && dollars >= 1_000) return `${sign}$${(dollars / 1_000).toFixed(1)}k`
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

const KPI_ACCENT = {
  cost: {
    tone: 'default' as const,
    icon: 'savings',
    iconBg: 'bg-surface-secondary text-foreground',
  },
  pnl: { tone: 'success' as const, icon: 'trending_up', iconBg: 'bg-success-light text-success' },
  cash: {
    tone: 'info' as const,
    icon: 'account_balance_wallet',
    iconBg: 'bg-sky-100 text-sky-700',
  },
  yield: { tone: 'custom' as const, icon: 'paid', iconBg: 'bg-warning-light text-warning' },
} as const

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [topHoldings, setTopHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/summary').catch(() => null),
      http.get('/api/holdings').catch(() => null),
    ])
      .then(([sRes, hRes]) => {
        if (cancelled) return
        setSummary(unwrapSingle<PortfolioSummary>(sRes))
        setTopHoldings(unwrapList<Holding>(hRes).slice(0, 6))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error) return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>

  const safeSummary: PortfolioSummary = {
    total_value_cents: num(summary?.total_value_cents),
    cost_basis_cents: num(summary?.cost_basis_cents),
    total_pnl_cents: num(summary?.total_pnl_cents),
    total_pnl_pct: num(summary?.total_pnl_pct),
    day_change_cents: num(summary?.day_change_cents),
    day_change_pct: num(summary?.day_change_pct),
    cash_cents: num(summary?.cash_cents),
    history_30d: Array.isArray(summary?.history_30d) ? summary!.history_30d : [],
    allocation: Array.isArray(summary?.allocation) ? summary!.allocation : [],
  }

  const kpis = [
    {
      key: 'cost' as const,
      labelKey: 'dashboard.kpi.costBasis.label',
      labelDefault: 'Cost basis',
      value: fmtUsd(safeSummary.cost_basis_cents, { compact: true }),
      sub: t('dashboard.kpi.costBasis.sub', {}, { defaultValue: 'invested capital' }),
    },
    {
      key: 'pnl' as const,
      labelKey: 'dashboard.kpi.pnl.label',
      labelDefault: 'Unrealized P/L',
      value: fmtUsd(safeSummary.total_pnl_cents, { compact: true }),
      sub: `${fmtPct(safeSummary.total_pnl_pct)} ${t('dashboard.kpi.pnl.sub', {}, { defaultValue: 'all-time' })}`,
    },
    {
      key: 'cash' as const,
      labelKey: 'dashboard.kpi.cash.label',
      labelDefault: 'Idle cash',
      value: fmtUsd(safeSummary.cash_cents, { compact: true }),
      sub: t('dashboard.kpi.cash.sub', {}, { defaultValue: 'awaiting deployment' }),
    },
    {
      key: 'yield' as const,
      labelKey: 'dashboard.kpi.yield.label',
      labelDefault: 'Day Δ',
      value: fmtUsd(safeSummary.day_change_cents, { compact: true }),
      sub: `${fmtPct(safeSummary.day_change_pct)} ${t('dashboard.kpi.yield.sub', {}, { defaultValue: 'today' })}`,
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-8')}>
      {/* Page header */}
      <header>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('dashboard.eyebrow', {}, { defaultValue: 'Portfolio overview' })}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), cm.sp('mt', 1), 'flex-wrap')}
        >
          <h1
            className={cm.cn(
              'text-3xl sm:text-4xl font-extrabold tracking-tight break-words min-w-0',
            )}
          >
            {t(
              'dashboard.heading',
              {
                date: new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }),
              },
              { defaultValue: 'Today, {{date}}' },
            )}
          </h1>
        </div>
      </header>

      {/* Hero + allocation */}
      <section className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <div className={cm.cn('col-span-12 lg:col-span-7')}>
          <PortfolioHeroCard
            totalValueCents={safeSummary.total_value_cents}
            dayChangeCents={safeSummary.day_change_cents}
            dayChangePct={safeSummary.day_change_pct}
            totalPnlCents={safeSummary.total_pnl_cents}
            totalPnlPct={safeSummary.total_pnl_pct}
            history={safeSummary.history_30d}
          />
        </div>
        <div className={cm.cn('col-span-12 lg:col-span-5')}>
          <AssetAllocationDonut
            slices={safeSummary.allocation}
            totalCents={safeSummary.total_value_cents}
          />
        </div>
      </section>

      {/* KPI quad */}
      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
        {kpis.map((k) => {
          const accent = KPI_ACCENT[k.key]
          return (
            <article
              key={k.key}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 hover:-translate-y-0.5 transition-transform',
                cm.accentCard({ tone: accent.tone }),
              )}
              style={
                accent.tone === 'custom'
                  ? { ['--mol-accent' as string]: 'var(--color-tertiary)' }
                  : undefined
              }
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <span
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    accent.iconBg,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                    {accent.icon}
                  </span>
                </span>
                <span className={cm.accentCardLabel({ tone: accent.tone })}>
                  {t(k.labelKey, {}, { defaultValue: k.labelDefault })}
                </span>
              </div>
              <p
                className={cm.cn(
                  'text-2xl font-extrabold tabular-nums tracking-tight text-on-surface',
                )}
              >
                {k.value}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant tabular-nums',
                  cm.sp('mt', 1),
                )}
              >
                {k.sub}
              </p>
            </article>
          )
        })}
      </section>

      {/* Top holdings */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-[2rem] border border-outline-variant/40',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.topHoldings.label', {}, { defaultValue: 'Top Holdings' })}
            </p>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
              {t(
                'dashboard.topHoldings.heading',
                {},
                { defaultValue: 'Where your money is working' },
              )}
            </h2>
          </div>
          <Link
            to="/holdings"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:underline',
            )}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </header>
        <div className={cm.stack(3)}>
          {topHoldings.map((h) => (
            <HoldingHighlightRow
              key={h.symbol}
              symbol={h.symbol}
              name={h.name}
              assetClass={h.asset_class}
              marketValueCents={h.market_value_cents}
              dayChangePct={h.day_change_pct}
              pnlPct={h.pnl_pct}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
