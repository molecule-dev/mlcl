import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { HeadcountHeroCard } from '../components/HeadcountHeroCard.js'
import { KpiCard } from '../components/KpiCard.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  headcount: number
  headcount_delta: number
  active_today: number
  on_leave: number
  open_pto_requests: number
  anniversaries_this_week: number
  starting_this_month: number
  headcount_by_dept: { name: string; count: number; color: string }[]
  tenure_buckets: { label: string; count: number }[]
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/dashboard-stats')
      .then((res) => {
        if (!cancelled) setStats(unwrapSingle<DashboardStats>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
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
  if (error || !stats)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('reports.empty', {}, { defaultValue: 'No data yet.' })}
      </div>
    )

  const tenureMax = Math.max(...stats.tenure_buckets.map((b) => b.count), 1)
  const turnoverPct = 4.2
  const promoRate = 11.0
  const ptoUtilization = 68

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}>
          {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('reports.heading', {}, { defaultValue: 'People reports' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'reports.subheading',
            {},
            {
              defaultValue:
                'Headcount, tenure, turnover, PTO utilization, and diversity at a glance.',
            },
          )}
        </p>
      </header>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <KpiCard
          icon="trending_up"
          label={t('reports.kpi.headcount', {}, { defaultValue: 'Headcount' })}
          value={stats.headcount}
          trend={{ delta: `+${stats.headcount_delta}`, direction: 'up', tone: 'good' }}
          hint={t('reports.kpi.headcountHint', {}, { defaultValue: 'Net 30 days.' })}
        />
        <KpiCard
          icon="trending_down"
          label={t('reports.kpi.turnover', {}, { defaultValue: 'Turnover (annualised)' })}
          value={`${turnoverPct}%`}
          trend={{ delta: '-0.4', direction: 'down', tone: 'good' }}
          hint={t('reports.kpi.turnoverHint', {}, { defaultValue: 'Below SaaS industry avg.' })}
        />
        <KpiCard
          icon="rocket_launch"
          label={t('reports.kpi.promotions', {}, { defaultValue: 'Promotions' })}
          value={`${promoRate}%`}
          hint={t('reports.kpi.promotionsHint', {}, { defaultValue: 'Of eligible cohort.' })}
        />
        <KpiCard
          icon="calendar_month"
          label={t('reports.kpi.ptoUtilization', {}, { defaultValue: 'PTO utilization' })}
          value={`${ptoUtilization}%`}
          trend={{ delta: '+5', direction: 'up', tone: 'warn' }}
          hint={t('reports.kpi.ptoHint', {}, { defaultValue: 'YTD vs allocation.' })}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <div className={cm.cn('lg:col-span-7')}>
          <HeadcountHeroCard
            total={stats.headcount}
            delta={stats.headcount_delta}
            active={stats.active_today}
            onLeave={stats.on_leave}
            departments={stats.headcount_by_dept}
            eyebrow={t('reports.heroEyebrow', {}, { defaultValue: 'Headcount by department' })}
            title={t(
              'reports.heroTitle',
              { appName: APP_NAME },
              { defaultValue: 'Where {{appName}} lives' },
            )}
          />
        </div>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('reports.tenureEyebrow', {}, { defaultValue: 'Tenure distribution' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('reports.tenureHeading', {}, { defaultValue: 'How long people stay' })}
            </h2>
          </header>
          <ul className={cm.cn(cm.sp('mt', 6), cm.stack(4))}>
            {stats.tenure_buckets.map((b) => (
              <li key={b.label}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.cn('font-semibold text-on-surface')}>{b.label}</span>
                  <span className={cm.cn('font-extrabold tabular-nums text-on-surface')}>
                    {b.count}
                  </span>
                </div>
                <div
                  className={cm.cn('h-2.5 overflow-hidden rounded-full bg-surface-container-low')}
                >
                  <div
                    className={cm.cn('h-full rounded-full bg-primary transition-all')}
                    style={{ width: `${(b.count / tenureMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
