import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiTile } from '../components/KpiTile.js'
import { PipelineFunnelHero } from '../components/PipelineFunnelHero.js'
import { ScoreBadge } from '../components/ScoreBadge.js'
import type { Stage } from '../components/StagePill.js'
import { StagePill } from '../components/StagePill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface DashboardStats {
  open_jobs?: number
  active_candidates?: number
  interviews_this_week?: number
  hires_mtd?: number
  funnel?: { stage: string; count: number; color: string }[]
}

interface ActivityEvent {
  id: string
  actor?: string
  action: string
  candidate_name?: string
  job_title?: string
  occurred_at?: string
  created_at?: string
  title?: string
  body?: string
}

interface Candidate {
  id: string
  name?: string
  first_name?: string | null
  last_name?: string | null
  email?: string
  role?: string
  stage?: Stage
  ai_score?: number
  source?: string
  days_in_stage?: number
  avatar_initial?: string
}

function dashCandidateName(c: Candidate): string {
  return c.name ?? (`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email ?? 'Candidate'))
}

function dashCandidateInitial(c: Candidate): string {
  if (c.avatar_initial) return c.avatar_initial
  return (dashCandidateName(c).charAt(0) || '?').toUpperCase()
}

type Translate = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string | undefined, t: Translate): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [topCandidates, setTopCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/dashboard_stats').catch(() => null),
      http.get('/api/notifications').catch(() => null),
      http.get('/api/candidates').catch(() => null),
    ])
      .then(([sRes, aRes, cRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<DashboardStats>(sRes))
        setActivity(unwrapList<ActivityEvent>(aRes).slice(0, 6))
        const candidates = unwrapList<Candidate>(cRes)
        setTopCandidates(
          [...candidates].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, 5),
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

  if (loading)
    return (
      <div data-mol-id="page-dashboard" className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  const safeStats: Required<
    Pick<DashboardStats, 'open_jobs' | 'active_candidates' | 'interviews_this_week' | 'hires_mtd'>
  > & { funnel: { stage: string; count: number; color: string }[] } = {
    open_jobs: stats?.open_jobs ?? 0,
    active_candidates: stats?.active_candidates ?? 0,
    interviews_this_week: stats?.interviews_this_week ?? 0,
    hires_mtd: stats?.hires_mtd ?? 0,
    funnel: stats?.funnel ?? [],
  }

  return (
    <div
      data-mol-id="page-dashboard"
      className={cm.cn(cm.sp('py', 8), cm.stack(8), 'px-4 md:px-8')}
    >
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('status.thisWeek', {}, { defaultValue: 'This week' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Hiring Overview' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Pipeline health, interview load, and offers in motion.' },
            )}
          </p>
        </div>
        <Link
          to="/jobs/new"
          data-mol-id="dashboard-post-job"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            add
          </span>
          {t('dashboard.newJobCta', {}, { defaultValue: 'Post a job' })}
        </Link>
      </header>

      {error ? (
        <div
          data-mol-id="dashboard-error"
          className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'rounded-md bg-error/10 text-error')}
        >
          {error}
        </div>
      ) : null}
      <div className={cm.cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4')}>
        <KpiTile
          icon="work"
          label={t('dashboard.kpi.openJobs', {}, { defaultValue: 'Open jobs' })}
          value={safeStats.open_jobs}
        />
        <KpiTile
          icon="group"
          label={t('dashboard.kpi.candidates', {}, { defaultValue: 'Active candidates' })}
          value={safeStats.active_candidates}
        />
        <KpiTile
          icon="event"
          label={t('dashboard.kpi.interviews', {}, { defaultValue: 'Interviews this week' })}
          value={safeStats.interviews_this_week}
        />
        <KpiTile
          icon="celebration"
          label={t('dashboard.kpi.hires', {}, { defaultValue: 'Hires MTD' })}
          value={safeStats.hires_mtd}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <div className={cm.cn('lg:col-span-7')}>
          <PipelineFunnelHero
            title={t('dashboard.funnelTitle', {}, { defaultValue: 'Pipeline funnel' })}
            subtitle={t(
              'dashboard.funnelSubtitle',
              {},
              { defaultValue: 'Active candidates by stage' },
            )}
            funnel={safeStats.funnel}
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
                'text-primary hover:text-primary-container transition-colors py-2',
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
              {activity.map((ev) => {
                const ts = ev.occurred_at ?? ev.created_at
                return (
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
                        'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary material-symbols-outlined text-[18px] shrink-0',
                      )}
                      aria-hidden="true"
                    >
                      bolt
                    </span>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                        <span className={cm.fontWeight('semibold')}>{ev.actor ?? 'system'}</span>{' '}
                        {ev.action}
                      </p>
                      {ev.candidate_name ? (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {ev.candidate_name}
                          {ev.job_title ? ` · ${ev.job_title}` : ''}
                        </p>
                      ) : null}
                      <p
                        className={cm.cn(
                          cm.sp('mt', 1),
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {fmtRelative(ts, t)}
                      </p>
                    </div>
                  </li>
                )
              })}
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
              {t('dashboard.topEyebrow', {}, { defaultValue: 'Top AI matches' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('dashboard.topHeading', {}, { defaultValue: 'Candidates worth a look today' })}
            </h2>
          </div>
          <Link
            to="/candidates"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:text-primary-container transition-colors py-2',
            )}
          >
            {t('dashboard.viewAllCandidates', {}, { defaultValue: 'All candidates →' })}
          </Link>
        </header>
        {topCandidates.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('dashboard.topEmpty', {}, { defaultValue: 'No candidates yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {topCandidates.map((c) => (
              <li
                key={c.id}
                className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary',
                    cm.fontWeight('bold'),
                    cm.shrink0,
                  )}
                >
                  {dashCandidateInitial(c)}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <Link
                    to={`/candidates/${c.id}`}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface hover:text-primary transition-colors',
                    )}
                  >
                    {dashCandidateName(c)}
                  </Link>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {c.role ?? ''}
                    {c.role && c.source ? ' \u00B7 ' : ''}
                    {c.source ?? ''}
                  </p>
                </div>
                <StagePill stage={c.stage ?? 'sourced'} />
                <ScoreBadge score={c.ai_score ?? 0} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
