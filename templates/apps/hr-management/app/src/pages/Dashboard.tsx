import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { HeadcountHeroCard } from '../components/HeadcountHeroCard.js'
import { KpiCard } from '../components/KpiCard.js'
import type { PtoStatus } from '../components/PtoStatusPill.js'
import { PtoStatusPill } from '../components/PtoStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

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

interface PtoRequest {
  id: string
  employee_name: string
  employee_initial: string
  type_label: string
  start_date: string
  end_date: string
  days: number
  status: PtoStatus
  reason: string
}

interface NotificationEvent {
  id: string
  icon: string
  title: string
  body: string
  occurred_at: string
  link: string
  unread: boolean
}

type Translate = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string, t: Translate): string {
  const date = new Date(iso)
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pto, setPto] = useState<PtoRequest[]>([])
  const [activity, setActivity] = useState<NotificationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/dashboard-stats').catch(() => null),
      http.get('/api/pto').catch(() => null),
      http.get('/api/notifications').catch(() => null),
    ])
      .then(([sRes, pRes, nRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(sRes))
        setPto(
          unwrapList<PtoRequest>(pRes)
            .filter((r) => r.status === 'pending')
            .slice(0, 5),
        )
        setActivity(unwrapList<NotificationEvent>(nRes).slice(0, 6))
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
  if (error || !stats)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('dashboard.empty', {}, { defaultValue: 'No data yet.' })}
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Today at {{appName}}' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'People Overview' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Headcount, PTO load, and what needs your attention.' },
            )}
          </p>
        </div>
        <Link
          to="/employees/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            person_add
          </span>
          {t('dashboard.newEmployeeCta', {}, { defaultValue: 'Add employee' })}
        </Link>
      </header>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <KpiCard
          icon="group"
          label={t('dashboard.kpi.headcount', {}, { defaultValue: 'Total headcount' })}
          value={stats.headcount}
          trend={{ delta: `+${stats.headcount_delta}`, direction: 'up', tone: 'good' }}
          hint={t('dashboard.kpi.headcountHint', {}, { defaultValue: 'Net 30 days' })}
        />
        <KpiCard
          icon="calendar_month"
          label={t('dashboard.kpi.openPto', {}, { defaultValue: 'PTO requests' })}
          value={stats.open_pto_requests}
          trend={{ delta: 'pending', direction: 'flat', tone: 'warn' }}
          hint={t('dashboard.kpi.ptoHint', {}, { defaultValue: 'Awaiting approval.' })}
        />
        <KpiCard
          icon="celebration"
          label={t('dashboard.kpi.anniversaries', {}, { defaultValue: 'Anniversaries' })}
          value={stats.anniversaries_this_week}
          hint={t(
            'dashboard.kpi.anniversariesHint',
            {},
            { defaultValue: 'This week — send a note.' },
          )}
        />
        <KpiCard
          icon="person_add"
          label={t('dashboard.kpi.starting', {}, { defaultValue: 'Starting this month' })}
          value={stats.starting_this_month}
          hint={t('dashboard.kpi.startingHint', {}, { defaultValue: 'Onboarding journeys live.' })}
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
          />
        </div>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </h2>
            <Link
              to="/notifications"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary-dark hover:text-primary-container transition-colors',
              )}
            >
              {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
            </Link>
          </header>
          {activity.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('dashboard.activityEmpty', {}, { defaultValue: 'Nothing new — quiet day.' })}
            </p>
          ) : (
            <ol className={cm.stack(4)}>
              {activity.map((ev) => (
                <li
                  key={ev.id}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('p', 3),
                    'rounded-xl hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary-dark material-symbols-outlined text-[18px] shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    {ev.icon}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                      {ev.title}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{ev.body}</p>
                    <p
                      className={cm.cn(
                        cm.sp('mt', 1),
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {fmtRelative(ev.occurred_at, t)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.ptoEyebrow', {}, { defaultValue: 'Time off — pending approvals' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('dashboard.ptoHeading', {}, { defaultValue: 'Requests waiting on you' })}
            </h2>
          </div>
          <Link
            to="/pto"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:text-primary-container transition-colors',
            )}
          >
            {t('dashboard.viewAllPto', {}, { defaultValue: 'Time off →' })}
          </Link>
        </header>
        {pto.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('dashboard.ptoEmpty', {}, { defaultValue: 'Nothing pending.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {pto.map((r) => (
              <li
                key={r.id}
                className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark',
                    cm.fontWeight('bold'),
                    cm.shrink0,
                  )}
                >
                  {r.employee_initial}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                    {r.employee_name}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {r.type_label} · {r.start_date} → {r.end_date}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tabular-nums tracking-tight text-on-surface',
                  )}
                >
                  {r.days}
                  <span className={cm.cn(cm.textSize('xs'), 'font-medium text-on-surface-variant')}>
                    {' '}
                    d
                  </span>
                </span>
                <PtoStatusPill status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
