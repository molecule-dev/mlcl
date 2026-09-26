import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { LiveResultsHero } from '../components/LiveResultsHero.js'
import { ParticipationSparkline } from '../components/ParticipationSparkline.js'
import { PollStatusPill } from '../components/PollStatusPill.js'
import { type QuestionType, QuestionTypeBadge } from '../components/QuestionTypeBadge.js'
import { QuorumKpiCard } from '../components/QuorumKpiCard.js'
import { unwrap } from '../lib/api.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface PollRow {
  id: string
  title: string
  type: QuestionType
  status: 'draft' | 'active' | 'closed'
  start_date?: string | null
  end_date?: string | null
  quorum_threshold?: number | null
}

interface ResultsTally {
  poll_id: string
  type: string
  options?: Array<{ label: string; count?: number; score?: number }>
  responses?: Array<{ text?: string; created_at?: string }>
  total_votes: number
}

interface VoteRow {
  id: string
  option_index?: number | null
  selected_options?: number[] | null
  ranked_choices?: number[] | null
  open_text?: string | null
  voter_id?: string | null
  created_at?: string
}

interface TimelineRow {
  bucket?: string
  vote_count?: number | string
}

function statusToPill(status: string): 'live' | 'closed' | 'draft' | 'scheduled' {
  if (status === 'active') return 'live'
  if (status === 'closed') return 'closed'
  if (status === 'draft') return 'draft'
  return 'scheduled'
}

function tallyToOptions(
  tally: ResultsTally | null,
): Array<{ id: string; label: string; votes: number }> {
  if (!tally?.options) return []
  return tally.options.map((o, i) => ({
    id: `o-${i}`,
    label: o.label,
    votes: typeof o.count === 'number' ? o.count : Number(o.score ?? 0),
  }))
}

function timeAgo(iso?: string | null, now = Date.now()): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function LiveResults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [poll, setPoll] = useState<PollRow | null>(null)
  const [tally, setTally] = useState<ResultsTally | null>(null)
  const [recent, setRecent] = useState<VoteRow[]>([])
  const [timeline, setTimeline] = useState<TimelineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const [pollRes, resultsRes, votesRes, timelineRes] = await Promise.allSettled([
        http.get<PollRow>(`/api/polls/${id}`),
        http.get<ResultsTally>(`/api/results/${id}`),
        http.get<VoteRow[]>(`/api/votes/poll/${id}`),
        http.get<TimelineRow[]>(`/api/results/${id}/timeline`),
      ])
      if (pollRes.status === 'fulfilled') {
        setPoll(unwrap<PollRow>(pollRes.value.data) ?? null)
      } else {
        setError(t('liveResults.loadError', {}, { defaultValue: 'Could not load this poll.' }))
      }
      if (resultsRes.status === 'fulfilled') {
        setTally(unwrap<ResultsTally>(resultsRes.value.data) ?? null)
      }
      if (votesRes.status === 'fulfilled') {
        const list = unwrap<VoteRow[]>(votesRes.value.data) ?? []
        setRecent(Array.isArray(list) ? list.slice(0, 6) : [])
      }
      if (timelineRes.status === 'fulfilled') {
        const tl = unwrap<TimelineRow[]>(timelineRes.value.data) ?? []
        setTimeline(Array.isArray(tl) ? tl : [])
      }
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void refresh()
    const handle = window.setInterval(() => void refresh(), 20000)
    return () => window.clearInterval(handle)
  }, [refresh])

  // Live poll — the API broadcasts vote/poll/question events to the owner-guarded
  // `poll:<id>` room (handlers/{polls,votes,audience_questions}.ts). Join it and
  // refresh on each event so results update instantly instead of only on the slow
  // fallback poll above. Room + event names MUST match the server exactly. The room
  // is owner-guarded, so the socket carries the auth token (see lib/realtime.ts).
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
        // Socket unavailable — the fallback poll keeps results fresh.
      })
    return () => {
      active = false
      if (connection) {
        for (const e of events) connection.off(e, onEvent)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id, refresh])

  const totalVotes = tally?.total_votes ?? 0
  const options = useMemo(() => tallyToOptions(tally), [tally])
  const quorumPct = poll?.quorum_threshold ?? null
  const quorumMet = quorumPct !== null ? totalVotes >= quorumPct : false
  const series = useMemo(() => {
    if (timeline.length === 0) {
      return new Array(12)
        .fill(0)
        .map((_, i) => Math.round((totalVotes / 12) * (i + 1))) as number[]
    }
    return timeline.slice(-12).map((r) => Number(r.vote_count ?? 0))
  }, [timeline, totalVotes])

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        {t('liveResults.loading', {}, { defaultValue: 'Loading live results…' })}
      </div>
    )
  }

  if (!poll) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        <p>{error ?? t('liveResults.notFound', {}, { defaultValue: 'Poll not found.' })}</p>
        <Link
          to="/dashboard"
          className={cm.cn('mt-4 inline-block font-bold text-primary hover:underline')}
        >
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
      </div>
    )
  }

  const statusKey = statusToPill(poll.status)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <div className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <div className={cm.flex({ align: 'center', gap: 'sm' }) + ' min-w-0'}>
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.textSize('xs'),
                'inline-flex min-h-[40px] items-center text-primary hover:underline font-semibold tracking-wide uppercase',
              )}
            >
              ← {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </Link>
            <span className={cm.cn('text-on-surface-variant text-xs')}>/</span>
            <span className={cm.cn('min-w-0 truncate text-xs font-mono text-on-surface-variant')}>
              {t('liveResults.pollId', { id: poll.id }, { defaultValue: 'poll · {{id}}' })}
            </span>
          </div>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
            data-test="liveresults-title"
          >
            {poll.title}
          </h1>
          <div
            className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <PollStatusPill status={statusKey} emphasis />
            <QuestionTypeBadge type={poll.type} size="md" />
            {quorumPct !== null ? (
              <span className={cm.cn('text-xs font-semibold text-on-surface-variant')}>
                {t(
                  'liveResults.quorum',
                  { pct: quorumPct },
                  { defaultValue: 'Quorum target {{pct}}' },
                )}
                %
              </span>
            ) : null}
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to={`/polls/${poll.id}/qa`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              forum
            </span>
            {t('liveResults.openQa', {}, { defaultValue: 'Audience Q&A' })}
          </Link>
          <Link
            to={`/polls/${poll.id}/present`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              cast
            </span>
            {t('liveResults.present', {}, { defaultValue: 'Present' })}
          </Link>
        </div>
      </div>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="how_to_vote"
          tone="primary"
          label={t('liveResults.kpi.cast', {}, { defaultValue: 'Ballots cast' })}
          value={totalVotes.toLocaleString()}
        />
        <QuorumKpiCard
          icon="balance"
          tone="accent"
          label={t('liveResults.kpi.quorum', {}, { defaultValue: 'Quorum status' })}
          value={
            quorumPct !== null
              ? quorumMet
                ? t('liveResults.kpi.quorumMet', {}, { defaultValue: 'Met' })
                : `${Math.min(100, Math.round((totalVotes / Math.max(quorumPct, 1)) * 100))}%`
              : '—'
          }
          hint={
            quorumPct !== null
              ? t(
                  'liveResults.kpi.quorumHint',
                  { target: quorumPct },
                  { defaultValue: 'Target {{target}}' },
                )
              : ''
          }
        />
        <QuorumKpiCard
          icon="schedule"
          tone="warning"
          label={t('liveResults.kpi.opened', {}, { defaultValue: 'Opened' })}
          value={poll.start_date ? new Date(poll.start_date).toLocaleDateString() : '—'}
        />
        <QuorumKpiCard
          icon="verified"
          tone="navy"
          label={t('liveResults.kpi.audit', {}, { defaultValue: 'Audit entries' })}
          value={String(recent.length)}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <div className={cm.cn('lg:col-span-8 min-w-0')}>
          <LiveResultsHero
            eyebrow={t('liveResults.heroEyebrow', {}, { defaultValue: 'Real-time tally' })}
            title={poll.title}
            totalVotes={totalVotes}
            state={statusKey === 'closed' ? 'closed' : 'live'}
            options={options}
            caption={
              poll.type === 'open-text'
                ? t(
                    'liveResults.openCaption',
                    { count: tally?.responses?.length ?? 0 },
                    { defaultValue: '{{count}} open responses received.' },
                  )
                : t(
                    'liveResults.heroCaption',
                    {},
                    { defaultValue: 'Bars update every 5 seconds from the backend.' },
                  )
            }
          />
        </div>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 min-w-0 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <div className={cm.sp('mb', 4)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('liveResults.streamEyebrow', {}, { defaultValue: 'Vote stream' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface mt-1',
              )}
            >
              {t('liveResults.streamHeading', {}, { defaultValue: 'Recent ballots' })}
            </h2>
          </div>
          <ParticipationSparkline
            values={series}
            width={400}
            height={64}
            stroke="var(--mol-color-success)"
            strokeWidth={2}
            className={cm.cn('w-full h-auto')}
            ariaLabel={t(
              'liveResults.streamAria',
              {},
              { defaultValue: 'Ballot arrival rate over time' },
            )}
          />
          <ul className={cm.cn(cm.sp('mt', 4), cm.stack(2))} data-test="liveresults-recent">
            {recent.length === 0 ? (
              <li className={cm.cn('text-xs text-on-surface-variant')}>
                {t('liveResults.noRecent', {}, { defaultValue: 'No ballots cast yet.' })}
              </li>
            ) : (
              recent.map((v) => (
                <li key={v.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      'grid h-8 w-8 place-items-center rounded-full font-bold text-xs',
                    )}
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--mol-color-info) 10%, transparent)',
                      color: 'var(--mol-color-info)',
                    }}
                  >
                    {(v.voter_id ?? 'U')[0].toUpperCase()}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.cn('text-sm font-semibold text-on-surface truncate')}>
                      {v.voter_id ??
                        t('liveResults.anonymousVoter', {}, { defaultValue: 'Anonymous voter' })}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {timeAgo(v.created_at)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
