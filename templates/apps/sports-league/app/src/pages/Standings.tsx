import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { type StandingsRow, StandingsTable } from '../components/StandingsTable.js'
import { unwrapList } from '../lib/api.js'
import { getRealtimeConnection, SPORTS_LEAGUE_ROOM } from '../lib/realtime.js'

const FALLBACK_OVERALL: StandingsRow[] = [
  {
    team_id: 't1',
    rank: 1,
    name: 'Atlas United',
    abbreviation: 'ATL',
    division: 'East',
    games_played: 24,
    wins: 18,
    losses: 4,
    draws: 2,
    points: 56,
    win_pct: 0.75,
    color: '#0e7490',
    isFavorite: true,
  },
  {
    team_id: 't2',
    rank: 2,
    name: 'Boston Reign',
    abbreviation: 'BOS',
    division: 'East',
    games_played: 24,
    wins: 16,
    losses: 6,
    draws: 2,
    points: 50,
    win_pct: 0.667,
    color: '#dc2626',
  },
  {
    team_id: 't3',
    rank: 3,
    name: 'Chicago Surge',
    abbreviation: 'CHI',
    division: 'Central',
    games_played: 24,
    wins: 14,
    losses: 7,
    draws: 3,
    points: 45,
    win_pct: 0.583,
    color: '#16a34a',
  },
  {
    team_id: 't4',
    rank: 4,
    name: 'Dallas Roar',
    abbreviation: 'DAL',
    division: 'South',
    games_played: 24,
    wins: 12,
    losses: 9,
    draws: 3,
    points: 39,
    win_pct: 0.5,
    color: '#7c3aed',
  },
  {
    team_id: 't5',
    rank: 5,
    name: 'Phoenix Heat',
    abbreviation: 'PHX',
    division: 'West',
    games_played: 24,
    wins: 10,
    losses: 11,
    draws: 3,
    points: 33,
    win_pct: 0.417,
    color: '#f59e0b',
  },
  {
    team_id: 't6',
    rank: 6,
    name: 'Seattle Wave',
    abbreviation: 'SEA',
    division: 'West',
    games_played: 24,
    wins: 9,
    losses: 12,
    draws: 3,
    points: 30,
    win_pct: 0.375,
    color: '#0c4a6e',
  },
  {
    team_id: 't7',
    rank: 7,
    name: 'Miami Tide',
    abbreviation: 'MIA',
    division: 'South',
    games_played: 24,
    wins: 7,
    losses: 14,
    draws: 3,
    points: 24,
    win_pct: 0.292,
    color: '#22d3ee',
  },
  {
    team_id: 't8',
    rank: 8,
    name: 'Toronto Echo',
    abbreviation: 'TOR',
    division: 'North',
    games_played: 24,
    wins: 5,
    losses: 17,
    draws: 2,
    points: 17,
    win_pct: 0.208,
    color: '#10b981',
  },
]

export function Standings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [overall, setOverall] = useState<StandingsRow[]>(FALLBACK_OVERALL)
  const [view, setView] = useState<'overall' | 'divisions'>('overall')
  const [loading, setLoading] = useState(true)

  const loadStandings = useCallback(async () => {
    try {
      const rows = await http.get('/api/standings')
      const list = unwrapList<StandingsRow>(rows)
      setOverall(list.length ? list : FALLBACK_OVERALL)
    } catch (_error) {
      // Keep the current table on a transient error.
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    loadStandings().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadStandings])

  // Live standings: a finished game changes the table — refetch on `game-final`
  // (the standings are derived server-side, so a refetch is the correct update).
  // Server: api/src/handlers/scores.ts broadcasts to the global sports-league room.
  useEffect(() => {
    let active = true
    let connection: RealtimeConnection | null = null
    const onGameFinal = () => {
      void loadStandings()
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('game-final', onGameFinal)
        return conn.joinRoom(SPORTS_LEAGUE_ROOM)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the table.
      })
    return () => {
      active = false
      if (connection) {
        connection.off('game-final', onGameFinal)
        connection.leaveRoom(SPORTS_LEAGUE_ROOM).catch(() => {})
      }
    }
  }, [loadStandings])

  const byDivision = useMemo(() => {
    const map = new Map<string, StandingsRow[]>()
    for (const row of overall) {
      const div = row.division || t('status.unassigned', {}, { defaultValue: 'Unassigned' })
      if (!map.has(div)) map.set(div, [])
      map.get(div)!.push(row)
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => b.points - a.points)
      rows.forEach((r, i) => {
        r.rank = i + 1
      })
    }
    return Array.from(map.entries())
  }, [overall, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('standings.eyebrow', {}, { defaultValue: 'Race for the pennant' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('standings.title', {}, { defaultValue: 'League standings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {loading
            ? t('standings.loading', {}, { defaultValue: 'Loading the table…' })
            : t(
                'standings.subtitle',
                {},
                {
                  defaultValue:
                    'Top four qualify for the postseason — tiebreakers by points, then win-pct.',
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
        <button
          type="button"
          onClick={() => setView('overall')}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full transition-colors',
            view === 'overall'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('standings.overall', {}, { defaultValue: 'Overall' })}
        </button>
        <button
          type="button"
          onClick={() => setView('divisions')}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full transition-colors',
            view === 'divisions'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low',
          )}
        >
          {t('standings.byDivision', {}, { defaultValue: 'By division' })}
        </button>
      </div>

      {view === 'overall' ? (
        <StandingsTable rows={overall} playoffLine={4} showDivision />
      ) : (
        <div className={cm.stack(8)}>
          {byDivision.map(([div, rows]) => (
            <section key={div} className={cm.stack(3)}>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold uppercase tracking-widest text-primary',
                )}
              >
                {div}
              </h2>
              <StandingsTable rows={rows} playoffLine={2} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
