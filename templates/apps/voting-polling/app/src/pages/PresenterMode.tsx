import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LiveResultsHero } from '../components/LiveResultsHero.js'
import { unwrap } from '../lib/api.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface PollRow {
  id: string
  title: string
  status: 'draft' | 'active' | 'closed'
  end_date?: string | null
}

interface ResultsTally {
  poll_id: string
  options?: Array<{ label: string; count?: number; score?: number }>
  total_votes: number
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function countdownLabel(endIso?: string | null, now = Date.now()): string {
  if (!endIso) return ''
  const t = new Date(endIso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Math.max(0, Math.round((t - now) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function PresenterMode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [poll, setPoll] = useState<PollRow | null>(null)
  const [tally, setTally] = useState<ResultsTally | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const [pollRes, resultsRes] = await Promise.all([
        http.get<PollRow>(`/api/polls/${id}`),
        http.get<ResultsTally>(`/api/results/${id}`),
      ])
      setPoll(unwrap<PollRow>(pollRes.data) ?? null)
      setTally(unwrap<ResultsTally>(resultsRes.data) ?? null)
      setError(null)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load')
    }
  }, [http, id])

  useEffect(() => {
    void refresh()
    const handle = window.setInterval(() => {
      setNow(Date.now())
    }, 4000)
    return () => window.clearInterval(handle)
  }, [refresh])

  // Live poll — the API broadcasts vote/poll/question events to the owner-guarded
  // `poll:<id>` room (handlers/{polls,votes,audience_questions}.ts). Join it and
  // refresh on each event so the presenter view updates instantly. Room + event names
  // MUST match the server exactly. Owner-guarded room → the socket carries the auth
  // token (lib/realtime.ts).
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
        // Socket unavailable — the presenter still has the initial load.
      })
    return () => {
      active = false
      if (connection) {
        for (const e of events) connection.off(e, onEvent)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id, refresh])

  useEffect(() => {
    function onChange() {
      setFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch (_error) {
      // most browsers gate fullscreen on a user gesture; silently ignore if denied
    }
  }

  const total = tally?.total_votes ?? 0
  const options = useMemo(() => {
    if (!tally?.options) return []
    return tally.options.map((o, i) => ({
      id: `o-${i}`,
      label: o.label,
      votes: typeof o.count === 'number' ? o.count : Number(o.score ?? 0),
    }))
  }, [tally])
  const ttl = countdownLabel(poll?.end_date ?? null, now)

  if (!poll) {
    return (
      <div
        className={cm.cn('min-h-screen bg-background text-on-background px-6 py-16 text-center')}
      >
        {error ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  return (
    <div
      className={cm.cn('min-h-screen bg-background text-on-background relative overflow-hidden')}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-40 -right-40 h-[40rem] w-[40rem] rounded-full bg-primary/30 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none',
        )}
      />

      <header
        className={cm.cn(
          'relative z-10 flex items-center justify-between',
          cm.sp('px', 12),
          cm.sp('py', 8),
        )}
      >
        <div>
          <p className="text-[12px] font-black uppercase tracking-widest text-primary">
            {t('presenter.eyebrow', {}, { defaultValue: 'Live presenter' })}
          </p>
          <p className={cm.cn('mt-1 text-2xl font-extrabold tracking-tighter text-on-background')}>
            {APP_NAME}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/10 backdrop-blur-md border border-surface/10 text-[12px] font-black uppercase tracking-widest',
            )}
          >
            <span
              className={cm.cn('inline-block h-2 w-2 rounded-full bg-success animate-pulse')}
              aria-hidden="true"
            />
            {poll.status === 'active'
              ? t('presenter.live', {}, { defaultValue: 'Live · projecting' })
              : poll.status === 'closed'
                ? t('presenter.closed', {}, { defaultValue: 'Closed · final tally' })
                : t('presenter.draft', {}, { defaultValue: 'Draft' })}
          </span>
          {ttl ? (
            <span
              className="font-mono text-3xl font-extrabold tabular-nums tracking-tighter text-on-background"
              data-test="presenter-countdown"
            >
              {ttl}
            </span>
          ) : null}
        </div>
      </header>

      <main className={cm.cn('relative z-10 mx-auto pb-32', cm.maxW('5xl'), cm.sp('px', 12))}>
        <h1
          className={cm.cn(
            'mt-4 text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-on-background',
          )}
          data-test="presenter-title"
        >
          {poll.title}
        </h1>
        <p
          className={cm.cn('mt-4 text-lg text-on-surface-variant font-medium')}
          data-test="presenter-total"
        >
          {t('presenter.totalVotes', { count: total }, { defaultValue: '{{count}} ballots cast' })}
        </p>

        <div className={cm.sp('mt', 12)}>
          <LiveResultsHero
            eyebrow={t('presenter.heroEyebrow', {}, { defaultValue: 'Live tally' })}
            title={poll.title}
            totalVotes={total}
            state={poll.status === 'closed' ? 'closed' : 'live'}
            options={options}
            caption={t(
              'presenter.heroCaption',
              {},
              { defaultValue: 'Bars update every 4 seconds — driven by real-time vote counts.' },
            )}
          />
        </div>
      </main>

      <footer
        className={cm.cn('fixed bottom-6 inset-x-0 z-20 flex justify-center pointer-events-none')}
      >
        <div
          className={cm.cn(
            'pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container/90 backdrop-blur-md border border-surface/10 shadow-xl',
          )}
        >
          <Link
            to={`/polls/${poll.id}/live`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl text-on-surface hover:bg-surface/10 transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              dashboard
            </span>
            {t('presenter.toolbar.exit', {}, { defaultValue: 'Exit presenter' })}
          </Link>
          <Link
            to={`/polls/${poll.id}/qa`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl text-on-surface hover:bg-surface/10 transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              forum
            </span>
            {t('presenter.toolbar.qa', {}, { defaultValue: 'Take a question' })}
          </Link>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-2',
            )}
            data-test="presenter-fullscreen"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {fullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
            {fullscreen
              ? t('presenter.toolbar.exitFullscreen', {}, { defaultValue: 'Exit fullscreen' })
              : t('presenter.toolbar.fullscreen', {}, { defaultValue: 'Fullscreen' })}
          </button>
        </div>
      </footer>
    </div>
  )
}
