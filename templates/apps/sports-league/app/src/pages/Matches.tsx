import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { type Match, MatchCard } from '../components/MatchCard.js'
import { unwrapList } from '../lib/api.js'
import { getRealtimeConnection, SPORTS_LEAGUE_ROOM } from '../lib/realtime.js'
import { type ScheduleGame, toMatch } from '../lib/schedule.js'

type StatusFilter = 'all' | 'live' | 'scheduled' | 'final'

const FALLBACK_MATCHES: Match[] = [
  {
    id: 'm1',
    status: 'in_progress',
    date: new Date().toISOString(),
    period: 3,
    game_clock: '4:21',
    venue: 'Mercedes-Benz Stadium',
    home: { name: 'Atlanta Hawks', abbreviation: 'ATL', color: '#0e7490', score: 3 },
    away: { name: 'Boston Reign', abbreviation: 'BOS', color: '#dc2626', score: 2 },
  },
  {
    id: 'm2',
    status: 'in_progress',
    date: new Date().toISOString(),
    period: 2,
    game_clock: '0:48',
    venue: 'Madison Square',
    home: { name: 'New York City', abbreviation: 'NYC', color: '#0c4a6e', score: 1 },
    away: { name: 'Los Angeles', abbreviation: 'LAC', color: '#7c3aed', score: 1 },
  },
  {
    id: 'm3',
    status: 'scheduled',
    date: new Date().toISOString(),
    time: '7:30 PM',
    venue: 'Phoenix Arena',
    home: { name: 'Phoenix Heat', abbreviation: 'PHX', color: '#f59e0b', score: null },
    away: { name: 'Seattle Wave', abbreviation: 'SEA', color: '#0e7490', score: null },
  },
  {
    id: 'm4',
    status: 'scheduled',
    date: new Date().toISOString(),
    time: '8:15 PM',
    venue: 'AmericanAirlines Arena',
    home: { name: 'Miami Tide', abbreviation: 'MIA', color: '#22d3ee', score: null },
    away: { name: 'Toronto Echo', abbreviation: 'TOR', color: '#10b981', score: null },
  },
  {
    id: 'm5',
    status: 'final',
    date: new Date(Date.now() - 86400000).toISOString(),
    venue: 'United Center',
    home: { name: 'Chicago Surge', abbreviation: 'CHI', color: '#16a34a', score: 4 },
    away: { name: 'Dallas Roar', abbreviation: 'DAL', color: '#7c3aed', score: 1 },
  },
  {
    id: 'm6',
    status: 'final',
    date: new Date(Date.now() - 86400000).toISOString(),
    venue: 'Crypto.com Arena',
    home: { name: 'Los Angeles', abbreviation: 'LAC', color: '#7c3aed', score: 2 },
    away: { name: 'Atlanta Hawks', abbreviation: 'ATL', color: '#0e7490', score: 5 },
  },
  {
    id: 'm7',
    status: 'scheduled',
    date: new Date(Date.now() + 86400000).toISOString(),
    time: '6:00 PM',
    venue: 'TD Garden',
    home: { name: 'Boston Reign', abbreviation: 'BOS', color: '#dc2626', score: null },
    away: { name: 'New York City', abbreviation: 'NYC', color: '#0c4a6e', score: null },
  },
  {
    id: 'm8',
    status: 'scheduled',
    date: new Date(Date.now() + 172800000).toISOString(),
    time: '9:00 PM',
    venue: 'Climate Pledge',
    home: { name: 'Seattle Wave', abbreviation: 'SEA', color: '#0e7490', score: null },
    away: { name: 'Phoenix Heat', abbreviation: 'PHX', color: '#f59e0b', score: null },
  },
]

export function Matches() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [matches, setMatches] = useState<Match[]>(FALLBACK_MATCHES)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/schedule?limit=50')
      .then((rows) => {
        if (!cancelled) {
          const list = unwrapList<ScheduleGame>(rows)
            .map((g) => toMatch(g))
            .filter((m): m is Match => m !== null)
          setMatches(list.length ? list : FALLBACK_MATCHES)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Live scores: the global `sports-league` room broadcasts every game's updates;
  // patch the matching card by game_id (score-update → score; game-started →
  // in_progress; game-final → score + final). game-event isn't shown in the list.
  // Server: api/src/handlers/scores.ts.
  useEffect(() => {
    let active = true
    let connection: RealtimeConnection | null = null

    const asRecord = (data: unknown): Record<string, unknown> | null =>
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null
    const gameId = (rec: Record<string, unknown> | null): string | null =>
      rec && rec.game_id !== undefined && rec.game_id !== null ? String(rec.game_id) : null
    const numOr = (v: unknown, fallback: number | null): number | null =>
      typeof v === 'number' ? v : fallback

    const patch = (id: string, fn: (m: Match) => Match) =>
      setMatches((prev) => prev.map((m) => (String(m.id) === id ? fn(m) : m)))

    const onScoreUpdate = (data: unknown) => {
      const rec = asRecord(data)
      const id = gameId(rec)
      if (!id) return
      patch(id, (m) => ({
        ...m,
        home: { ...m.home, score: numOr(rec!.home_score, m.home.score ?? null) },
        away: { ...m.away, score: numOr(rec!.away_score, m.away.score ?? null) },
      }))
    }
    const onGameStarted = (data: unknown) => {
      const id = gameId(asRecord(data))
      if (!id) return
      patch(id, (m) => ({ ...m, status: 'in_progress' }))
    }
    const onGameFinal = (data: unknown) => {
      const rec = asRecord(data)
      const id = gameId(rec)
      if (!id) return
      patch(id, (m) => ({
        ...m,
        status: 'final',
        home: { ...m.home, score: numOr(rec!.home_score, m.home.score ?? null) },
        away: { ...m.away, score: numOr(rec!.away_score, m.away.score ?? null) },
      }))
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('score-update', onScoreUpdate)
        conn.on('game-started', onGameStarted)
        conn.on('game-final', onGameFinal)
        return conn.joinRoom(SPORTS_LEAGUE_ROOM)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the list.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('score-update', onScoreUpdate)
        connection.off('game-started', onGameStarted)
        connection.off('game-final', onGameFinal)
        connection.leaveRoom(SPORTS_LEAGUE_ROOM).catch(() => {})
      }
    }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return matches
    if (filter === 'live')
      return matches.filter((m) => m.status === 'live' || m.status === 'in_progress')
    return matches.filter((m) => m.status === filter)
  }, [matches, filter])

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }) },
    { key: 'live', label: t('status.live', {}, { defaultValue: 'Live' }) },
    { key: 'scheduled', label: t('status.upcoming', {}, { defaultValue: 'Upcoming' }) },
    { key: 'final', label: t('status.recent', {}, { defaultValue: 'Recent' }) },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('matches.eyebrow', {}, { defaultValue: 'Matchday' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('matches.title', {}, { defaultValue: 'Matches' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {loading
            ? t('matches.loading', {}, { defaultValue: 'Pulling the slate…' })
            : t(
                'matches.subtitle',
                { count: matches.length },
                {
                  defaultValue:
                    '{{count}} matches across the league — tap any card for box score & play-by-play.',
                },
              )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('p', 1),
          'rounded-full bg-surface-container-lowest border border-outline-variant/40 w-fit',
        )}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
        {filtered.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
        {filtered.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'col-span-full text-on-surface-variant',
            )}
          >
            {t(
              'matches.empty',
              {},
              { defaultValue: 'No matches in this view — try a different filter.' },
            )}
          </p>
        ) : null}
      </div>
    </div>
  )
}
