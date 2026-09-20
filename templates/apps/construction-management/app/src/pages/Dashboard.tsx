import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SEVERITY_TONE, StatusBadge } from '../components/StatusBadge.js'
import { daysSince, formatDate, labelize } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Project {
  id: string
  code: string
  name: string
  phase: string
  budget_cents: number
  progress: number
}

interface Rfi {
  id: string
  project_id: string
  project: string
  number: number
  title: string
  status: string
  due_date: string | null
  created_at: string
}

interface PunchItem {
  id: string
  project_id: string
  project: string
  location: string
  severity: string
  description: string
  status: string
  created_at: string
}

interface DailyLog {
  id: string
  project_id: string
  project: string
  log_date: string
  weather: string
  crew_count: number
  hours: number
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [rfis, setRfis] = useState<Rfi[]>([])
  const [punch, setPunch] = useState<PunchItem[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      try {
        const [p, r, pi, l] = await Promise.all([
          http.get('/api/projects'),
          http.get('/api/rfis'),
          http.get('/api/punch-items'),
          http.get('/api/daily-logs'),
        ])
        if (cancelled) return
        setProjects(unwrapList<Project>(p))
        setRfis(unwrapList<Rfi>(r))
        setPunch(unwrapList<PunchItem>(pi))
        setLogs(unwrapList<DailyLog>(l))
      } catch (_err) {
        if (!cancelled) {
          setError(t('dashboard.loadError', {}, { defaultValue: 'Failed to load the dashboard.' }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const openRfis = useMemo(() => rfis.filter((r) => r.status === 'open'), [rfis])
  const agingRfis = useMemo(
    () =>
      openRfis
        .map((r) => ({ rfi: r, age: daysSince(r.created_at) ?? 0 }))
        .sort((a, b) => b.age - a.age)
        .slice(0, 5),
    [openRfis],
  )
  const punchBySeverity = useMemo(() => {
    const open = punch.filter((p) => p.status !== 'closed')
    const counts = { high: 0, medium: 0, low: 0 }
    for (const p of open) {
      if (p.severity in counts) counts[p.severity as keyof typeof counts] += 1
    }
    return counts
  }, [punch])

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-8')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('dashboard.heading', {}, { defaultValue: 'Dashboard' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              { projects: projects.length },
              { defaultValue: '{{projects}} active jobsites at a glance' },
            )}
          </p>
        </div>
        <Link
          to="/projects"
          data-mol-id="dashboard-all-projects"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'rounded-md brand-gradient text-on-primary',
          )}
        >
          {t('dashboard.newProject', {}, { defaultValue: 'Open projects' })}
        </Link>
      </header>

      {/* KPI row */}
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-4')}>
        <StatCard
          label={t('dashboard.kpi.projects', {}, { defaultValue: 'Active projects' })}
          value={String(projects.filter((p) => p.phase !== 'closeout').length)}
          href="/projects"
        />
        <StatCard
          label={t('dashboard.kpi.openRfis', {}, { defaultValue: 'Open RFIs' })}
          value={String(openRfis.length)}
          tone="info"
        />
        <StatCard
          label={t('dashboard.kpi.highPunch', {}, { defaultValue: 'High-severity punch items' })}
          value={String(punchBySeverity.high)}
          tone="danger"
        />
        <StatCard
          label={t('dashboard.kpi.logsToday', {}, { defaultValue: 'Crew hours logged' })}
          value={logs.reduce((sum, l) => sum + l.hours, 0).toLocaleString()}
        />
      </div>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-2')}>
        {/* Open RFI aging */}
        <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('dashboard.rfiAging', {}, { defaultValue: 'Open RFI aging' })}
          </h2>
          {agingRfis.length === 0 ? (
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('dashboard.noOpenRfis', {}, { defaultValue: 'No open RFIs. Nice and quiet.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
              {agingRfis.map(({ rfi, age }) => (
                <li
                  key={rfi.id}
                  className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
                >
                  <Link
                    to={`/projects/${rfi.project_id}/rfis/${rfi.id}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'truncate hover:underline',
                    )}
                  >
                    <span className={'text-on-surface-variant'}>#{rfi.number}</span> {rfi.title}
                  </Link>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      age >= 5 ? 'text-error' : 'text-on-surface-variant',
                    )}
                  >
                    {t('dashboard.rfiAge', { days: age }, { defaultValue: '{{days}}d open' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Punch severity */}
        <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('dashboard.punchSeverity', {}, { defaultValue: 'Open punch items by severity' })}
          </h2>
          <div className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
            {(['high', 'medium', 'low'] as const).map((sev) => (
              <div key={sev} className={cm.flex({ align: 'center', justify: 'between' })}>
                <StatusBadge
                  value={sev}
                  tone={SEVERITY_TONE[sev] ?? 'neutral'}
                  translationKeyPrefix="punch.severity"
                />
                <div
                  className={cm.cn(
                    cm.flex1,
                    'mx-4 h-2 rounded-full bg-surface-container-highest overflow-hidden',
                  )}
                >
                  <div
                    className={
                      sev === 'high'
                        ? 'h-full bg-error'
                        : sev === 'medium'
                          ? 'h-full bg-warning'
                          : 'h-full bg-success'
                    }
                    style={{ width: `${Math.min(100, punchBySeverity[sev] * 20)}%` }}
                  />
                </div>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {punchBySeverity[sev]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent daily logs */}
      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {t('dashboard.recentLogs', {}, { defaultValue: 'Recent daily logs' })}
        </h2>
        {logs.length === 0 ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('dashboard.noLogs', {}, { defaultValue: 'No daily logs filed yet.' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
            {logs.slice(0, 5).map((l) => (
              <li
                key={l.id}
                className={cm.flex({
                  align: 'center',
                  justify: 'between',
                  gap: 'md',
                  wrap: 'wrap',
                })}
              >
                <div>
                  <Link
                    to={`/projects/${l.project_id}/logs`}
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'hover:underline')}
                  >
                    {l.project}
                  </Link>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {formatDate(l.log_date)} · {labelize(l.weather)} ·{' '}
                    {t(
                      'dashboard.crewCount',
                      { count: l.crew_count },
                      { defaultValue: '{{count}} on site' },
                    )}
                  </p>
                </div>
                <StatusBadge
                  value={l.weather}
                  tone="neutral"
                  translationKeyPrefix="dailyLogs.weather"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: string
  href?: string
  tone?: 'info' | 'danger'
}) {
  const cm = getClassMap()
  const body = (
    <>
      <p
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          tone === 'danger' ? 'text-error' : tone === 'info' ? 'text-secondary' : 'text-on-surface',
        )}
      >
        {value}
      </p>
      <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>{label}</p>
    </>
  )
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      {href ? (
        <Link to={href} data-mol-id={`dashboard-kpi-${label}`} className={'block'}>
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  )
}

export default Dashboard
