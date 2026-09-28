import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ScoreBadge } from '../components/ScoreBadge.js'
import type { Stage } from '../components/StagePill.js'
import { unwrapList } from '../lib/unwrap.js'

interface Candidate {
  id: string
  name?: string
  first_name?: string | null
  last_name?: string | null
  email?: string
  role?: string
  job_title?: string
  stage?: Stage
  ai_score?: number
  source?: string
  days_in_stage?: number
  avatar_initial?: string
}

function candidateName(c: Candidate): string {
  return c.name ?? (`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email ?? 'Candidate'))
}

function candidateInitial(c: Candidate): string {
  if (c.avatar_initial) return c.avatar_initial
  return (candidateName(c).charAt(0) || '?').toUpperCase()
}

const VISIBLE_STAGES: Exclude<Stage, 'rejected'>[] = [
  'sourced',
  'screening',
  'interview',
  'offer',
  'hired',
]

/** The next stage in the funnel, or null when already hired. */
function nextStageOf(stage: Stage): Stage | null {
  const idx = VISIBLE_STAGES.indexOf(stage as (typeof VISIBLE_STAGES)[number])
  if (idx < 0 || idx >= VISIBLE_STAGES.length - 1) return null
  return VISIBLE_STAGES[idx + 1] ?? null
}

const STAGE_LABEL_DEFAULT: Record<Stage, string> = {
  sourced: 'Sourced',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

const STAGE_FG: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced)',
  screening: 'var(--color-stage-screening)',
  interview: 'var(--color-stage-interview)',
  offer: 'var(--color-stage-offer)',
  hired: 'var(--color-stage-hired)',
  rejected: 'var(--color-stage-rejected)',
}

const STAGE_BG: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced-bg)',
  screening: 'var(--color-stage-screening-bg)',
  interview: 'var(--color-stage-interview-bg)',
  offer: 'var(--color-stage-offer-bg)',
  hired: 'var(--color-stage-hired-bg)',
  rejected: 'var(--color-stage-rejected-bg)',
}

export function Pipeline() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filterJob, setFilterJob] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)

  const moveCandidate = useCallback(
    async (candidateId: string, nextStage: Stage) => {
      setMoveError(null)
      let fromStage: Stage | undefined
      setCandidates((current) => {
        const target = current.find((c) => c.id === candidateId)
        if (!target || target.stage === nextStage) return current
        fromStage = target.stage
        return current.map((c) =>
          c.id === candidateId ? { ...c, stage: nextStage, days_in_stage: 0 } : c,
        )
      })
      try {
        await http.put(`/api/candidates/${candidateId}`, { stage: nextStage })
        track({
          name: 'application.status_changed',
          properties: { candidate_id: candidateId, from: fromStage, to: nextStage },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        setMoveError(
          message ||
            t(
              'pipeline.moveError',
              {},
              { defaultValue: 'Could not save the new stage. Reload to see the latest.' },
            ),
        )
        const refreshed = await http.get('/api/candidates').catch(() => null)
        setCandidates(unwrapList<Candidate>(refreshed))
      }
    },
    [http, t],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/candidates')
      .then((res) => {
        if (!cancelled) setCandidates(unwrapList<Candidate>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('pipeline.loadError', {}, { defaultValue: 'Failed to load pipeline.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const jobOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { id: string; title: string }[] = []
    candidates.forEach((c) => {
      const role = c.role ?? ''
      const title = c.job_title ?? c.role ?? ''
      if (!title) return
      const id = `${role}::${title}`
      if (seen.has(id)) return
      seen.add(id)
      opts.push({ id, title })
    })
    return opts
  }, [candidates])

  const filtered =
    filterJob === 'all'
      ? candidates
      : candidates.filter((c) => `${c.role ?? ''}::${c.job_title ?? c.role ?? ''}` === filterJob)

  if (loading)
    return (
      <div data-mol-id="page-pipeline" className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error)
    return (
      <div data-mol-id="page-pipeline" className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error}
      </div>
    )

  return (
    <div data-mol-id="page-pipeline" className={cm.cn(cm.sp('py', 8), cm.stack(8), 'px-4 md:px-8')}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('pipeline.eyebrow', {}, { defaultValue: 'Hiring board' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('pipeline.heading', {}, { defaultValue: 'Pipeline' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'pipeline.subheading',
              {},
              {
                defaultValue:
                  'Drag candidates between stages. AI score and days-in-stage shown on each card.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <label className="sr-only" htmlFor="pipeline-job-filter">
            {t('pipeline.jobFilterLabel', {}, { defaultValue: 'Filter by role' })}
          </label>
          <select
            id="pipeline-job-filter"
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface',
            )}
          >
            <option value="all">{t('pipeline.allRoles', {}, { defaultValue: 'All roles' })}</option>
            {jobOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          <Link
            to="/candidates"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('pipeline.viewTable', {}, { defaultValue: 'Table view →' })}
          </Link>
        </div>
      </header>

      {moveError ? (
        <p
          role="alert"
          aria-live="assertive"
          data-mol-id="pipeline-move-error"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {moveError}
        </p>
      ) : null}

      <div
        data-mol-id="pipeline-board"
        className={cm.cn('grid gap-4 md:grid-cols-2 lg:grid-cols-5')}
      >
        {VISIBLE_STAGES.map((stage) => {
          const stageCandidates = filtered.filter((c) => (c.stage ?? 'sourced') === stage)
          const isDropTarget = dragOverStage === stage
          return (
            <section
              key={stage}
              data-mol-id={`pipeline-column-${stage}`}
              data-drop-target={isDropTarget ? 'true' : undefined}
              onDragOver={(e) => {
                if (!draggingId) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverStage(stage)
              }}
              onDragLeave={(e) => {
                const related = e.relatedTarget as Node | null
                if (related && (e.currentTarget as Node).contains(related)) return
                setDragOverStage((prev) => (prev === stage ? null : prev))
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/candidate-id') || draggingId
                setDragOverStage(null)
                setDraggingId(null)
                if (id) void moveCandidate(id, stage)
              }}
              className={cm.cn(
                'rounded-2xl border border-outline-variant/20 bg-surface-container-low overflow-hidden flex flex-col min-h-[160px] md:min-h-[400px]',
                isDropTarget && 'ring-2 ring-primary/40',
              )}
              style={{ borderTopColor: STAGE_FG[stage], borderTopWidth: '4px' }}
            >
              <header
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'border-b border-outline-variant/20 bg-surface-container-lowest',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn('h-2 w-2 rounded-full')}
                    style={{ backgroundColor: STAGE_FG[stage] }}
                    aria-hidden="true"
                  />
                  <h2
                    className={cm.cn(
                      'text-[11px] font-black uppercase tracking-widest text-on-surface',
                    )}
                  >
                    {t(`pipeline.stage.${stage}`, {}, { defaultValue: STAGE_LABEL_DEFAULT[stage] })}
                  </h2>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    'py-0.5 rounded-full text-[10px] font-black tabular-nums tracking-widest',
                  )}
                  style={{ backgroundColor: STAGE_BG[stage], color: STAGE_FG[stage] }}
                >
                  {stageCandidates.length}
                </span>
              </header>
              <ul className={cm.cn(cm.sp('p', 3), cm.stack(3), 'flex-1')}>
                {stageCandidates.length === 0 ? (
                  <li
                    className={cm.cn(
                      cm.sp('py', 8),
                      cm.textCenter,
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('pipeline.empty', {}, { defaultValue: 'No candidates' })}
                  </li>
                ) : (
                  stageCandidates.map((c) => (
                    <li
                      key={c.id}
                      data-mol-id={`pipeline-card-${stage}`}
                      data-candidate-id={c.id}
                      data-candidate-stage={c.stage ?? 'sourced'}
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(c.id)
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/candidate-id', c.id)
                      }}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setDragOverStage(null)
                      }}
                      className={cm.cn(draggingId === c.id && 'opacity-50')}
                    >
                      <Link
                        to={`/candidates/${c.id}`}
                        className={cm.cn(
                          cm.sp('p', 4),
                          cm.accentCard({ tone: 'custom' }),
                          'block rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-grab active:cursor-grabbing',
                        )}
                        style={{ ['--mol-accent' as string]: STAGE_FG[stage] }}
                      >
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <span
                            className={cm.cn(
                              'h-9 w-9 grid place-items-center rounded-full font-black text-sm shrink-0',
                            )}
                            style={{ backgroundColor: STAGE_BG[stage], color: STAGE_FG[stage] }}
                          >
                            {candidateInitial(c)}
                          </span>
                          <div className={cm.cn('min-w-0 flex-1')}>
                            <p
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.fontWeight('semibold'),
                                'truncate text-on-surface',
                              )}
                            >
                              {candidateName(c)}
                            </p>
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                'truncate text-on-surface-variant',
                              )}
                            >
                              {c.role ?? ''}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cm.cn(
                            cm.sp('mt', 3),
                            cm.flex({ align: 'center', justify: 'between' }),
                          )}
                        >
                          <ScoreBadge score={c.ai_score ?? 0} />
                          <span
                            className={cm.cn(
                              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                            )}
                          >
                            {t(
                              'pipeline.daysInStage',
                              { days: c.days_in_stage ?? 0 },
                              { defaultValue: '{{days}}d' },
                            )}
                          </span>
                        </div>
                      </Link>
                      {/* Touch-friendly stage advance: drag-and-drop does not
                          exist on touch screens, so small screens get a tap
                          target to move the candidate one step forward. */}
                      {nextStageOf(c.stage ?? 'sourced') ? (
                        <button
                          type="button"
                          data-mol-id="pipeline-card-advance"
                          onClick={() => {
                            const next = nextStageOf(c.stage ?? 'sourced')
                            if (next) void moveCandidate(c.id, next)
                          }}
                          className={cm.cn(
                            cm.sp('mt', 2),
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'md:hidden w-full rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container-low min-h-[36px]',
                          )}
                        >
                          {t('pipeline.advanceTo', {}, { defaultValue: 'Advance' })} →{' '}
                          {t(
                            `pipeline.stage.${nextStageOf(c.stage ?? 'sourced')}`,
                            {},
                            {
                              defaultValue:
                                STAGE_LABEL_DEFAULT[nextStageOf(c.stage ?? 'sourced') ?? 'hired'],
                            },
                          )}
                        </button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
