import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { KpiCard } from '../components/KpiCard.js'
import { RequestStatusPill } from '../components/RequestStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  week_start: string
  staff_total: number
  active_staff: number
  open_shifts: number
  pending_swap_requests: number
  pending_claims: number
  pending_approvals: number
  hours_scheduled: number
  max_hours_budget: number
  coverage_by_day: { label: string; date: string; shifts: number; open: number; hours: number }[]
  today_shifts: TodayShift[]
}

interface TodayShift {
  id: string
  staff_name: string
  staff_initial: string
  is_open: boolean
  role: string
  time_label: string
  published: boolean
}

interface SwapRequestRow {
  id: string
  kind: 'swap' | 'drop'
  shift_role: string
  shift_date: string
  shift_time_label: string
  requester_name: string
  requester_initial: string
  target_name: string
  status: 'pending' | 'approved' | 'denied'
  note: string
}

interface ClaimRow {
  id: string
  shift_role: string
  shift_date: string
  shift_time_label: string
  staff_name: string
  staff_initial: string
  status: 'pending' | 'approved' | 'denied'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [swaps, setSwaps] = useState<SwapRequestRow[]>([])
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/dashboard-stats').catch(() => null),
      http.get('/api/swap-requests?status=pending').catch(() => null),
      http.get('/api/claims?status=pending').catch(() => null),
    ])
      .then(([sRes, wRes, cRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(sRes))
        setSwaps(unwrapList<SwapRequestRow>(wRes).slice(0, 5))
        setClaims(unwrapList<ClaimRow>(cRes).slice(0, 5))
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
      <div className={cm.cn(cm.sp('p', 8))}>
        <LoadErrorBanner
          message={error ?? t('dashboard.empty', {}, { defaultValue: 'No data yet.' })}
        />
      </div>
    )

  const coverageMax = Math.max(...stats.coverage_by_day.map((d) => d.shifts), 1)
  const hoursPct = stats.max_hours_budget
    ? Math.min(100, Math.round((stats.hours_scheduled / stats.max_hours_budget) * 100))
    : 0

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'This week at {{appName}}' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Schedule Overview' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Coverage, approvals, and the holes that need filling.' },
            )}
          </p>
        </div>
        <Link
          to="/schedule"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            edit_calendar
          </span>
          {t('dashboard.openScheduleCta', {}, { defaultValue: 'Open schedule' })}
        </Link>
      </header>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <KpiCard
          icon="group"
          label={t('dashboard.kpi.staff', {}, { defaultValue: 'Staff on roster' })}
          value={stats.active_staff}
          hint={t(
            'dashboard.kpi.staffHint',
            {},
            {
              defaultValue: `${stats.staff_total} total · ${stats.active_staff} active`,
            },
          )}
        />
        <KpiCard
          icon="bolt"
          label={t('dashboard.kpi.openShifts', {}, { defaultValue: 'Open shifts' })}
          value={stats.open_shifts}
          trend={{
            delta: t('common.thisWeek', {}, { defaultValue: 'this week' }),
            direction: 'flat',
            tone: 'warn',
          }}
          hint={t('dashboard.kpi.openHint', {}, { defaultValue: 'Published & unclaimed.' })}
        />
        <KpiCard
          icon="approval"
          label={t('dashboard.kpi.pending', {}, { defaultValue: 'Pending approvals' })}
          value={stats.pending_approvals}
          trend={{ delta: 'action', direction: 'flat', tone: 'warn' }}
          hint={t(
            'dashboard.kpi.pendingHint',
            {},
            {
              defaultValue: `${stats.pending_swap_requests} swaps · ${stats.pending_claims} claims`,
            },
          )}
        />
        <KpiCard
          icon="schedule"
          label={t('dashboard.kpi.hours', {}, { defaultValue: 'Hours scheduled' })}
          value={stats.hours_scheduled}
          trend={{
            delta: `${hoursPct}%`,
            direction: hoursPct > 90 ? 'up' : 'flat',
            tone: hoursPct > 90 ? 'warn' : 'good',
          }}
          hint={t('dashboard.kpi.hoursHint', {}, { defaultValue: 'Of max-hours budget.' })}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-7 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('dashboard.coverageEyebrow', {}, { defaultValue: 'Week of' })} {stats.week_start}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.coverageHeading', {}, { defaultValue: 'Coverage by day' })}
              </h2>
            </div>
          </header>
          <div className={cm.cn(cm.grid({ cols: 7, gap: 'sm' }))}>
            {stats.coverage_by_day.map((d) => (
              <div key={d.date} className={cm.cn(cm.stack(1))}>
                <span
                  className={cm.cn(
                    'text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant block',
                  )}
                >
                  {d.label}
                </span>
                <div
                  className={cm.cn(
                    'rounded-lg bg-surface-container-low border border-outline-variant/20',
                    cm.flex({ align: 'end', justify: 'center' }),
                  )}
                  style={{ height: '120px' }}
                >
                  <div
                    className={cm.cn('w-full rounded-lg bg-primary/25')}
                    style={{ height: `${(d.shifts / coverageMax) * 100}%` }}
                  />
                </div>
                <span
                  className={cm.cn(
                    'text-center block text-xs font-extrabold tabular-nums text-on-surface',
                  )}
                >
                  {d.shifts}
                </span>
                {d.open > 0 ? (
                  <span
                    className={cm.cn(
                      'text-center block text-[10px] font-bold uppercase tracking-wider',
                      'text-[color:var(--color-req-pending)]',
                    )}
                  >
                    {t(
                      'dashboard.openCount',
                      { count: d.open },
                      { defaultValue: '{{count}} open' },
                    )}
                  </span>
                ) : (
                  <span className={cm.cn('block text-center text-[10px] text-transparent')}>·</span>
                )}
              </div>
            ))}
          </div>
        </section>

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
              {t('dashboard.todayHeading', {}, { defaultValue: "Today's shifts" })}
            </h2>
          </header>
          {stats.today_shifts.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('dashboard.todayEmpty', {}, { defaultValue: 'Nothing on the floor today.' })}
            </p>
          ) : (
            <ul className={cm.cn('divide-y divide-outline-variant/20')}>
              {stats.today_shifts.map((s) => (
                <li
                  key={s.id}
                  className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'md' }))}
                >
                  <span
                    className={cm.cn(
                      'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark',
                      cm.fontWeight('bold'),
                      cm.shrink0,
                    )}
                  >
                    {s.staff_initial}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                      {s.is_open
                        ? t('dashboard.openShift', {}, { defaultValue: 'Open shift' })
                        : s.staff_name}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {s.role} · {s.time_label}
                    </p>
                  </div>
                  {!s.published ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded-full uppercase tracking-wider bg-[color:var(--color-draft-bg)] text-[color:var(--color-draft)]',
                      )}
                    >
                      {t('common.draft', {}, { defaultValue: 'Draft' })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
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
              {t('dashboard.approvalsEyebrow', {}, { defaultValue: 'Waiting on you' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('dashboard.approvalsHeading', {}, { defaultValue: 'Swaps & claims' })}
            </h2>
          </div>
          <Link
            to="/swap-requests"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'inline-flex items-center rounded-lg text-primary-dark hover:text-primary-container hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('dashboard.viewAllRequests', {}, { defaultValue: 'Review all →' })}
          </Link>
        </header>
        {swaps.length === 0 && claims.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('dashboard.approvalsEmpty', {}, { defaultValue: 'Nothing pending. Enjoy it.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {swaps.map((r) => (
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
                  {r.requester_initial}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                    {r.requester_name}{' '}
                    {r.kind === 'drop'
                      ? t('dashboard.wantsToDrop', {}, { defaultValue: 'wants to drop' })
                      : t('dashboard.wantsToSwap', {}, { defaultValue: 'wants to swap' })}{' '}
                    {r.shift_role}
                    {r.target_name ? ` → ${r.target_name}` : ''}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {r.shift_date} · {r.shift_time_label} · {r.note}
                  </p>
                </div>
                <RequestStatusPill status={r.status} />
              </li>
            ))}
            {claims.map((c) => (
              <li
                key={c.id}
                className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark',
                    cm.fontWeight('bold'),
                    cm.shrink0,
                  )}
                >
                  {c.staff_initial}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                    {c.staff_name} {t('dashboard.claimed', {}, { defaultValue: 'claimed an open' })}{' '}
                    {c.shift_role} {t('dashboard.shift', {}, { defaultValue: 'shift' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {c.shift_date} · {c.shift_time_label}
                  </p>
                </div>
                <RequestStatusPill status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
