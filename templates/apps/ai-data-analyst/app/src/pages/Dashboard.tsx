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

      <InsightHeroCard
        label={t('dashboard.heroLabel', {}, { defaultValue: heroTile.label })}
        value={heroTile.value}
        deltaPct={heroTile.delta_pct}
        sparkline={heroTile.sparkline}
        ctaLabel={t('dashboard.heroCta', {}, { defaultValue: 'Open insights feed' })}
        ctaTo="/notifications"
      />

      <KpiTileGrid tiles={otherTiles.length > 0 ? otherTiles : kpis} />

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
              {t('dashboard.insightsHeading', {}, { defaultValue: 'Recent insights' })}
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
    </div>
  )
}

export default Dashboard
