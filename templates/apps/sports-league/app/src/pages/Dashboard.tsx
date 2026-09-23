import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type Match, MatchCard } from '../components/MatchCard.js'
import { PennantHeroCard } from '../components/PennantHeroCard.js'
import { ScoreboardTicker, type TickerGame } from '../components/ScoreboardTicker.js'
import { type StandingsRow, StandingsTable } from '../components/StandingsTable.js'
import { type StatLeader, StatLeaderRow } from '../components/StatLeaderRow.js'
import { unwrapList } from '../lib/api.js'
import { type ScheduleGame, toMatch } from '../lib/schedule.js'
import { toStatLeaders } from '../lib/stats.js'

interface DashboardData {
  liveTicker: TickerGame[]
  leader: {
    name: string
    record: string
    points: number
    gamesAhead?: string
    formString?: string
    trend?: number[]
  } | null
  standings: StandingsRow[]
  todayMatches: Match[]
  topScorers: StatLeader[]
}

const FALLBACK: DashboardData = {
  liveTicker: [
    {
      id: 'g1',
      status: 'in_progress',
      home_abbr: 'ATL',
      away_abbr: 'BOS',
      home_score: 3,
      away_score: 2,
      clock: 'Q3 4:21',
    },
    {
      id: 'g2',
      status: 'in_progress',
      home_abbr: 'NYC',
      away_abbr: 'LAC',
      home_score: 1,
      away_score: 1,
      clock: 'Q2 0:48',
    },
    {
      id: 'g3',
      status: 'final',
      home_abbr: 'CHI',
      away_abbr: 'DAL',
      home_score: 4,
      away_score: 1,
      clock: 'FINAL',
    },
    { id: 'g4', status: 'scheduled', home_abbr: 'PHX', away_abbr: 'SEA', clock: '7:30 PM' },
    { id: 'g5', status: 'scheduled', home_abbr: 'MIA', away_abbr: 'TOR', clock: '8:15 PM' },
  ],
  leader: {
    name: 'Atlas United',
    record: '18-4-2',
    points: 56,
    gamesAhead: '+5',
    formString: 'W-W-L-W-W-W-D-W-W-L',
    trend: [2, 5, 8, 9, 12, 14, 18, 22, 25, 30, 34, 39, 41, 47, 50, 53, 56],
  },
  standings: [
    {
      team_id: 't1',
      rank: 1,
      name: 'Atlas United',
      abbreviation: 'ATL',
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
      games_played: 24,
      wins: 10,
      losses: 11,
      draws: 3,
      points: 33,
      win_pct: 0.417,
      color: '#f59e0b',
    },
  ],
  todayMatches: [
    {
      id: 'g4',
      status: 'scheduled',
      date: new Date().toISOString(),
      time: '7:30 PM',
      venue: 'Phoenix Arena',
      home: { name: 'Phoenix Heat', abbreviation: 'PHX', color: '#f59e0b', score: null },
      away: { name: 'Seattle Wave', abbreviation: 'SEA', color: '#0e7490', score: null },
    },
    {
      id: 'g5',
      status: 'scheduled',
      date: new Date().toISOString(),
      time: '8:15 PM',
      venue: 'AmericanAirlines',
      home: { name: 'Miami Tide', abbreviation: 'MIA', color: '#22d3ee', score: null },
      away: { name: 'Toronto Echo', abbreviation: 'TOR', color: '#10b981', score: null },
    },
    {
      id: 'g1',
      status: 'in_progress',
      period: 3,
      game_clock: '4:21',
      date: new Date().toISOString(),
      venue: 'Mercedes-Benz',
      home: { name: 'Atlanta Hawks', abbreviation: 'ATL', color: '#0e7490', score: 3 },
      away: { name: 'Boston Reign', abbreviation: 'BOS', color: '#dc2626', score: 2 },
    },
  ],
  topScorers: [
    {
      player_id: 'p1',
      rank: 1,
      name: 'D. Marquez',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '27.4',
      unit: 'PPG',
      delta: 'up',
    },
    {
      player_id: 'p2',
      rank: 2,
      name: 'J. Reeves',
      team_abbr: 'BOS',
      team_color: '#dc2626',
      value: '25.1',
      unit: 'PPG',
      delta: 'up',
    },
    {
      player_id: 'p3',
      rank: 3,
      name: 'A. Petrov',
      team_abbr: 'CHI',
      team_color: '#16a34a',
      value: '23.8',
      unit: 'PPG',
      delta: 'flat',
    },
    {
      player_id: 'p4',
      rank: 4,
      name: 'K. Larsen',
      team_abbr: 'DAL',
      team_color: '#7c3aed',
      value: '22.3',
      unit: 'PPG',
      delta: 'down',
    },
    {
      player_id: 'p5',
      rank: 5,
      name: 'R. Kovacs',
      team_abbr: 'PHX',
      team_color: '#f59e0b',
      value: '21.7',
      unit: 'PPG',
      delta: 'up',
    },
  ],
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<DashboardData>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/scores/live').catch(() => null),
      http.get('/api/standings?limit=10').catch(() => null),
      http.get('/api/schedule?status=scheduled&limit=20').catch(() => null),
      http.get('/api/stats/leaders/scoring?limit=5').catch(() => null),
    ])
      .then(([live, stand, today, scorers]) => {
        if (cancelled) return
        // /api/scores/live returns raw game rows hydrated with home_team/away_team
        // objects — convert to the abbreviated shape the navy ticker expects so
        // the row renders ATL/BOS/etc., not blanks. Without this mapping the
        // ticker silently shows pills with empty home/away codes whenever the
        // API returns any rows at all (previously the empty result fell back to
        // FALLBACK and looked correct only by accident).
        const liveRows = unwrapList<
          ScheduleGame & { period?: number | string; game_clock?: string }
        >(live)
        const liveList: TickerGame[] = liveRows
          .map((g) => ({
            id: g.id,
            status: (g.status as TickerGame['status']) ?? 'scheduled',
            home_abbr: g.home_team?.abbreviation ?? '',
            away_abbr: g.away_team?.abbreviation ?? '',
            home_score: g.home_score ?? undefined,
            away_score: g.away_score ?? undefined,
            clock: g.game_clock
              ? `Q${g.period ?? ''} ${g.game_clock}`.trim()
              : g.status === 'final'
                ? 'FINAL'
                : (g.time ?? ''),
          }))
          .filter((g) => g.home_abbr || g.away_abbr)
        const standingsList = unwrapList<StandingsRow>(stand)
        const todayList = unwrapList<ScheduleGame>(today)
        const scorersList = toStatLeaders(unwrapList(scorers))
        const todayMatches = todayList.map((g) => toMatch(g)).filter((m): m is Match => m !== null)
        setData({
          liveTicker: liveList.length ? liveList : FALLBACK.liveTicker,
          leader: standingsList[0]
            ? {
                name: standingsList[0].name,
                record: `${standingsList[0].wins}-${standingsList[0].losses}-${standingsList[0].draws}`,
                points: standingsList[0].points,
                gamesAhead: undefined,
                formString: 'W-W-L-W-W-W-D-W-W-L',
                trend: undefined,
              }
            : FALLBACK.leader,
          standings: standingsList.length ? standingsList : FALLBACK.standings,
          todayMatches: todayMatches.length ? todayMatches : FALLBACK.todayMatches,
          topScorers: scorersList.length ? scorersList : FALLBACK.topScorers,
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('dashboard.eyebrow', {}, { defaultValue: 'Today around the league' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('dashboard.title', {}, { defaultValue: 'League Dashboard' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {loading
            ? t('dashboard.loading', {}, { defaultValue: 'Pulling tonight\u2019s scores…' })
            : t(
                'dashboard.subtitle',
                {},
                { defaultValue: 'Standings, scoreboards, and the leaders chasing them.' },
              )}
        </p>
      </header>

      <ScoreboardTicker games={data.liveTicker} />

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        {data.leader ? (
          <PennantHeroCard
            leaderName={data.leader.name}
            record={data.leader.record}
            points={data.leader.points}
            gamesAhead={data.leader.gamesAhead}
            formString={data.leader.formString}
            trend={data.leader.trend}
          />
        ) : null}
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 6),
            'lg:col-span-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
            {t('dashboard.scoringLeaders', {}, { defaultValue: 'Scoring leaders' })}
          </h3>
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            {data.topScorers.slice(0, 5).map((l) => (
              <StatLeaderRow key={l.player_id} leader={l} podium={l.rank <= 3} />
            ))}
          </div>
          <Link
            to="/stats"
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('sm'),
              'font-bold text-primary hover:underline',
            )}
          >
            {t('dashboard.viewAllStats', {}, { defaultValue: 'View all stat leaders \u2192' })}
          </Link>
        </aside>
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.todayHeading', {}, { defaultValue: "Today's games" })}
          </h2>
          <Link
            to="/matches"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('dashboard.viewAllMatches', {}, { defaultValue: 'View all matches \u2192' })}
          </Link>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
          {data.todayMatches.slice(0, 6).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.standingsSnapshot', {}, { defaultValue: 'Standings snapshot' })}
          </h2>
          <Link
            to="/standings"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('dashboard.viewAllStandings', {}, { defaultValue: 'Full standings \u2192' })}
          </Link>
        </div>
        <StandingsTable rows={data.standings.slice(0, 5)} playoffLine={4} />
      </section>
    </div>
  )
}
