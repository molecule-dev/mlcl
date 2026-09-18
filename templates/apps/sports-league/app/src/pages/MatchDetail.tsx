import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/api.js'
import { getRealtimeConnection, SPORTS_LEAGUE_ROOM } from '../lib/realtime.js'

interface MatchDetail {
  id: string
  status: 'in_progress' | 'live' | 'final' | 'scheduled' | 'postponed'
  period?: string | number
  game_clock?: string
  date?: string
  time?: string
  venue?: string | null
  home_team_id?: string
  away_team_id?: string
  home_score?: number | null
  away_score?: number | null
  home_team?: {
    id?: string
    name: string
    abbreviation?: string
    logo_url?: string | null
    color?: string
    primary_color?: string
  } | null
  away_team?: {
    id?: string
    name: string
    abbreviation?: string
    logo_url?: string | null
    color?: string
    primary_color?: string
  } | null
}

const teamColor = (
  t: { color?: string; primary_color?: string } | null | undefined,
  fallback: string,
) => t?.color ?? t?.primary_color ?? fallback

interface GameEvent {
  id?: string
  type: string
  description?: string
  period?: string | number
  game_clock?: string
  team?: 'home' | 'away'
}

const FALLBACK_MATCH: MatchDetail = {
  id: 'sample',
  status: 'in_progress',
  period: 3,
  game_clock: '4:21',
  date: new Date().toISOString(),
  venue: 'Mercedes-Benz Stadium',
  home_score: 3,
  away_score: 2,
  home_team: { name: 'Atlanta Hawks', abbreviation: 'ATL', color: '#0e7490' },
  away_team: { name: 'Boston Reign', abbreviation: 'BOS', color: '#dc2626' },
}

const FALLBACK_EVENTS: GameEvent[] = [
  {
    id: 'e1',
    type: 'GOAL',
    description: 'Marquez (ATL) on a 30-foot strike — assist Reeves',
    period: 3,
    game_clock: '4:21',
    team: 'home',
  },
  {
    id: 'e2',
    type: 'YELLOW',
    description: 'Petrov (BOS) cautioned for tactical foul',
    period: 3,
    game_clock: '7:48',
    team: 'away',
  },
  {
    id: 'e3',
    type: 'SUB',
    description: 'Larsen → Kovacs (BOS)',
    period: 2,
    game_clock: '12:30',
    team: 'away',
  },
  {
    id: 'e4',
    type: 'GOAL',
    description: 'Reeves (ATL) tap-in from a corner',
    period: 2,
    game_clock: '6:14',
    team: 'home',
  },
  {
    id: 'e5',
    type: 'GOAL',
    description: 'Garcia (BOS) curling shot from the top of the box',
    period: 1,
    game_clock: '23:55',
    team: 'away',
  },
  {
    id: 'e6',
    type: 'GOAL',
    description: 'Marquez (ATL) header off a set piece',
    period: 1,
    game_clock: '14:02',
    team: 'home',
  },
  {
    id: 'e7',
    type: 'GOAL',
    description: 'Diaz (BOS) penalty kick — confidently slotted',
    period: 1,
    game_clock: '8:33',
    team: 'away',
  },
]

function unwrapSingle<T>(v: unknown): T | null {
  if (!v) return null
  if (typeof v === 'object' && 'data' in v) return (v as { data: T }).data
  return v as T
}

export function MatchDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = 'sample' } = useParams<{ id: string }>()
  const [match, setMatch] = useState<MatchDetail>(FALLBACK_MATCH)
  const [events, setEvents] = useState<GameEvent[]>(FALLBACK_EVENTS)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get(`/api/scores/${id}`).catch(() => null),
      http.get(`/api/scores/${id}/events`).catch(() => null),
    ]).then(([m, ev]) => {
      if (cancelled) return
      const detail = unwrapSingle<MatchDetail>(m)
      if (detail) setMatch(detail)
      const list = unwrapList<GameEvent>(ev)
      if (list.length) setEvents(list)
    })
    return () => {
      cancelled = true
    }
  }, [http, id])

  // Live scoreboard: the global `sports-league` room broadcasts every game's
  // updates, so we filter to THIS match by game_id. score-update patches the
  // score in place; game-final sets the final score + status; game-started
  // refetches (to pick up the authoritative status/period/clock); game-event
  // prepends to the play feed. Server: api/src/handlers/scores.ts.
  useEffect(() => {
    let active = true
    let connection: RealtimeConnection | null = null

    const asRecord = (data: unknown): Record<string, unknown> | null =>
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
    const isThisGame = (rec: Record<string, unknown> | null): boolean =>
      !!rec && rec.game_id !== undefined && rec.game_id !== null && String(rec.game_id) === id
    const numOr = (v: unknown, fallback: number | null | undefined): number | null | undefined =>
      typeof v === 'number' ? v : fallback

    const onScoreUpdate = (data: unknown) => {
      const rec = asRecord(data)
      if (!isThisGame(rec)) return
      setMatch((prev) => ({
        ...prev,
        home_score: numOr(rec!.home_score, prev.home_score),
        away_score: numOr(rec!.away_score, prev.away_score),
      }))
    }
    const onGameFinal = (data: unknown) => {
      const rec = asRecord(data)
      if (!isThisGame(rec)) return
      setMatch((prev) => ({
        ...prev,
        status: 'final',
        home_score: numOr(rec!.home_score, prev.home_score),
        away_score: numOr(rec!.away_score, prev.away_score),
      }))
    }
    const onGameStarted = (data: unknown) => {
      const rec = asRecord(data)
      if (!isThisGame(rec)) return
      void http
        .get(`/api/scores/${id}`)
        .then((m) => {
          const detail = unwrapSingle<MatchDetail>(m)
          if (detail) setMatch(detail)
        })
        .catch(() => setMatch((prev) => ({ ...prev, status: 'in_progress' })))
    }
    const onGameEvent = (data: unknown) => {
      const rec = asRecord(data)
      if (!isThisGame(rec)) return
      const ev = asRecord(rec!.event)
      if (!ev) return
      setEvents((prev) => [ev as unknown as GameEvent, ...prev].slice(0, 50))
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('score-update', onScoreUpdate)
        conn.on('game-final', onGameFinal)
        conn.on('game-started', onGameStarted)
        conn.on('game-event', onGameEvent)
        return conn.joinRoom(SPORTS_LEAGUE_ROOM)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the view.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('score-update', onScoreUpdate)
        connection.off('game-final', onGameFinal)
        connection.off('game-started', onGameStarted)
        connection.off('game-event', onGameEvent)
        connection.leaveRoom(SPORTS_LEAGUE_ROOM).catch(() => {})
      }
    }
  }, [http, id])

  const isLive = match.status === 'live' || match.status === 'in_progress'
  const isFinal = match.status === 'final'
  const homeWon = isFinal && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWon = isFinal && (match.away_score ?? 0) > (match.home_score ?? 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/matches"
        className={cm.cn(
          cm.textSize('sm'),
          'font-bold text-primary hover:underline inline-flex items-center gap-1 w-fit',
        )}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
          arrow_back
        </span>
        {t('matchDetail.back', {}, { defaultValue: 'Back to matches' })}
      </Link>

      <section
        className={cm.cn('rounded-[2rem] text-white relative overflow-hidden shadow-xl p-10')}
        style={{
          background:
            'linear-gradient(135deg, var(--color-secondary), var(--color-primary-dark) 60%, var(--color-primary))',
        }}
      >
        <div className={cm.cn('relative z-10')}>
          <p
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-[0.28em] text-white/70 mb-3',
            )}
          >
            {isLive
              ? t('matchDetail.liveNow', {}, { defaultValue: 'Live now' })
              : isFinal
                ? t('matchDetail.finalScore', {}, { defaultValue: 'Final' })
                : t('status.upcoming', {}, { defaultValue: 'Upcoming' })}
          </p>
          <div className={cm.cn('grid grid-cols-3 items-center gap-6')}>
            <div className={cm.cn('text-center md:text-left')}>
              <div
                className={cm.cn('flex items-center gap-3 justify-center md:justify-start mb-2')}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('inline-block w-10 h-10 rounded-md ring-1 ring-white/20')}
                  style={{ backgroundColor: teamColor(match.home_team, 'var(--color-primary)') }}
                />
                <span className={cm.cn('text-xl font-bold tracking-tight')}>
                  {match.home_team?.name ?? match.home_team_id}
                </span>
              </div>
              <span
                className={cm.cn(
                  'block tabular-nums leading-none',
                  awayWon ? 'text-white/50' : 'text-white',
                  'text-7xl md:text-8xl font-extrabold tracking-tighter',
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {match.home_score ?? '–'}
              </span>
            </div>

            <div className={cm.cn('text-center')}>
              {isLive ? (
                <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      'px-3 py-1 rounded-full bg-live text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2',
                    )}
                    style={{ color: 'var(--color-on-live)' }}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'inline-block w-2 h-2 rounded-full bg-surface animate-pulse',
                      )}
                    />
                    {t('matchDetail.live', {}, { defaultValue: 'LIVE' })}
                  </span>
                  <span
                    className={cm.cn('text-2xl font-extrabold tabular-nums')}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {t(
                      'matchDetail.periodClock',
                      { period: String(match.period ?? ''), clock: String(match.game_clock ?? '') },
                      { defaultValue: 'Q{{period}} · {{clock}}' },
                    )}
                  </span>
                </div>
              ) : isFinal ? (
                <span
                  className={cm.cn(
                    'px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-xs font-extrabold uppercase tracking-widest',
                  )}
                >
                  {t('matchDetail.final', {}, { defaultValue: 'FINAL' })}
                </span>
              ) : (
                <span
                  className={cm.cn('text-sm uppercase tracking-widest text-white/80 tabular-nums')}
                >
                  {match.date ? new Date(match.date).toLocaleDateString() : ''}
                  {match.time ? ` · ${match.time}` : ''}
                </span>
              )}
            </div>

            <div className={cm.cn('text-center md:text-right')}>
              <div className={cm.cn('flex items-center gap-3 justify-center md:justify-end mb-2')}>
                <span className={cm.cn('text-xl font-bold tracking-tight')}>
                  {match.away_team?.name ?? match.away_team_id}
                </span>
                <span
                  aria-hidden="true"
                  className={cm.cn('inline-block w-10 h-10 rounded-md ring-1 ring-white/20')}
                  style={{ backgroundColor: teamColor(match.away_team, 'var(--color-danger)') }}
                />
              </div>
              <span
                className={cm.cn(
                  'block tabular-nums leading-none',
                  homeWon ? 'text-white/50' : 'text-white',
                  'text-7xl md:text-8xl font-extrabold tracking-tighter',
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {match.away_score ?? '–'}
              </span>
            </div>
          </div>

          {match.venue ? (
            <p
              className={cm.cn(
                'mt-8 text-center text-sm text-white/70 uppercase tracking-widest font-bold',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-sm align-text-bottom mr-1')}
              >
                place
              </span>
              {match.venue}
            </p>
          ) : null}
        </div>
        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/10 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-16 -top-16 w-48 h-48 rounded-full bg-accent/30 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('matchDetail.eventsHeading', {}, { defaultValue: 'Play-by-play' })}
        </h2>
        {events.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('matchDetail.noEvents', {}, { defaultValue: 'No events recorded yet.' })}
          </p>
        ) : (
          <ol
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'divide-y divide-outline-variant/40 rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
            )}
          >
            {events.map((evt, i) => (
              <li
                key={evt.id ?? i}
                className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 4))}
              >
                <span
                  className={cm.cn(
                    'inline-flex items-center justify-center w-16 text-xs font-extrabold uppercase tracking-widest tabular-nums rounded-md py-1',
                    evt.team === 'home'
                      ? 'bg-primary-container text-on-primary-container'
                      : evt.team === 'away'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {evt.type}
                </span>
                <p className={cm.cn(cm.textSize('sm'), cm.flex1, 'text-on-surface')}>
                  {evt.description ?? '—'}
                </p>
                <span
                  className={cm.cn(
                    'text-[11px] font-bold uppercase tracking-widest tabular-nums text-on-surface-variant',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Q{evt.period ?? '–'} · {evt.game_clock ?? '–'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
