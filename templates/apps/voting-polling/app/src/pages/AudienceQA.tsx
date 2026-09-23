import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { PollStatusPill } from '../components/PollStatusPill.js'
import { QuorumKpiCard } from '../components/QuorumKpiCard.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface QuestionRowData {
  id: string
  poll_id: string
  body: string
  asker_initial?: string | null
  status: 'pending' | 'promoted' | 'answered' | 'hidden'
  asked_at?: string
  vote_count?: number
}

const STATE_TINT: Record<string, { bg: string; fg: string; label: string }> = {
  promoted: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 18%, transparent)',
    fg: 'var(--mol-color-info)',
    label: 'On stage',
  },
  pending: {
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    fg: 'var(--mol-color-warning)',
    label: 'Queued',
  },
  answered: {
    bg: 'color-mix(in srgb, var(--color-on-surface-variant) 15%, transparent)',
    fg: 'var(--color-on-surface-variant)',
    label: 'Answered',
  },
  hidden: {
    bg: 'color-mix(in srgb, var(--mol-color-error) 12%, transparent)',
    fg: 'var(--mol-color-error)',
    label: 'Hidden',
  },
}

function timeAgo(iso?: string, now = Date.now()): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

export function AudienceQA() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [questions, setQuestions] = useState<QuestionRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [askText, setAskText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const res = await http.get<QuestionRowData[]>(`/api/audience_questions/poll/${id}`)
      const list = (res.data as QuestionRowData[]) ?? []
      setQuestions(Array.isArray(list) ? list : [])
      setError(null)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load Q&A')
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    void refresh()
    const handle = window.setInterval(() => void refresh(), 20000)
    return () => window.clearInterval(handle)
  }, [refresh])

  // Live poll — the API broadcasts vote/poll/question events to the owner-guarded
  // `poll:<id>` room (handlers/{polls,votes,audience_questions}.ts). Join it and
  // refresh on each event so audience questions update instantly instead of only on
  // the slow fallback poll above. Room + event names MUST match the server exactly.
  // The room is owner-guarded, so the socket carries the auth token (lib/realtime.ts).
  useEffect(() => {
    if (!id) return
    const room = `poll:${id}`
    const events = [
      'vote:cast',
      'poll:published',
      'poll:closed',
      'question:asked',
      'question:status',
    ]
    let active = true
    let connection: RealtimeConnection | null = null
    const onEvent = () => {
      void refresh()
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        for (const e of events) conn.on(e, onEvent)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Socket unavailable — the fallback poll keeps questions fresh.
      })
    return () => {
      active = false
      if (connection) {
        for (const e of events) connection.off(e, onEvent)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id, refresh])

  const onStage = useMemo(() => questions.find((q) => q.status === 'promoted') ?? null, [questions])
  const queued = useMemo(() => questions.filter((q) => q.status === 'pending'), [questions])
  const answered = useMemo(() => questions.filter((q) => q.status === 'answered'), [questions])

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!id || submitting || !askText.trim()) return
    setSubmitting(true)
    try {
      await http.post('/api/audience_questions', { poll_id: id, body: askText.trim() })
      track({ name: 'question.asked', properties: { pollId: id } })
      setAskText('')
      await refresh()
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function vote(q: QuestionRowData) {
    setBusy(q.id)
    try {
      const res = await http.post<{ vote_count?: number }>(
        `/api/audience_questions/${q.id}/vote`,
        {},
      )
      const count = (res.data as { vote_count?: number })?.vote_count
      if (typeof count === 'number') {
        setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, vote_count: count } : x)))
      }
    } finally {
      setBusy(null)
    }
  }

  async function changeStatus(q: QuestionRowData, status: QuestionRowData['status']) {
    setBusy(q.id)
    try {
      await http.put(`/api/audience_questions/${q.id}/status`, { status })
      track({ name: `question.${status}`, properties: { pollId: id, questionId: q.id } })
      await refresh()
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message,
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.textSize('xs'),
                'inline-flex min-h-[40px] items-center text-primary hover:underline font-semibold uppercase tracking-wide',
              )}
            >
              ← {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </Link>
            <span className={cm.cn('text-on-surface-variant text-xs')}>/</span>
            <span className={cm.cn('text-xs font-mono text-on-surface-variant')}>
              {t('audienceQa.pollId', { id: id ?? '' }, { defaultValue: 'qa · {{id}}' })}
            </span>
          </div>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('audienceQa.heading', {}, { defaultValue: 'Audience Q&A' })}
          </h1>
          <div
            className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <PollStatusPill status="live" emphasis />
            <span className={cm.cn('text-xs font-semibold text-on-surface-variant')}>
              {t(
                'audienceQa.metaLine',
                { count: questions.length },
                { defaultValue: '{{count}} questions submitted' },
              )}
            </span>
          </div>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
          data-test="qa-error"
        >
          {error}
        </div>
      ) : null}

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="forum"
          tone="primary"
          label={t('audienceQa.kpi.questions', {}, { defaultValue: 'Questions' })}
          value={String(questions.length)}
        />
        <QuorumKpiCard
          icon="thumb_up"
          tone="accent"
          label={t('audienceQa.kpi.upvotes', {}, { defaultValue: 'Upvotes' })}
          value={String(questions.reduce((acc, q) => acc + (q.vote_count ?? 0), 0))}
        />
        <QuorumKpiCard
          icon="visibility"
          tone="warning"
          label={t('status.queued', {}, { defaultValue: 'Queued' })}
          value={String(queued.length)}
        />
        <QuorumKpiCard
          icon="check"
          tone="navy"
          label={t('audienceQa.kpi.answered', {}, { defaultValue: 'Answered' })}
          value={String(answered.length)}
        />
      </div>

      <form
        onSubmit={ask}
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.stack(3),
        )}
        data-test="qa-ask-form"
      >
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('audienceQa.askLabel', {}, { defaultValue: 'Ask a question' })}
        </label>
        <textarea
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          rows={3}
          aria-label={t('audienceQa.askAria', {}, { defaultValue: 'Question text' })}
          placeholder={t(
            'audienceQa.askPlaceholder',
            {},
            { defaultValue: 'What would you like the speaker to address?' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          )}
          data-test="qa-ask-text"
        />
        <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
          <button
            type="submit"
            disabled={submitting || !askText.trim()}
            className={cm.cn(
              'px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50',
            )}
            data-test="qa-ask-submit"
          >
            {submitting
              ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
              : t('audienceQa.ask', {}, { defaultValue: 'Post question' })}
          </button>
        </div>
      </form>

      {onStage ? (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/20 relative overflow-hidden text-on-primary',
          )}
          data-test="qa-on-stage"
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
            )}
          />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-primary/70">
              {t('audienceQa.onStageEyebrow', {}, { defaultValue: 'On stage now' })}
            </p>
            <p
              className={cm.cn(
                cm.sp('mt', 4),
                'text-2xl md:text-3xl font-extrabold leading-snug tracking-tight',
              )}
            >
              “{onStage.body}”
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    'grid h-9 w-9 place-items-center rounded-full bg-surface/20 text-on-primary font-bold',
                  )}
                >
                  {onStage.asker_initial ?? 'A'}
                </span>
                <span className="font-semibold">{onStage.asker_initial ?? 'Anonymous'}</span>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className={cm.cn('text-xs opacity-80')}>{timeAgo(onStage.asked_at)}</span>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    'px-3 py-1 rounded-full bg-surface/15 backdrop-blur-md text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5',
                  )}
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
                    thumb_up
                  </span>
                  <span className="font-mono tabular-nums">{onStage.vote_count ?? 0}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void changeStatus(onStage, 'answered')}
                  disabled={busy === onStage.id}
                  className={cm.cn(
                    'px-4 py-2 rounded-xl bg-surface/95 text-primary font-bold text-sm hover:bg-surface disabled:opacity-50 transition-colors',
                  )}
                  data-test="qa-mark-answered"
                >
                  {t('audienceQa.markAnswered', {}, { defaultValue: 'Mark answered' })}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <p className="text-sm text-on-surface-variant" data-test="qa-loading">
          {t('audienceQa.loading', {}, { defaultValue: 'Loading questions…' })}
        </p>
      ) : (
        <div className={cm.cn('grid gap-6 lg:grid-cols-2')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
            data-test="qa-queue"
          >
            <header
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('audienceQa.queueEyebrow', {}, { defaultValue: 'Queue' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface mt-1',
                  )}
                >
                  {t('status.upNext', {}, { defaultValue: 'Up next' })}
                </h2>
              </div>
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full bg-warning/15 text-warning text-[10px] font-black uppercase tracking-widest',
                )}
              >
                {queued.length} {t('audienceQa.queued', {}, { defaultValue: 'queued' })}
              </span>
            </header>
            {queued.length === 0 ? (
              <p className="text-xs text-on-surface-variant" data-test="qa-queue-empty">
                {t('audienceQa.noPending', {}, { defaultValue: 'No pending questions yet.' })}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {queued.map((q) => (
                  <Row
                    key={q.id}
                    q={q}
                    busy={busy === q.id}
                    onVote={() => void vote(q)}
                    onPromote={() => void changeStatus(q, 'promoted')}
                    onAnswer={() => void changeStatus(q, 'answered')}
                    onHide={() => void changeStatus(q, 'hidden')}
                  />
                ))}
              </ul>
            )}
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
            data-test="qa-answered"
          >
            <header className={cm.sp('mb', 4)}>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('audienceQa.answeredEyebrow', {}, { defaultValue: 'Answered' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface mt-1',
                )}
              >
                {t('audienceQa.answeredHeading', {}, { defaultValue: 'Already addressed' })}
              </h2>
            </header>
            {answered.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                {t('audienceQa.noAnswered', {}, { defaultValue: 'No answered questions yet.' })}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {answered.map((q) => (
                  <Row key={q.id} q={q} busy={busy === q.id} onVote={() => void vote(q)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function Row({
  q,
  busy,
  onVote,
  onPromote,
  onAnswer,
  onHide,
}: {
  q: QuestionRowData
  busy: boolean
  onVote: () => void
  onPromote?: () => void
  onAnswer?: () => void
  onHide?: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = STATE_TINT[q.status] ?? STATE_TINT.pending
  return (
    <li
      className={cm.cn(
        cm.sp('p', 4),
        'rounded-xl border border-outline-variant/20 hover:bg-surface-container-low transition-colors',
      )}
      data-test={`qa-row-${q.id}`}
    >
      <div className={cm.flex({ align: 'start', gap: 'sm' })}>
        <span
          className={cm.cn(
            'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0',
          )}
        >
          {q.asker_initial ?? 'A'}
        </span>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p className={cm.cn('text-sm font-semibold text-on-surface')}>“{q.body}”</p>
          <p className={cm.cn('mt-1 text-xs text-on-surface-variant')}>{timeAgo(q.asked_at)}</p>
          <div className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={onVote}
              disabled={busy}
              className={cm.cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold disabled:opacity-50',
              )}
              data-test={`qa-upvote-${q.id}`}
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                thumb_up
              </span>
              <span className="font-mono tabular-nums">{q.vote_count ?? 0}</span>
            </button>
            {onPromote ? (
              <button
                type="button"
                onClick={onPromote}
                disabled={busy}
                className={cm.cn(
                  'text-xs font-bold text-primary hover:underline disabled:opacity-50',
                )}
                data-test={`qa-promote-${q.id}`}
              >
                {/* moderator promotes question to on-stage */}
                {t('audienceQa.promote', {}, { defaultValue: 'Promote' })}
              </button>
            ) : null}
            {onAnswer ? (
              <button
                type="button"
                onClick={onAnswer}
                disabled={busy}
                className={cm.cn(
                  'text-xs font-bold text-success hover:underline disabled:opacity-50',
                )}
                data-test={`qa-answer-${q.id}`}
              >
                {t('audienceQa.answerAction', {}, { defaultValue: 'Answer' })}
              </button>
            ) : null}
            {onHide ? (
              <button
                type="button"
                onClick={onHide}
                disabled={busy}
                className={cm.cn(
                  'text-xs font-bold text-error hover:underline disabled:opacity-50',
                )}
                data-test={`qa-hide-${q.id}`}
              >
                {t('audienceQa.hide', {}, { defaultValue: 'Hide' })}
              </button>
            ) : null}
          </div>
        </div>
        <div className={cm.flex({ direction: 'col', align: 'end', gap: 'sm' })}>
          <span
            className={cm.cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
            )}
            style={{ backgroundColor: tint.bg, color: tint.fg }}
          >
            {t(`audienceQa.state.${q.status}`, {}, { defaultValue: tint.label })}
          </span>
        </div>
      </div>
    </li>
  )
}
