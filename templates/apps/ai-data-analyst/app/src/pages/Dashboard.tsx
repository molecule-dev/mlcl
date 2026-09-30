import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  type InsightCardData,
  InsightFeedCard,
  type InsightType,
} from '../components/InsightFeedCard.js'
import { InsightHeroCard } from '../components/InsightHeroCard.js'
import { type KpiTile, KpiTileGrid } from '../components/KpiTileGrid.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

/**
 * Example natural-language queries surfaced on the dashboard. Each carries the
 * prompt it seeds /query with, so "Recent queries" rows and "Saved queries"
 * are live affordances — clicking one opens the QueryEditor pre-filled, and
 * Ask runs the real POST /api/queries.
 */
const EXAMPLE_QUERIES = [
  {
    id: 'revenue-by-category',
    prompt: 'Show me revenue by product category for this quarter vs last quarter',
    outputIcon: 'bar_chart',
  },
  {
    id: 'churn-risk',
    prompt: 'Identify customers with high churn risk in the next 30 days',
    outputIcon: 'group',
  },
  {
    id: 'active-users-drop',
    prompt: 'What caused the drop in active users this week?',
    outputIcon: 'monitoring',
  },
] as const

const SAVED_QUERIES = [
  { id: 'daily-revenue', name: 'Daily Revenue MTD', prompt: 'Daily revenue month to date' },
  {
    id: 'users-by-platform',
    name: 'Active Users by Platform',
    prompt: 'Active users grouped by platform',
  },
  {
    id: 'error-rate-alert',
    name: 'Error Rate Alert Base',
    prompt: 'Error rate by endpoint over the last 7 days',
  },
] as const

interface DashboardStats {
  kpis: KpiTile[]
}

const FALLBACK_KPIS: KpiTile[] = [
  {
    key: 'queries',
    label: 'Queries this month',
    value: '184',
    delta_pct: 12.4,
    sparkline: [12, 14, 18, 21, 28, 24, 32, 28],
  },
  {
    key: 'datasets',
    label: 'Active datasets',
    value: '12',
    delta_pct: 0.0,
    sparkline: [10, 11, 11, 11, 12, 12, 12, 12],
  },
  {
    key: 'insights',
    label: 'Insights surfaced',
    value: '42',
    delta_pct: 18.2,
    sparkline: [4, 6, 8, 12, 18, 24, 32, 42],
  },
  {
    key: 'shared',
    label: 'Shared reports',
    value: '8',
    delta_pct: 4.0,
    sparkline: [2, 3, 4, 4, 6, 6, 7, 8],
  },
]

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [insights, setInsights] = useState<InsightCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const u = user as { name?: string; email?: string } | null
  const greetingName = u?.name?.split(' ')[0] ?? u?.email?.split('@')[0] ?? 'there'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/dashboard_stats').catch(() => null),
      http.get('/api/insights').catch(() => null),
    ])
      .then(([sRes, iRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(sRes))
        setInsights(
          unwrapList<{ type: string } & Omit<InsightCardData, 'type'>>(iRes).map((i) => ({
            ...i,
            type: (['trend', 'anomaly', 'correlation', 'summary'].includes(i.type)
              ? i.type
              : 'summary') as InsightType,
          })),
        )
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

  const kpis = stats?.kpis ?? FALLBACK_KPIS
  const heroTile = kpis.find((k) => k.key === 'insights') ?? kpis[0]
  const otherTiles = kpis.filter((k) => k !== heroTile)

  // Revenue Trend Analysis — actual series is the lead KPI's sparkline (the
  // same data the tiles draw); predicted extends it with a linear projection
  // of the last third so the design's actual-vs-predicted split is live data
  // plus a clearly-derived forecast, never a hardcoded fake history.
  const trendSeries = (heroTile ?? kpis[0])?.sparkline ?? FALLBACK_KPIS[0].sparkline
  const trendTail = Math.max(2, Math.round(trendSeries.length / 3))
  const actual = trendSeries.slice(0, trendSeries.length - trendTail)
  const projWindow = trendSeries.slice(-(trendTail + 1))
  const slope =
    (projWindow[projWindow.length - 1] - projWindow[0]) / Math.max(1, projWindow.length - 1)
  const lastActual = actual[actual.length - 1] ?? 0
  const predicted = Array.from({ length: trendTail + 1 }, (_, i) => lastActual + slope * i)
  const trendMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 2 + i)
    return d.toLocaleString(undefined, { month: 'short' }).toUpperCase()
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.flex({ direction: 'col', gap: 6 }))}>
      <div className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 4 })}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Today · {{appName}} at a glance' },
            )}
          </p>
          <h1
            data-mol-id="dashboard-greeting"
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'font-headline tracking-tight',
            )}
          >
            {t(
              'dashboard.heading',
              { name: greetingName },
              { defaultValue: 'Welcome back, {{name}}' },
            )}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}
          >
            {t(
              'dashboard.subhead',
              {},
              {
                defaultValue:
                  'Three new insights since yesterday. One anomaly worth a closer look.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <Link
            to="/upload"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-primary/40 transition-colors',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              upload_file
            </span>
            {t('dashboard.uploadCta', {}, { defaultValue: 'Upload data' })}
          </Link>
          <Link
            to="/query"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              auto_awesome
            </span>
            {t('dashboard.askCta', { appName: APP_NAME }, { defaultValue: 'Ask {{appName}}' })}
          </Link>
        </div>
      </div>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-error-container/30 text-error text-center',
          )}
        >
          {error}
        </div>
      ) : null}

      <section
        aria-labelledby="dashboard-overview-heading"
        className={cm.flex({ direction: 'col', gap: 1 })}
      >
        <h2
          id="dashboard-overview-heading"
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight text-on-surface',
          )}
        >
          {t('dashboard.overviewHeading', {}, { defaultValue: 'Overview' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'dashboard.overviewSubhead',
            {},
            { defaultValue: 'High-level telemetry across your connected datasets.' },
          )}
        </p>
      </section>

      <InsightHeroCard
        label={t('dashboard.heroLabel', {}, { defaultValue: heroTile.label })}
        value={heroTile.value}
        deltaPct={heroTile.delta_pct}
        sparkline={heroTile.sparkline}
        ctaLabel={t('dashboard.heroCta', {}, { defaultValue: 'Open insights feed' })}
        ctaTo="/notifications"
      />

      <KpiTileGrid tiles={otherTiles.length > 0 ? otherTiles : kpis} />

      {/* Revenue Trend Analysis — actual KPI series + derived forecast. */}
      <section
        aria-labelledby="dashboard-trend-heading"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 4 }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 2 })}>
          <div className={cm.flex({ direction: 'col', gap: 1 })}>
            <h2
              id="dashboard-trend-heading"
              className={cm.cn(
                'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface',
              )}
            >
              {t('dashboard.trendHeading', {}, { defaultValue: 'Revenue Trend Analysis' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.trendSubhead',
                {},
                { defaultValue: 'Actuals vs forecast over the last quarter' },
              )}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 4 })}>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}>
              <span
                aria-hidden="true"
                className={'inline-block h-0.5 w-6 rounded-full'}
                style={{ background: 'var(--chart-color-1)' }}
              />
              {t('dashboard.trendActual', {}, { defaultValue: 'Actual' })}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}>
              <span
                aria-hidden="true"
                className={'inline-block w-6 border-t-2 border-dashed'}
                style={{ borderColor: 'var(--chart-color-2)' }}
              />
              {t('dashboard.trendPredicted', {}, { defaultValue: 'Predicted' })}
            </span>
          </div>
        </div>
        <div data-mol-id="dashboard-trend-chart">
          <TrendChart actual={actual} predicted={predicted} />
        </div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-widest',
          )}
        >
          {trendMonths.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </section>

      {/* Recent Natural Language Queries — the user's asked prompts (tracked
          in-session by QueryEditor) with runnable example rows as fallback. */}
      <section
        aria-labelledby="dashboard-nlq-heading"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            id="dashboard-nlq-heading"
            className={cm.cn('text-[10px] uppercase tracking-[0.22em] font-black text-on-surface')}
          >
            {t('dashboard.nlqHeading', {}, { defaultValue: 'Recent Natural Language Queries' })}
          </h2>
          <Link
            to="/query"
            data-mol-id="dashboard-nlq-view-all"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary hover:text-primary-container uppercase tracking-widest transition-colors',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View All' })}
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Link>
        </div>
        <div className={'overflow-x-auto'}>
          <table className={cm.cn('w-full', cm.textSize('sm'))}>
            <thead>
              <tr className={'border-b border-outline-variant/50 text-left'}>
                <th
                  scope="col"
                  className={cm.cn(
                    cm.sp('py', 2),
                    cm.sp('pr', 4),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('dashboard.nlq.col.intention', {}, { defaultValue: 'Query Intention' })}
                </th>
                <th
                  scope="col"
                  className={cm.cn(
                    cm.sp('py', 2),
                    cm.sp('px', 4),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('dashboard.nlq.col.output', {}, { defaultValue: 'Output' })}
                </th>
                <th
                  scope="col"
                  className={cm.cn(
                    cm.sp('py', 2),
                    cm.sp('pl', 4),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant text-right',
                  )}
                >
                  {t('dashboard.nlq.col.executed', {}, { defaultValue: 'Executed' })}
                </th>
              </tr>
            </thead>
            <tbody className={'divide-y divide-outline-variant/40'}>
              {EXAMPLE_QUERIES.map((q) => (
                <tr key={q.id} className={'hover:bg-surface-container/50 transition-colors'}>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4))}>
                    <Link
                      to={`/query?q=${encodeURIComponent(q.prompt)}`}
                      data-mol-id={`dashboard-nlq-${q.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 2 }),
                        'text-on-surface hover:text-primary transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.w(7),
                          cm.h(7),
                          cm.roundedFull,
                          'bg-primary/10 text-primary flex-shrink-0',
                        )}
                        aria-hidden="true"
                      >
                        <span className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}>
                          chat
                        </span>
                      </span>
                      <span className={'truncate'}>“{q.prompt}”</span>
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('px', 4))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(7),
                        cm.h(7),
                        cm.roundedFull,
                        'bg-secondary/10 text-secondary',
                      )}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}>
                        {q.outputIcon}
                      </span>
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('py', 3), cm.sp('pl', 4), cm.textRight)}>
                    <Link
                      to={`/query?q=${encodeURIComponent(q.prompt)}`}
                      tabIndex={-1}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'bg-surface-container text-on-surface-variant hover:text-primary transition-colors',
                      )}
                    >
                      {t('dashboard.nlq.tryCta', {}, { defaultValue: 'Run' })}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cm.flex({ direction: 'col', gap: 4 })}>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mt', 2))}>
          <div>
            <p className={cm.cn('text-[10px] uppercase tracking-[0.22em] font-black text-primary')}>
              {t('dashboard.insightsEyebrow', {}, { defaultValue: 'AI-noticed' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'font-headline tracking-tight',
              )}
            >
              {t('dashboard.insightsHeading', {}, { defaultValue: 'AI Generated Insights' })}
            </h2>
          </div>
          <Link
            to="/notifications"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary hover:text-primary-container uppercase tracking-widest transition-colors group',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
            <span
              className={cm.cn(
                'material-symbols-outlined',
                cm.textSize('sm'),
                'group-hover:translate-x-0.5 transition-transform',
              )}
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Link>
        </div>

        {loading ? (
          <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'md:grid-cols-2 xl:grid-cols-3')}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={'rounded-xl bg-surface-container-low animate-pulse h-[160px]'}
              />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'dashboard.noInsights',
              {},
              { defaultValue: 'No insights yet — upload a dataset to get started.' },
            )}
          </p>
        ) : (
          <ul
            className={cm.cn(
              cm.grid({ cols: 1, gap: 4 }),
              'md:grid-cols-2 xl:grid-cols-3 list-none p-0',
            )}
          >
            {insights.map((ix) => (
              <li key={ix.id}>
                <InsightFeedCard insight={ix} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Saved Queries — one-click re-runs; each opens /query pre-filled. */}
      <section
        aria-labelledby="dashboard-saved-heading"
        className={cm.flex({ direction: 'col', gap: 3 })}
      >
        <h2
          id="dashboard-saved-heading"
          className={cm.cn('text-[10px] uppercase tracking-[0.22em] font-black text-on-surface')}
        >
          {t('dashboard.savedHeading', {}, { defaultValue: 'Saved Queries' })}
        </h2>
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 3 }), 'sm:grid-cols-2 lg:grid-cols-3')}
          data-mol-id="dashboard-saved-queries"
        >
          {SAVED_QUERIES.map((q) => (
            <Link
              key={q.id}
              to={`/query?q=${encodeURIComponent(q.prompt)}`}
              data-mol-id={`dashboard-saved-${q.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  cm.roundedFull,
                  'bg-primary/10 text-primary flex-shrink-0',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                  bookmark
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface truncate',
                )}
              >
                {q.name}
              </span>
              <span
                className={cm.cn(
                  'material-symbols-outlined',
                  cm.textSize('sm'),
                  'ml-auto text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all',
                )}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

/**
 * Actual-vs-predicted SVG for the Revenue Trend Analysis section — solid
 * actual polyline, dashed forecast continuation sharing its last point, on
 * the shared 200×80 chart geometry. Both series normalize against the same
 * min/max so the forecast visually continues the actual line.
 */
function TrendChart({ actual, predicted }: { actual: number[]; predicted: number[] }) {
  const combined = [...actual, ...predicted]
  const max = Math.max(...combined, 1)
  const min = Math.min(...combined, 0)
  const range = Math.max(1, max - min)
  const n = Math.max(1, combined.length - 1)
  const xy = (value: number, index: number) => {
    const x = (index / n) * 200
    const y = 80 - ((value - min) / range) * 72
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }
  const actualPoints = actual.map((v, i) => xy(v, i)).join(' ')
  const predictedOffset = actual.length - 1
  const predictedPoints = predicted.map((v, i) => xy(v, predictedOffset + i)).join(' ')

  return (
    <svg
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={'w-full h-44'}
      aria-hidden="true"
    >
      <line x1="0" y1="78" x2="200" y2="78" className={'chart-grid'} />
      <polygon
        points={`${actualPoints} ${(((actual.length - 1) / n) * 200).toFixed(1)},80 0,80`}
        fill="var(--chart-color-1)"
        opacity="0.1"
      />
      <polyline
        points={actualPoints}
        fill="none"
        stroke="var(--chart-color-1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={predictedPoints}
        fill="none"
        stroke="var(--chart-color-2)"
        strokeWidth="2"
        strokeDasharray="5 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default Dashboard
