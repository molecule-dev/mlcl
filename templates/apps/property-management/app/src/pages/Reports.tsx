import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LoadErrorBanner } from '../components/LoadErrorBanner.js'

interface Kpis {
  gross_revenue_cents: number
  net_income_cents: number
  avg_occupancy_pct: number
  arrears_cents: number
}

interface BreakdownRow {
  // Shape served by GET /api/reports/overview (handlers/reports.ts):
  // rows carry `id`, `units_count`, `occupancy_pct` — NOT property_id/
  // units/occupancy. Reading the wrong names here rendered "undefined"
  // React keys (console errors) and "NaN%" occupancy bars.
  id: string
  name: string
  units_count: number
  occupied_count: number
  occupancy_pct: number
  revenue_cents: number
  arrears_cents: number
}

interface ReportsApi {
  range: string
  kpis: Kpis
  property_breakdown: BreakdownRow[]
}

function fmtCurrency(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<ReportsApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    http
      .get<ReportsApi>('/api/reports/overview')
      .then((res) => {
        if (cancelled) return
        const d = res as { data?: ReportsApi } | ReportsApi
        if (d && typeof d === 'object' && 'kpis' in (d as ReportsApi)) {
          setData(d as ReportsApi)
        } else if (d && typeof d === 'object' && 'data' in d && (d as { data?: ReportsApi }).data) {
          setData((d as { data?: ReportsApi }).data ?? null)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, reloadKey])

  const kpis = data?.kpis ?? {
    gross_revenue_cents: 0,
    net_income_cents: 0,
    avg_occupancy_pct: 0,
    arrears_cents: 0,
  }
  const breakdown = data?.property_breakdown ?? []

  const KPIS = [
    {
      key: 'gross_revenue',
      defaultLabel: 'Gross revenue',
      value: fmtCurrency(kpis.gross_revenue_cents),
      icon: 'payments',
    },
    {
      key: 'net_income',
      defaultLabel: 'Net income',
      value: fmtCurrency(kpis.net_income_cents),
      icon: 'savings',
    },
    {
      key: 'avg_occupancy',
      defaultLabel: 'Avg occupancy',
      value: `${kpis.avg_occupancy_pct}%`,
      icon: 'apartment',
    },
    {
      key: 'arrears',
      defaultLabel: 'Arrears',
      value: fmtCurrency(kpis.arrears_cents),
      icon: 'trending_down',
    },
  ] as const

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'reports.subheading',
              {},
              { defaultValue: 'Trailing 12 months · all properties · USD' },
            )}
          </p>
        </div>
      </header>

      {loading ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant bg-surface-container-lowest rounded-2xl',
          )}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </section>
      ) : error ? (
        <LoadErrorBanner testId="reports-error" onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <>
          <section
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
            data-testid="reports-kpis"
          >
            {KPIS.map((kpi) => (
              <div
                key={kpi.key}
                data-testid={`reports-kpi-${kpi.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(`reports.kpi.${kpi.key}`, {}, { defaultValue: kpi.defaultLabel })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      'bg-primary/10 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={'material-symbols-outlined text-sm'}>{kpi.icon}</span>
                  </span>
                </div>
                <span
                  className={cm.cn(
                    'text-3xl font-extrabold tabular-nums tracking-tight text-on-surface',
                  )}
                >
                  {kpi.value}
                </span>
              </div>
            ))}
          </section>

          <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), cm.fontWeight('bold'))}>
              {t('reports.breakdownHeading', {}, { defaultValue: 'Performance by property' })}
            </h2>
            {breakdown.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('py', 12),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
                data-testid="reports-empty"
              >
                {t(
                  'reports.empty',
                  {},
                  {
                    defaultValue:
                      'No property activity yet — add properties and rent payments to see reports.',
                  },
                )}
              </div>
            ) : (
              <ul className={cm.stack(3)} data-testid="reports-breakdown">
                {breakdown.map((p) => {
                  const pct = p.occupancy_pct ?? 0
                  return (
                    <li
                      key={p.id ?? p.name}
                      className={cm.cn(
                        cm.sp('p', 4),
                        cm.grid({ gap: 'md' }),
                        'grid-cols-12 items-center bg-surface-container-low rounded-xl',
                      )}
                    >
                      <div className={'col-span-4 min-w-0'}>
                        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface line-clamp-1')}>
                          {p.name}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'reports.unitsLabel',
                            { count: p.units_count },
                            { defaultValue: '{{count}} units' },
                          )}
                        </p>
                      </div>
                      <div className="col-span-4">
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            cm.sp('mb', 1),
                          )}
                        >
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'font-bold uppercase tracking-widest text-on-surface-variant',
                            )}
                          >
                            {t('reports.occupancyLabel', {}, { defaultValue: 'Occupancy' })}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'tabular-nums font-semibold text-on-surface',
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div
                          className={cm.cn(
                            cm.h(2),
                            cm.roundedFull,
                            'bg-surface-container overflow-hidden',
                          )}
                        >
                          <div
                            className={cm.cn(
                              cm.h('full'),
                              cm.roundedFull,
                              'bg-gradient-to-r from-primary to-secondary',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className={cm.cn('col-span-2 text-right tabular-nums')}>
                        <p
                          className={cm.cn(
                            cm.textSize('lg'),
                            cm.fontWeight('bold'),
                            'text-on-surface',
                          )}
                        >
                          {fmtCurrency(p.revenue_cents)}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t('reports.monthlyRevenue', {}, { defaultValue: '/ mo' })}
                        </p>
                      </div>
                      <div className={cm.cn('col-span-2 text-right tabular-nums')}>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            p.arrears_cents > 0 ? 'text-error' : 'text-on-surface-variant',
                          )}
                        >
                          {p.arrears_cents > 0 ? fmtCurrency(p.arrears_cents) : '—'}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t('reports.arrears', {}, { defaultValue: 'arrears' })}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
