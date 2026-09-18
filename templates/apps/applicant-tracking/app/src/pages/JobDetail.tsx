import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiTile } from '../components/KpiTile.js'
import { ScoreBadge } from '../components/ScoreBadge.js'
import type { Stage } from '../components/StagePill.js'
import { StagePill } from '../components/StagePill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Job {
  id: string
  title: string
  department?: string | null
  location?: string | null
  status: 'open' | 'filled' | 'paused' | 'closed' | 'draft'
  description?: string | null
  requirements?: string | null
  type?: string | null
  salary_min?: number | null
  salary_max?: number | null
  applicants_count?: number
  days_open?: number
  by_stage?: Partial<Record<Exclude<Stage, 'rejected'>, number>>
}

interface Candidate {
  id: string
  name?: string
  first_name?: string | null
  last_name?: string | null
  role?: string
  job_id?: string
  job_title?: string
  email?: string
  stage?: Stage
  ai_score?: number
  source?: string
  days_in_stage?: number
  applied_at?: string
  avatar_initial?: string
  activity?: { id: string; occurred_at: string; actor: string; action: string }[]
}

function candidateName(c: Candidate): string {
  return c.name ?? (`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email ?? ''))
}

function candidateInitial(c: Candidate): string {
  if (c.avatar_initial) return c.avatar_initial
  const name = candidateName(c)
  return (name.charAt(0) || '?').toUpperCase()
}

const STAGE_ORDER: Exclude<Stage, 'rejected'>[] = [
  'sourced',
  'screening',
  'interview',
  'offer',
  'hired',
]

const STATUS_TONE: Record<string, string> = {
  open: 'bg-success/15 text-success',
  filled: 'bg-info/15 text-info',
  paused: 'bg-warning/15 text-warning',
  closed: 'bg-surface-container text-on-surface-variant',
  draft: 'bg-surface-container text-on-surface-variant',
}

type Translate = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string, t: Translate): string {
  const date = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

export function JobDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/jobs/${id}`), http.get('/api/candidates')])
      .then(([jobRes, candsRes]) => {
        if (cancelled) return
        const found = unwrapSingle<Job>(jobRes)
        setJob(found)
        const allCandidates = unwrapList<Candidate>(candsRes)
        setCandidates(allCandidates.filter((c) => c.job_id === id))
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : ''
        setError(message || t('jobDetail.loadError', {}, { defaultValue: 'Failed to load job.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const topApplicants = useMemo(
    () => [...candidates].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, 6),
    [candidates],
  )

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !job)
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-on-surface-variant')}>
          {error ??
            t('jobDetail.unavailable', {}, { defaultValue: 'This job is no longer listed.' })}
        </p>
        <Link
          to="/jobs"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:text-primary-container transition-colors',
          )}
        >
          ← {t('jobDetail.back', {}, { defaultValue: 'All jobs' })}
        </Link>
      </div>
    )

  const totalApplicants = job.applicants_count ?? candidates.length
  const byStage = job.by_stage ?? {}
  const maxStageCount = Math.max(...STAGE_ORDER.map((s) => byStage[s] ?? 0), 1)

  return (
    <div
      data-mol-id="page-job-detail"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}
    >
      <Link
        to="/jobs"
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-primary hover:text-primary-container transition-colors',
        )}
      >
        ← {t('jobDetail.back', {}, { defaultValue: 'All jobs' })}
      </Link>

      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {job.department ?? '\u2014'}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {job.title}
          </h1>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              'flex flex-wrap items-center gap-3 text-sm font-medium text-on-surface-variant',
            )}
          >
            <span className={cm.cn('inline-flex items-center gap-1')}>
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                place
              </span>
              {job.location ?? '\u2014'}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'rounded-full text-[10px] font-black uppercase tracking-widest',
                STATUS_TONE[job.status as Job['status']] ??
                  'bg-surface-container text-on-surface-variant',
              )}
            >
              {t(`jobDetail.status.${job.status}`, {}, { defaultValue: job.status })}
            </span>
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/pipeline"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('jobDetail.viewPipeline', {}, { defaultValue: 'Open pipeline →' })}
          </Link>
          <Link
            to={`/candidates?job=${job.id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20',
            )}
          >
            {t('jobDetail.viewCandidatesCta', {}, { defaultValue: 'View candidates' })}
          </Link>
        </div>
      </header>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <KpiTile
          icon="group"
          label={t('jobDetail.kpi.applicants', {}, { defaultValue: 'Applicants' })}
          value={totalApplicants}
        />
        <KpiTile
          icon="schedule"
          label={t('jobDetail.kpi.daysOpen', {}, { defaultValue: 'Days open' })}
          value={job.days_open ?? 0}
        />
        <KpiTile
          icon="trending_up"
          label={t('jobDetail.kpi.inInterview', {}, { defaultValue: 'In interview' })}
          value={byStage.interview ?? 0}
        />
        <KpiTile
          icon="celebration"
          label={t('jobDetail.kpi.hires', {}, { defaultValue: 'Hires' })}
          value={byStage.hired ?? 0}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            'lg:col-span-7',
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('jobDetail.descriptionEyebrow', {}, { defaultValue: 'Role description' })}
          </p>
          <h2
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('jobDetail.aboutHeading', {}, { defaultValue: 'About this role' })}
          </h2>
          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.stack(4),
              cm.textSize('sm'),
              'leading-relaxed text-on-surface-variant',
            )}
          >
            {job.description?.trim() ? (
              job.description.split(/\n{2,}/).map((para, idx) => (
                <p key={idx} className={cm.cn('whitespace-pre-line')}>
                  {para.trim()}
                </p>
              ))
            ) : (
              <p className={cm.cn('italic')}>
                {t(
                  'jobDetail.descriptionMissing',
                  {},
                  { defaultValue: 'No description provided yet.' },
                )}
              </p>
            )}
            {job.salary_min || job.salary_max ? (
              <p data-mol-id="job-detail-salary">
                {t(
                  'jobDetail.salary',
                  {
                    min: job.salary_min ? `$${job.salary_min.toLocaleString()}` : '',
                    max: job.salary_max ? `$${job.salary_max.toLocaleString()}` : '',
                  },
                  { defaultValue: 'Salary: {{min}} – {{max}}' },
                )}
              </p>
            ) : null}
            {job.type ? (
              <p data-mol-id="job-detail-type">
                {t(
                  'jobDetail.employmentType',
                  { type: job.type },
                  { defaultValue: 'Employment type: {{type}}' },
                )}
              </p>
            ) : null}
            {job.requirements?.trim() ? (
              <>
                <h3
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface',
                  )}
                >
                  {t('jobDetail.requirementsHeading', {}, { defaultValue: 'Requirements' })}
                </h3>
                <ul
                  data-mol-id="job-detail-requirements"
                  className={cm.cn('list-disc pl-5 space-y-1')}
                >
                  {job.requirements
                    .split(/\n+/)
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>

        <aside className={cm.cn('lg:col-span-5 space-y-6')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('jobDetail.funnelEyebrow', {}, { defaultValue: 'Stage funnel' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('jobDetail.funnelHeading', {}, { defaultValue: 'Where applicants stand' })}
            </h2>
            <ul className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              {STAGE_ORDER.map((stage) => {
                const count = byStage[stage] ?? 0
                return (
                  <li key={stage}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('mb', 1),
                      )}
                    >
                      <StagePill stage={stage} size="xs" />
                      <span className={cm.cn('text-sm font-bold tabular-nums text-on-surface')}>
                        {count}
                      </span>
                    </div>
                    <div
                      className={cm.cn('h-1.5 overflow-hidden rounded-full bg-surface-container')}
                    >
                      <div
                        className={cm.cn('h-full rounded-full')}
                        style={{
                          width: `${(count / maxStageCount) * 100}%`,
                          backgroundColor: `var(--color-stage-${stage})`,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <header
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('jobDetail.topEyebrow', {}, { defaultValue: 'Top applicants' })}
                </p>
                <h2 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface')}>
                  {t('jobDetail.topHeading', {}, { defaultValue: 'AI-matched first' })}
                </h2>
              </div>
              <Link
                to="/candidates"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:text-primary-container transition-colors',
                )}
              >
                {t('jobDetail.viewAll', {}, { defaultValue: 'All →' })}
              </Link>
            </header>
            {topApplicants.length === 0 ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t('jobDetail.empty', {}, { defaultValue: 'No applicants yet.' })}
              </p>
            ) : (
              <ul className={cm.cn('divide-y divide-outline-variant/20')}>
                {topApplicants.map((c) => (
                  <li
                    key={c.id}
                    className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'sm' }))}
                  >
                    <span
                      className={cm.cn(
                        'h-9 w-9 grid place-items-center rounded-full bg-primary/10 text-primary font-bold shrink-0',
                      )}
                    >
                      {candidateInitial(c)}
                    </span>
                    <Link
                      to={`/candidates/${c.id}`}
                      className={cm.cn(
                        'min-w-0 flex-1 text-sm font-semibold text-on-surface hover:text-primary truncate',
                      )}
                    >
                      {candidateName(c)}
                    </Link>
                    <ScoreBadge score={c.ai_score ?? 0} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
        </p>
        <h2
          className={cm.cn(
            cm.sp('mt', 1),
            cm.sp('mb', 4),
            cm.textSize('lg'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('jobDetail.activityHeading', {}, { defaultValue: 'Pipeline events' })}
        </h2>
        {candidates.flatMap((c) =>
          (c.activity ?? []).map((ev) => ({ ...ev, candidate: candidateName(c) })),
        ).length === 0 ? (
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t('jobDetail.activityEmpty', {}, { defaultValue: 'No activity yet.' })}
          </p>
        ) : (
          <ol className={cm.stack(3)}>
            {candidates
              .flatMap((c) =>
                (c.activity ?? []).map((ev) => ({ ...ev, candidate: candidateName(c) })),
              )
              .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
              .slice(0, 6)
              .map((ev) => (
                <li
                  key={`${ev.candidate}-${ev.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('p', 3),
                    'rounded-xl hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary material-symbols-outlined text-[18px] shrink-0',
                    )}
                  >
                    history
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.cn('text-sm text-on-surface')}>
                      <span className={cm.cn('font-semibold')}>{ev.actor}</span> {ev.action}
                    </p>
                    <p className={cm.cn('text-xs text-on-surface-variant')}>{ev.candidate}</p>
                  </div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {fmtRelative(ev.occurred_at, t)}
                  </p>
                </li>
              ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export default JobDetail
