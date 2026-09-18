import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

type Stage = 'sourced' | 'screening' | 'interview' | 'offer' | 'hired'

interface Interview {
  id: string
  scheduled_at: string
  panel: string[]
  outcome: 'scheduled' | 'completed' | 'no_show'
  notes?: string
  score?: number
}

interface ActivityEvent {
  id: string
  occurred_at: string
  actor: string
  action: string
}

interface CandidateDetail {
  id: string
  name?: string
  first_name?: string | null
  last_name?: string | null
  role?: string
  job_title?: string
  job_id?: string
  email?: string
  phone?: string
  location?: string
  stage?: Stage
  // numeric(5,2) serialises to string from PG; tolerate both shapes.
  ai_score?: number | string
  ai_breakdown?: { criterion: string; score: number; comment: string }[]
  resume_summary?: string[]
  source?: string
  applied_at?: string
  created_at?: string
  interviews?: Interview[]
  activity?: ActivityEvent[]
  notes?: string[]
}

function candidateName(c: CandidateDetail): string {
  return c.name ?? (`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email ?? 'Candidate'))
}

const STAGES: Stage[] = ['sourced', 'screening', 'interview', 'offer', 'hired']

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-error'
}

const STAGE_FG: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced)',
  screening: 'var(--color-stage-screening)',
  interview: 'var(--color-stage-interview)',
  offer: 'var(--color-stage-offer)',
  hired: 'var(--color-stage-hired)',
}

const STAGE_BG: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced-bg)',
  screening: 'var(--color-stage-screening-bg)',
  interview: 'var(--color-stage-interview-bg)',
  offer: 'var(--color-stage-offer-bg)',
  hired: 'var(--color-stage-hired-bg)',
}

const STAGE_DEFAULT_LABEL: Record<Stage, string> = {
  sourced: 'Sourced',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

const OUTCOME_DEFAULT_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  no_show: 'No-show',
}

const TABS = ['overview', 'resume', 'interviews', 'notes'] as const
type Tab = (typeof TABS)[number]

export function CandidateDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [scheduledInterviews, setScheduledInterviews] = useState<Interview[]>([])
  const [interviewWhen, setInterviewWhen] = useState<string>(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 24)
    return d.toISOString().slice(0, 16)
  })
  const [interviewMinutes, setInterviewMinutes] = useState<number>(45)
  const [interviewer, setInterviewer] = useState<string>('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  function refreshInterviews(candidateId: string) {
    return http
      .get(`/api/interviews?candidate_id=${candidateId}`)
      .then((res) => {
        const list = Array.isArray(res) ? res : ((res as { data?: unknown })?.data ?? [])
        setScheduledInterviews((Array.isArray(list) ? list : []) as Interview[])
      })
      .catch(() => setScheduledInterviews([]))
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/candidates/${id}`)
      .then((res) => {
        if (!cancelled) setCandidate(unwrapSingle<CandidateDetail>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('candidateDetail.loadError', {}, { defaultValue: 'Failed to load candidate.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    void refreshInterviews(id)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id, t]) // refreshInterviews intentionally omitted — it is defined inside the effect and changes each render

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!candidate) return
    if (!interviewWhen) {
      setScheduleError(
        t('candidateDetail.scheduleMissing', {}, { defaultValue: 'Pick a date and time first.' }),
      )
      return
    }
    setScheduling(true)
    setScheduleError(null)
    try {
      const payload: Record<string, unknown> = {
        candidate_id: candidate.id,
        scheduled_at: new Date(interviewWhen).toISOString(),
        duration_minutes: interviewMinutes,
      }
      if (candidate.job_id) payload.job_id = candidate.job_id
      const interviewerName = interviewer.trim()
      if (interviewerName) payload.notes = `Interviewer: ${interviewerName}`
      await http.post('/api/interviews', payload)
      await refreshInterviews(candidate.id)
      setInterviewer('')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setScheduleError(
        message ||
          t('candidateDetail.scheduleError', {}, { defaultValue: 'Could not schedule interview.' }),
      )
    } finally {
      setScheduling(false)
    }
  }

  function nextStage(current: Stage): Stage | null {
    const idx = STAGES.indexOf(current)
    if (idx < 0 || idx >= STAGES.length - 1) return null
    return STAGES[idx + 1]
  }

  function moveToStage(target: Stage) {
    if (!candidate || advancing) return
    setAdvanceError(null)
    setAdvancing(true)
    const previous = candidate
    setCandidate({ ...candidate, stage: target })
    http
      .put(`/api/candidates/${candidate.id}`, { stage: target })
      .catch(() => {
        setCandidate(previous)
        setAdvanceError(
          t('candidateDetail.advanceError', {}, { defaultValue: 'Could not update stage.' }),
        )
      })
      .finally(() => {
        setAdvancing(false)
      })
  }

  function advance() {
    if (!candidate) return
    const next = nextStage(candidate.stage ?? 'sourced')
    if (!next) {
      setAdvanceError(
        t('candidateDetail.advanceFinal', {}, { defaultValue: 'Already at the final stage.' }),
      )
      return
    }
    moveToStage(next)
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !candidate)
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-on-surface-variant')}>
          {error ??
            t(
              'candidateDetail.unavailable',
              {},
              { defaultValue: 'This candidate is no longer available.' },
            )}
        </p>
        <Link
          to="/candidates"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('candidateDetail.back', {}, { defaultValue: 'All candidates' })}
        </Link>
      </div>
    )

  const name = candidateName(candidate)
  const stage: Stage = candidate.stage ?? 'sourced'
  const aiScore =
    typeof candidate.ai_score === 'number'
      ? candidate.ai_score
      : Number(candidate.ai_score ?? 0) || 0
  const aiBreakdown = candidate.ai_breakdown ?? []
  const resumeSummary = candidate.resume_summary ?? []
  const interviews = scheduledInterviews.length ? scheduledInterviews : (candidate.interviews ?? [])
  const activity = candidate.activity ?? []
  const notes = candidate.notes ?? []
  const appliedAt = candidate.applied_at ?? candidate.created_at ?? new Date().toISOString()

  return (
    <div
      data-mol-id="page-candidate-detail"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
    >
      <Link
        to="/candidates"
        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
      >
        {'\u2190'} {t('candidateDetail.back', {}, { defaultValue: 'All candidates' })}
      </Link>

      <header
        className={cm.cn(
          cm.card(),
          cm.sp('p', 6),
          cm.flex({ align: 'start', justify: 'between' }),
          'flex-wrap gap-4',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <span
            className={cm.cn(
              'h-16 w-16 rounded-full bg-primary-container grid place-items-center text-2xl',
              cm.fontWeight('bold'),
              cm.textPrimary,
            )}
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{name}</h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {candidate.role ?? ''}
              {candidate.role && candidate.job_title ? ' \u00B7 ' : ''}
              {candidate.job_title ?? ''}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {candidate.location ?? ''}
              {candidate.location && candidate.email ? ' \u00B7 ' : ''}
              {candidate.email ?? ''}
            </p>
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
            )}
            style={{ backgroundColor: STAGE_BG[stage], color: STAGE_FG[stage] }}
          >
            {t(`stagePill.${stage}`, {}, { defaultValue: STAGE_DEFAULT_LABEL[stage] })}
          </span>
          <button
            type="button"
            data-mol-id="candidate-advance"
            disabled={advancing || nextStage(stage) === null}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
            onClick={advance}
          >
            {t('candidateDetail.advanceCta', {}, { defaultValue: 'Advance \u2192' })}
          </button>
        </div>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-4')}>
          <div className={cm.cn(cm.card(), 'overflow-hidden')}>
            <nav
              className={cm.cn('flex border-b border-outline-variant')}
              aria-label="Candidate tabs"
            >
              {TABS.map((tk) => (
                <button
                  key={tk}
                  type="button"
                  onClick={() => setTab(tk)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'border-b-2',
                    tab === tk
                      ? cm.cn('border-primary', cm.textPrimary)
                      : cm.cn(
                          'border-transparent',
                          'text-on-surface-variant',
                          'hover:text-on-surface',
                        ),
                  )}
                >
                  {t(
                    `candidateDetail.tab.${tk}`,
                    {},
                    { defaultValue: tk.charAt(0).toUpperCase() + tk.slice(1) },
                  )}
                </button>
              ))}
            </nav>

            {tab === 'overview' && (
              <div className={cm.cn(cm.sp('p', 6), 'space-y-4')}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'candidateDetail.appliedOn',
                    { date: fmtDate(appliedAt), source: candidate.source ?? '' },
                    { defaultValue: 'Applied {{date}} via {{source}}.' },
                  )}
                </p>
                <h3 className={cm.fontWeight('semibold')}>
                  {t('form.summary', {}, { defaultValue: 'Summary' })}
                </h3>
                {resumeSummary.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'candidateDetail.summaryEmpty',
                      {},
                      { defaultValue: 'No resume summary on file.' },
                    )}
                  </p>
                ) : (
                  <ul className={cm.cn('space-y-1 text-sm list-disc pl-5')}>
                    {resumeSummary.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {tab === 'resume' && (
              <div className={cm.cn(cm.sp('p', 6), cm.textSize('sm'))}>
                <p className={'text-on-surface-variant'}>
                  {t(
                    'candidateDetail.resumeMissing',
                    {},
                    { defaultValue: 'No resume preview available for this candidate yet.' },
                  )}
                </p>
              </div>
            )}
            {tab === 'interviews' && (
              <div className={cm.cn(cm.sp('p', 6), 'space-y-4')}>
                <form
                  onSubmit={handleSchedule}
                  data-mol-id="candidate-schedule-form"
                  className={cm.cn(
                    cm.sp('p', 4),
                    'border border-outline-variant rounded-md space-y-3',
                  )}
                >
                  <h3 className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {t(
                      'candidateDetail.scheduleHeading',
                      {},
                      { defaultValue: 'Schedule interview' },
                    )}
                  </h3>
                  {scheduleError ? (
                    <p
                      role="alert"
                      data-mol-id="candidate-schedule-error"
                      className={cm.cn(cm.textSize('xs'), 'text-error')}
                    >
                      {scheduleError}
                    </p>
                  ) : null}
                  <div className={cm.grid({ cols: 3, gap: 'sm' })}>
                    <label
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.flex({ direction: 'col', gap: 'xs' }),
                      )}
                    >
                      {t('form.when', {}, { defaultValue: 'When' })}
                      <input
                        type="datetime-local"
                        value={interviewWhen}
                        onChange={(e) => setInterviewWhen(e.target.value)}
                        data-mol-id="candidate-schedule-when"
                        required
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-md bg-surface-container-lowest',
                        )}
                      />
                    </label>
                    <label
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.flex({ direction: 'col', gap: 'xs' }),
                      )}
                    >
                      {t('candidateDetail.scheduleMinutes', {}, { defaultValue: 'Duration (min)' })}
                      <input
                        type="number"
                        min={15}
                        max={240}
                        step={5}
                        value={interviewMinutes}
                        onChange={(e) => setInterviewMinutes(Number(e.target.value))}
                        data-mol-id="candidate-schedule-minutes"
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-md bg-surface-container-lowest',
                        )}
                      />
                    </label>
                    <label
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.flex({ direction: 'col', gap: 'xs' }),
                      )}
                    >
                      {t(
                        'candidateDetail.scheduleInterviewer',
                        {},
                        { defaultValue: 'Interviewer' },
                      )}
                      <input
                        type="text"
                        value={interviewer}
                        onChange={(e) => setInterviewer(e.target.value)}
                        placeholder={t(
                          'candidateDetail.scheduleInterviewerPlaceholder',
                          {},
                          { defaultValue: 'Interviewer name' },
                        )}
                        data-mol-id="candidate-schedule-interviewer"
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-md bg-surface-container-lowest',
                        )}
                      />
                    </label>
                  </div>
                  <div className={cm.flex({ justify: 'end' })}>
                    <button
                      type="submit"
                      disabled={scheduling}
                      data-mol-id="candidate-schedule-submit"
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'rounded-md bg-primary text-on-primary disabled:opacity-50',
                      )}
                    >
                      {scheduling
                        ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                        : t('nav.schedule', {}, { defaultValue: 'Schedule' })}
                    </button>
                  </div>
                </form>
                {interviews.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('candidateDetail.noInterviews', {}, { defaultValue: 'No interviews yet.' })}
                  </p>
                ) : (
                  interviews.map((iv) => (
                    <div
                      key={iv.id}
                      className={cm.cn(cm.sp('p', 4), 'border border-outline-variant rounded-md')}
                    >
                      <header className={cm.flex({ align: 'center', justify: 'between' })}>
                        <span className={cm.fontWeight('semibold')}>
                          {fmtDateTime(iv.scheduled_at)}
                        </span>
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.roundedFull,
                            iv.outcome === 'completed'
                              ? 'bg-success/15 text-success'
                              : iv.outcome === 'no_show'
                                ? 'bg-error/15 text-error'
                                : 'bg-info/15 text-info',
                          )}
                        >
                          {t(
                            `candidateDetail.outcome.${iv.outcome}`,
                            {},
                            { defaultValue: OUTCOME_DEFAULT_LABEL[iv.outcome] ?? iv.outcome },
                          )}
                        </span>
                      </header>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('mt', 1),
                        )}
                      >
                        {t(
                          'candidateDetail.panel',
                          { panel: (iv.panel ?? []).join(', ') },
                          { defaultValue: 'Panel: {{panel}}' },
                        )}
                      </p>
                      {iv.notes ? (
                        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2))}>{iv.notes}</p>
                      ) : null}
                      {iv.score != null ? (
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.sp('mt', 1),
                            cm.fontWeight('semibold'),
                            'tabular-nums',
                            scoreColor(iv.score),
                          )}
                        >
                          {t(
                            'candidateDetail.panelScore',
                            { score: iv.score },
                            { defaultValue: 'Panel score: {{score}}/100' },
                          )}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            )}
            {tab === 'notes' && (
              <div className={cm.cn(cm.sp('p', 6), 'space-y-2')}>
                {notes.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('candidateDetail.noNotes', {}, { defaultValue: 'No notes yet.' })}
                  </p>
                ) : (
                  notes.map((n, i) => (
                    <p
                      key={i}
                      className={cm.cn(cm.textSize('sm'), 'border-l-2 border-primary pl-3')}
                    >
                      {n}
                    </p>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-4 sticky top-24')}>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2 className={cm.sectionHeading}>
                {t('candidateDetail.scoreHeading', {}, { defaultValue: 'AI score' })}
              </h2>
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  'tabular-nums',
                  scoreColor(aiScore),
                )}
              >
                {aiScore}
              </span>
            </header>
            <ul className={cm.cn('space-y-2')}>
              {aiBreakdown.length === 0 ? (
                <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('candidateDetail.scoreEmpty', {}, { defaultValue: 'Awaiting AI evaluation.' })}
                </li>
              ) : null}
              {aiBreakdown.map((b, i) => (
                <li key={i}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.textSize('sm'),
                    )}
                  >
                    <span>{b.criterion}</span>
                    <span
                      className={cm.cn(
                        'tabular-nums',
                        cm.fontWeight('semibold'),
                        scoreColor(b.score),
                      )}
                    >
                      {b.score}
                    </span>
                  </div>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{b.comment}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
            <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
              {t('nav.activity', {}, { defaultValue: 'Activity' })}
            </h2>
            {activity.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('candidateDetail.activityEmpty', {}, { defaultValue: 'No activity yet.' })}
              </p>
            ) : (
              <ol className={cm.cn('space-y-2 text-sm')}>
                {activity.map((ev) => (
                  <li key={ev.id}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        'tabular-nums',
                      )}
                    >
                      {fmtDateTime(ev.occurred_at)}
                    </p>
                    <p>
                      <span className={cm.fontWeight('semibold')}>{ev.actor}</span>{' '}
                      <span className={'text-on-surface-variant'}>{ev.action}</span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
            <h2 className={cm.sectionHeading}>
              {t('candidateDetail.advanceHeading', {}, { defaultValue: 'Move to stage' })}
            </h2>
            {advanceError ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{advanceError}</p>
            ) : null}
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-mol-id={`candidate-move-${s}`}
                  disabled={s === stage || advancing}
                  onClick={() => moveToStage(s)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    'disabled:opacity-50',
                  )}
                  style={{ backgroundColor: STAGE_BG[s], color: STAGE_FG[s] }}
                >
                  {t(`stagePill.${s}`, {}, { defaultValue: STAGE_DEFAULT_LABEL[s] })}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
