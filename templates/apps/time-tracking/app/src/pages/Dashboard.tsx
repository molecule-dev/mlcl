import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DurationKpiCard } from '../components/DurationKpiCard.js'
import { type TimeEntry as RowEntry, TimeEntryRow } from '../components/TimeEntryRow.js'
import { TimerHeroCard } from '../components/TimerHeroCard.js'
import { formatCents, formatHms, formatHourMinute, formatTimeOfDay } from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiInvoice, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList } from '../lib/unwrap.js'

interface UserShape {
  name?: string
  email?: string
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserShape>()
  const { running, elapsedSeconds, entriesVersion } = useTimer()

  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [invoices, setInvoices] = useState<ReadonlyArray<ApiInvoice>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/entries').catch(() => null),
      http.get('/api/projects').catch(() => null),
      http.get('/api/invoices').catch(() => null),
    ])
      .then(([e, p, i]) => {
        if (cancelled) return
        setEntries(unwrapList<ApiTimeEntry>(e))
        setProjects(unwrapList<ApiProject>(p))
        setInvoices(unwrapList<ApiInvoice>(i))
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, entriesVersion])

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const weekStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d.getTime()
  }, [])

  const monthStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(1)
    return d.getTime()
  }, [])

  const stats = useMemo(() => {
    const todays = entries.filter((e) => new Date(e.started_at).getTime() >= todayStart)
    const trackedToday =
      todays.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0) + (running ? elapsedSeconds : 0)
    const billableToday =
      todays.filter((e) => e.is_billable).reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0) +
      (running?.is_billable ? elapsedSeconds : 0)

    const weekEntries = entries.filter((e) => new Date(e.started_at).getTime() >= weekStart)
    const trackedWeek = weekEntries.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)
    const billableWeek = weekEntries
      .filter((e) => e.is_billable)
      .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)

    return { trackedToday, billableToday, trackedWeek, billableWeek }
  }, [entries, running, elapsedSeconds, todayStart, weekStart])

  // Daily series for sparkline (last 7 days, today included).
  const sparkSeries = useMemo(() => {
    const days = Array<number>(7).fill(0)
    const now = Date.now()
    for (const e of entries) {
      const ms = new Date(e.started_at).getTime()
      const dayDiff = Math.floor((now - ms) / 86_400_000)
      if (dayDiff >= 0 && dayDiff < 7) {
        days[6 - dayDiff] += (e.duration_seconds ?? 0) / 3600
      }
    }
    if (running) days[6] += elapsedSeconds / 3600
    return days
  }, [entries, running, elapsedSeconds])

  const trendPct = useMemo(() => {
    const half = sparkSeries.length / 2
    const earlier = sparkSeries.slice(0, half).reduce((a, b) => a + b, 0)
    const later = sparkSeries.slice(half).reduce((a, b) => a + b, 0)
    if (earlier <= 0 && later <= 0) return 0
    if (earlier <= 0) return 100
    return ((later - earlier) / earlier) * 100
  }, [sparkSeries])

  const invoicedThisMonth = useMemo(
    () =>
      invoices
        .filter(
          (i) =>
            (i.status === 'paid' || i.status === 'sent') &&
            new Date(i.issued_at).getTime() >= monthStart,
        )
        .reduce((acc, i) => acc + (i.total_cents ?? 0), 0),
    [invoices, monthStart],
  )

  const recentRows: ReadonlyArray<RowEntry> = useMemo(() => {
    const decorated = entries.map((e) => {
      const project = e.project_id ? projectById.get(e.project_id) : null
      const duration =
        e.duration_seconds ?? Math.floor((Date.now() - new Date(e.started_at).getTime()) / 1000)
      return {
        id: e.id,
        description: e.description,
        projectName: project?.name ?? null,
        projectColor: project?.color ?? null,
        startLabel: formatTimeOfDay(e.started_at),
        endLabel: e.ended_at
          ? formatTimeOfDay(e.ended_at)
          : t('dashboard.now', {}, { defaultValue: 'now' }),
        durationLabel: formatHms(duration),
        billable: e.is_billable,
      }
    })
    return decorated.slice(0, 6)
  }, [entries, projectById, t])

  const greetingName = (user?.name?.trim() || user?.email || 'there') as string

  // Per-project tracked seconds for the active-projects panel.
  const projectSeconds = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      if (!e.project_id) continue
      map.set(e.project_id, (map.get(e.project_id) ?? 0) + (e.duration_seconds ?? 0))
    }
    if (running?.project_id) {
      map.set(running.project_id, (map.get(running.project_id) ?? 0) + elapsedSeconds)
    }
    return map
  }, [entries, running, elapsedSeconds])

  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => !p.archived)
        .sort((a, b) => (projectSeconds.get(b.id) ?? 0) - (projectSeconds.get(a.id) ?? 0))
        .slice(0, 5),
    [projects, projectSeconds],
  )

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-[1400px] mx-auto')}
      data-test="dashboard"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t(
              'dashboard.greeting',
              { name: greetingName },
              { defaultValue: 'Good day, {{name}}' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'dashboard.subtitle',
              {},
              { defaultValue: "Here's what your day looks like. Keep the timer running." },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/timesheet"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
          >
            {t('dashboard.viewTimesheet', {}, { defaultValue: 'View timesheet' })}
          </Link>
          <Link
            to="/reports"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>analytics</span>
            {t('dashboard.viewReports', {}, { defaultValue: 'View reports' })}
          </Link>
        </div>
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-start')}>
        <div className={cm.cn('lg:col-span-7')}>
          <TimerHeroCard
            trackedToday={formatHms(stats.trackedToday)}
            billableToday={formatHourMinute(stats.billableToday)}
            trendPct={Number(trendPct.toFixed(1))}
            weekly={sparkSeries}
          />
        </div>
        <div className={cm.cn('lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4')}>
          <DurationKpiCard
            label={t('status.thisWeek', {}, { defaultValue: 'This week' })}
            value={formatHourMinute(stats.trackedWeek)}
            icon="schedule"
            accent="primary"
          />
          <DurationKpiCard
            label={t('dashboard.kpi.billable', {}, { defaultValue: 'Billable this week' })}
            value={formatHourMinute(stats.billableWeek)}
            icon="attach_money"
            accent="violet"
          />
          <DurationKpiCard
            label={t('dashboard.kpi.activeProjects', {}, { defaultValue: 'Active projects' })}
            value={String(activeProjects.length)}
            icon="folder_open"
            accent="emerald"
            mono={false}
          />
          <DurationKpiCard
            label={t('dashboard.kpi.invoiced', {}, { defaultValue: 'Invoiced this month' })}
            value={formatCents(invoicedThisMonth)}
            icon="receipt_long"
            accent="amber"
          />
        </div>
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-start')}>
        <div className={cm.cn('lg:col-span-7 bg-surface rounded-2xl shadow-sm overflow-hidden')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 5),
              'border-b border-border',
            )}
          >
            <div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
                {t('dashboard.recentEntries', {}, { defaultValue: 'Recent entries' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(
                  'dashboard.recentEntriesSubtitle',
                  {},
                  { defaultValue: 'Latest tracked sessions across all projects.' },
                )}
              </p>
            </div>
            <Link
              to="/entries"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-blue-600 hover:underline',
              )}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
            </Link>
          </div>
          <div className={cm.cn('divide-y divide-border')}>
            {loading ? (
              <p
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-foreground-secondary',
                )}
              >
                {t('dashboard.loading', {}, { defaultValue: 'Loading entries…' })}
              </p>
            ) : recentRows.length === 0 ? (
              <p
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-foreground-secondary',
                )}
                data-test="dashboard-empty"
              >
                {t(
                  'dashboard.empty',
                  {},
                  { defaultValue: 'No entries yet. Start the timer to track your first session.' },
                )}
              </p>
            ) : (
              recentRows.map((e) => <TimeEntryRow key={e.id} entry={e} />)
            )}
          </div>
          {error && (
            <p
              className={cm.cn(
                cm.sp('p', 4),
                cm.textSize('xs'),
                'text-error bg-rose-50 border-t border-rose-100',
              )}
            >
              {t(
                'dashboard.errorMessage',
                { error },
                { defaultValue: 'Could not refresh: {{error}}' },
              )}
            </p>
          )}
        </div>

        <div className={cm.cn('lg:col-span-5 bg-surface rounded-2xl shadow-sm overflow-hidden')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 5),
              'border-b border-border',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
              {t('dashboard.activeProjects', {}, { defaultValue: 'Active projects' })}
            </h2>
            <Link
              to="/projects"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-blue-600 hover:underline',
              )}
            >
              {t('common.manage', {}, { defaultValue: 'Manage' })}
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('p', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-foreground-secondary',
              )}
              data-test="dashboard-projects-empty"
            >
              {t(
                'dashboard.projectsEmpty',
                {},
                { defaultValue: 'No projects yet. Create one to start grouping your time.' },
              )}
            </p>
          ) : (
            <div>
              {activeProjects.map((p) => {
                const seconds = projectSeconds.get(p.id) ?? 0
                return (
                  <Link
                    to={`/projects/${p.id}`}
                    key={p.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      'hover:bg-surface-secondary transition-colors border-b border-border last:border-b-0',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'min-w-0',
                        cm.flex1,
                      )}
                    >
                      <span
                        className={cm.cn(cm.w(2.5), cm.h(2.5), cm.roundedFull, 'shrink-0')}
                        style={{ backgroundColor: p.color }}
                      />
                      <div className={cm.cn('min-w-0')}>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-foreground truncate',
                          )}
                        >
                          {p.name}
                        </p>
                        <p className={cm.cn('text-[11px] text-foreground-secondary truncate')}>
                          {p.client_id
                            ? t('dashboard.projectClient', {}, { defaultValue: 'Client project' })
                            : t('dashboard.projectInternal', {}, { defaultValue: 'Internal' })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'tabular-nums font-mono font-bold text-foreground',
                      )}
                    >
                      {formatHourMinute(seconds)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
