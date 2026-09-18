/**
 * Global demo seed for sports-league.
 *
 * Sports leagues are inherently shared data: every user sees the same
 * teams, schedule, and standings (unlike voting-polling where each user
 * owns their own ballots). So this seed runs ONCE per database — the
 * first GET to any read endpoint that calls `seedDemoOnce()` populates
 * a realistic mid-season league with:
 *   - 1 league + 2 divisions (East/West)
 *   - 8 teams with logos/colors and win/loss records
 *   - ~32 players across the rosters with stats (points/assists/saves/shots)
 *   - ~20 games (mix of scheduled / in_progress / final)
 *   - per-player stats so leaderboards have data
 *
 * Idempotent: skips if any team already exists.
 *
 * Per-user (`seedFavoritesForUser`) auto-favorites the leader team and
 * one underdog so /settings + /notifications have data on first signup.
 *
 * @module
 */

import { count, create, query } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface GlobalSeedResult {
  leaguesCreated: number
  teamsCreated: number
  playersCreated: number
  gamesCreated: number
  statsCreated: number
}

let seedingPromise: Promise<GlobalSeedResult> | null = null

const TEAMS = [
  {
    name: 'Atlas United',
    abbr: 'ATL',
    city: 'Atlanta',
    division: 'East',
    primary: '#0e7490',
    secondary: '#0a4f5e',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=atlas-united',
    wins: 18,
    losses: 4,
    draws: 2,
  },
  {
    name: 'Boston Reign',
    abbr: 'BOS',
    city: 'Boston',
    division: 'East',
    primary: '#dc2626',
    secondary: '#7f1d1d',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=boston-reign',
    wins: 16,
    losses: 6,
    draws: 2,
  },
  {
    name: 'New York City',
    abbr: 'NYC',
    city: 'New York',
    division: 'East',
    primary: '#1e40af',
    secondary: '#1e3a8a',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=new-york-city',
    wins: 14,
    losses: 8,
    draws: 2,
  },
  {
    name: 'Miami Tide',
    abbr: 'MIA',
    city: 'Miami',
    division: 'East',
    primary: '#22d3ee',
    secondary: '#0e7490',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=miami-tide',
    wins: 11,
    losses: 11,
    draws: 2,
  },
  {
    name: 'Chicago Surge',
    abbr: 'CHI',
    city: 'Chicago',
    division: 'West',
    primary: '#16a34a',
    secondary: '#15803d',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=chicago-surge',
    wins: 14,
    losses: 7,
    draws: 3,
  },
  {
    name: 'Dallas Roar',
    abbr: 'DAL',
    city: 'Dallas',
    division: 'West',
    primary: '#7c3aed',
    secondary: '#5b21b6',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=dallas-roar',
    wins: 12,
    losses: 9,
    draws: 3,
  },
  {
    name: 'Phoenix Heat',
    abbr: 'PHX',
    city: 'Phoenix',
    division: 'West',
    primary: '#f59e0b',
    secondary: '#b45309',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=phoenix-heat',
    wins: 10,
    losses: 11,
    draws: 3,
  },
  {
    name: 'Seattle Wave',
    abbr: 'SEA',
    city: 'Seattle',
    division: 'West',
    primary: '#0c4a6e',
    secondary: '#0e7490',
    logo: 'https://api.dicebear.com/9.x/identicon/png?seed=seattle-wave',
    wins: 8,
    losses: 13,
    draws: 3,
  },
]

interface PlayerSpec {
  first: string
  last: string
  team: string
  jersey: number
  pos: string
  status?: 'active' | 'injured' | 'reserve'
  points: number
  assists: number
  rebounds: number
  fouls: number
  minutes: number
  saves?: number
  shots?: number
  goals?: number
}

const PLAYERS: PlayerSpec[] = [
  // Atlas United (top of league - high scoring)
  {
    first: 'Diego',
    last: 'Marquez',
    team: 'ATL',
    jersey: 10,
    pos: 'Forward',
    points: 274,
    assists: 80,
    rebounds: 0,
    fouls: 14,
    minutes: 1890,
    goals: 24,
    shots: 96,
  },
  {
    first: 'Jamar',
    last: 'Reeves',
    team: 'ATL',
    jersey: 7,
    pos: 'Midfielder',
    points: 251,
    assists: 121,
    rebounds: 0,
    fouls: 12,
    minutes: 1840,
    goals: 18,
    shots: 78,
  },
  {
    first: 'Carlos',
    last: 'Garcia',
    team: 'ATL',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 4,
    rebounds: 0,
    fouls: 2,
    minutes: 2140,
    saves: 142,
  },
  {
    first: 'Riku',
    last: 'Tanaka',
    team: 'ATL',
    jersey: 22,
    pos: 'Defender',
    points: 38,
    assists: 11,
    rebounds: 0,
    fouls: 22,
    minutes: 1980,
    goals: 4,
    shots: 22,
  },
  // Boston Reign
  {
    first: 'Aleksei',
    last: 'Petrov',
    team: 'BOS',
    jersey: 17,
    pos: 'Midfielder',
    points: 238,
    assists: 142,
    rebounds: 0,
    fouls: 18,
    minutes: 1900,
    goals: 16,
    shots: 54,
  },
  {
    first: 'Marcus',
    last: 'Webb',
    team: 'BOS',
    jersey: 9,
    pos: 'Forward',
    points: 195,
    assists: 60,
    rebounds: 0,
    fouls: 16,
    minutes: 1820,
    goals: 14,
    shots: 60,
  },
  {
    first: 'Henrik',
    last: 'Sorensen',
    team: 'BOS',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 2,
    rebounds: 0,
    fouls: 1,
    minutes: 2050,
    saves: 119,
  },
  {
    first: 'Tomas',
    last: 'Vasquez',
    team: 'BOS',
    jersey: 14,
    pos: 'Defender',
    points: 28,
    assists: 16,
    rebounds: 0,
    fouls: 24,
    minutes: 1850,
    goals: 3,
    shots: 18,
  },
  // New York City
  {
    first: 'Andre',
    last: 'Lopez',
    team: 'NYC',
    jersey: 11,
    pos: 'Forward',
    points: 187,
    assists: 51,
    rebounds: 0,
    fouls: 13,
    minutes: 1780,
    goals: 13,
    shots: 64,
  },
  {
    first: 'Iván',
    last: 'Castillo',
    team: 'NYC',
    jersey: 6,
    pos: 'Midfielder',
    points: 165,
    assists: 95,
    rebounds: 0,
    fouls: 19,
    minutes: 1900,
    goals: 11,
    shots: 42,
  },
  {
    first: 'Bryce',
    last: 'Patel',
    team: 'NYC',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 1,
    rebounds: 0,
    fouls: 0,
    minutes: 1980,
    saves: 105,
  },
  {
    first: 'Jeong',
    last: 'Park',
    team: 'NYC',
    jersey: 4,
    pos: 'Defender',
    points: 22,
    assists: 8,
    rebounds: 0,
    fouls: 27,
    minutes: 1860,
    goals: 2,
    shots: 14,
  },
  // Miami Tide
  {
    first: 'Sami',
    last: 'Wahid',
    team: 'MIA',
    jersey: 8,
    pos: 'Forward',
    points: 144,
    assists: 90,
    rebounds: 0,
    fouls: 11,
    minutes: 1700,
    goals: 9,
    shots: 49,
  },
  {
    first: 'Liam',
    last: 'O\u2019Brien',
    team: 'MIA',
    jersey: 12,
    pos: 'Midfielder',
    points: 128,
    assists: 70,
    rebounds: 0,
    fouls: 17,
    minutes: 1640,
    goals: 8,
    shots: 38,
  },
  {
    first: 'Owen',
    last: 'Hassan',
    team: 'MIA',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 0,
    rebounds: 0,
    fouls: 1,
    minutes: 1820,
    saves: 98,
  },
  {
    first: 'Felix',
    last: 'Pham',
    team: 'MIA',
    jersey: 5,
    pos: 'Defender',
    points: 19,
    assists: 6,
    rebounds: 0,
    fouls: 23,
    minutes: 1740,
    goals: 1,
    shots: 10,
  },
  // Chicago Surge
  {
    first: 'Kasper',
    last: 'Larsen',
    team: 'CHI',
    jersey: 23,
    pos: 'Forward',
    points: 198,
    assists: 112,
    rebounds: 0,
    fouls: 14,
    minutes: 1820,
    goals: 13,
    shots: 70,
    status: 'injured',
  },
  {
    first: 'Mateo',
    last: 'Rivera',
    team: 'CHI',
    jersey: 9,
    pos: 'Midfielder',
    points: 173,
    assists: 84,
    rebounds: 0,
    fouls: 16,
    minutes: 1860,
    goals: 12,
    shots: 48,
  },
  {
    first: 'Borys',
    last: 'Kowalski',
    team: 'CHI',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 3,
    rebounds: 0,
    fouls: 2,
    minutes: 1920,
    saves: 128,
  },
  {
    first: 'Dimitri',
    last: 'Andreyev',
    team: 'CHI',
    jersey: 3,
    pos: 'Defender',
    points: 30,
    assists: 14,
    rebounds: 0,
    fouls: 26,
    minutes: 1880,
    goals: 3,
    shots: 16,
  },
  // Dallas Roar
  {
    first: 'Roman',
    last: 'Kovacs',
    team: 'DAL',
    jersey: 21,
    pos: 'Forward',
    points: 173,
    assists: 60,
    rebounds: 0,
    fouls: 16,
    minutes: 1700,
    goals: 12,
    shots: 58,
  },
  {
    first: 'Kenji',
    last: 'Yamada',
    team: 'DAL',
    jersey: 16,
    pos: 'Midfielder',
    points: 142,
    assists: 78,
    rebounds: 0,
    fouls: 18,
    minutes: 1740,
    goals: 9,
    shots: 36,
  },
  {
    first: 'Ethan',
    last: 'Cole',
    team: 'DAL',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 1,
    rebounds: 0,
    fouls: 0,
    minutes: 1800,
    saves: 91,
  },
  {
    first: 'Hugo',
    last: 'Müller',
    team: 'DAL',
    jersey: 4,
    pos: 'Defender',
    points: 22,
    assists: 10,
    rebounds: 0,
    fouls: 28,
    minutes: 1810,
    goals: 2,
    shots: 12,
  },
  // Phoenix Heat
  {
    first: 'Frank',
    last: 'Olsen',
    team: 'PHX',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 1,
    rebounds: 0,
    fouls: 1,
    minutes: 1880,
    saves: 119,
  },
  {
    first: 'Cesar',
    last: 'Mendoza',
    team: 'PHX',
    jersey: 9,
    pos: 'Forward',
    points: 121,
    assists: 36,
    rebounds: 0,
    fouls: 17,
    minutes: 1620,
    goals: 8,
    shots: 42,
  },
  {
    first: 'Anders',
    last: 'Berg',
    team: 'PHX',
    jersey: 8,
    pos: 'Midfielder',
    points: 96,
    assists: 58,
    rebounds: 0,
    fouls: 22,
    minutes: 1660,
    goals: 6,
    shots: 28,
  },
  {
    first: 'Nathan',
    last: 'Reed',
    team: 'PHX',
    jersey: 3,
    pos: 'Defender',
    points: 18,
    assists: 6,
    rebounds: 0,
    fouls: 30,
    minutes: 1700,
    goals: 1,
    shots: 8,
  },
  // Seattle Wave
  {
    first: 'Takashi',
    last: 'Nakamura',
    team: 'SEA',
    jersey: 11,
    pos: 'Forward',
    points: 156,
    assists: 41,
    rebounds: 0,
    fouls: 12,
    minutes: 1660,
    goals: 14,
    shots: 72,
  },
  {
    first: 'Wonjae',
    last: 'Park',
    team: 'SEA',
    jersey: 1,
    pos: 'Goalkeeper',
    points: 0,
    assists: 0,
    rebounds: 0,
    fouls: 0,
    minutes: 1700,
    saves: 98,
  },
  {
    first: 'Sebastián',
    last: 'Vega',
    team: 'SEA',
    jersey: 7,
    pos: 'Midfielder',
    points: 84,
    assists: 52,
    rebounds: 0,
    fouls: 18,
    minutes: 1620,
    goals: 5,
    shots: 24,
  },
  {
    first: 'Mason',
    last: 'Brooks',
    team: 'SEA',
    jersey: 5,
    pos: 'Defender',
    points: 14,
    assists: 4,
    rebounds: 0,
    fouls: 26,
    minutes: 1640,
    goals: 1,
    shots: 6,
  },
]

interface GameSpec {
  homeAbbr: string
  awayAbbr: string
  status: 'scheduled' | 'in_progress' | 'final'
  daysOffset: number // negative = past, 0 = today, positive = future
  hour: number
  venue: string
  homeScore?: number
  awayScore?: number
  period?: number
  clock?: string
}

const GAMES: GameSpec[] = [
  // Past finals (last 7 days)
  {
    homeAbbr: 'CHI',
    awayAbbr: 'DAL',
    status: 'final',
    daysOffset: -2,
    hour: 19,
    venue: 'United Center',
    homeScore: 4,
    awayScore: 1,
  },
  {
    homeAbbr: 'BOS',
    awayAbbr: 'NYC',
    status: 'final',
    daysOffset: -2,
    hour: 20,
    venue: 'TD Garden',
    homeScore: 3,
    awayScore: 2,
  },
  {
    homeAbbr: 'ATL',
    awayAbbr: 'MIA',
    status: 'final',
    daysOffset: -3,
    hour: 19,
    venue: 'Mercedes-Benz',
    homeScore: 2,
    awayScore: 0,
  },
  {
    homeAbbr: 'SEA',
    awayAbbr: 'PHX',
    status: 'final',
    daysOffset: -4,
    hour: 20,
    venue: 'Lumen Field',
    homeScore: 1,
    awayScore: 2,
  },
  {
    homeAbbr: 'DAL',
    awayAbbr: 'BOS',
    status: 'final',
    daysOffset: -5,
    hour: 19,
    venue: 'AT&T Stadium',
    homeScore: 0,
    awayScore: 1,
  },
  {
    homeAbbr: 'NYC',
    awayAbbr: 'CHI',
    status: 'final',
    daysOffset: -6,
    hour: 18,
    venue: 'Yankee Stadium',
    homeScore: 2,
    awayScore: 2,
  },
  {
    homeAbbr: 'MIA',
    awayAbbr: 'ATL',
    status: 'final',
    daysOffset: -7,
    hour: 19,
    venue: 'Hard Rock Stadium',
    homeScore: 1,
    awayScore: 4,
  },
  // In progress (now)
  {
    homeAbbr: 'ATL',
    awayAbbr: 'BOS',
    status: 'in_progress',
    daysOffset: 0,
    hour: new Date().getUTCHours(),
    venue: 'Mercedes-Benz',
    homeScore: 3,
    awayScore: 2,
    period: 3,
    clock: '04:21',
  },
  {
    homeAbbr: 'NYC',
    awayAbbr: 'LAC',
    status: 'in_progress',
    daysOffset: 0,
    hour: new Date().getUTCHours(),
    venue: 'Yankee Stadium',
    homeScore: 1,
    awayScore: 1,
    period: 2,
    clock: '00:48',
  },
  // Today scheduled later
  {
    homeAbbr: 'PHX',
    awayAbbr: 'SEA',
    status: 'scheduled',
    daysOffset: 0,
    hour: 23,
    venue: 'Phoenix Arena',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'MIA',
    awayAbbr: 'TOR',
    status: 'scheduled',
    daysOffset: 0,
    hour: 22,
    venue: 'Hard Rock Stadium',
    homeScore: 0,
    awayScore: 0,
  },
  // Future scheduled (next 7 days)
  {
    homeAbbr: 'CHI',
    awayAbbr: 'ATL',
    status: 'scheduled',
    daysOffset: 1,
    hour: 19,
    venue: 'United Center',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'BOS',
    awayAbbr: 'PHX',
    status: 'scheduled',
    daysOffset: 1,
    hour: 20,
    venue: 'TD Garden',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'SEA',
    awayAbbr: 'NYC',
    status: 'scheduled',
    daysOffset: 2,
    hour: 22,
    venue: 'Lumen Field',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'DAL',
    awayAbbr: 'MIA',
    status: 'scheduled',
    daysOffset: 3,
    hour: 19,
    venue: 'AT&T Stadium',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'ATL',
    awayAbbr: 'NYC',
    status: 'scheduled',
    daysOffset: 4,
    hour: 20,
    venue: 'Mercedes-Benz',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'CHI',
    awayAbbr: 'BOS',
    status: 'scheduled',
    daysOffset: 5,
    hour: 19,
    venue: 'United Center',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'PHX',
    awayAbbr: 'DAL',
    status: 'scheduled',
    daysOffset: 6,
    hour: 22,
    venue: 'Phoenix Arena',
    homeScore: 0,
    awayScore: 0,
  },
  {
    homeAbbr: 'MIA',
    awayAbbr: 'SEA',
    status: 'scheduled',
    daysOffset: 7,
    hour: 19,
    venue: 'Hard Rock Stadium',
    homeScore: 0,
    awayScore: 0,
  },
]

async function doSeed(): Promise<GlobalSeedResult> {
  const result: GlobalSeedResult = {
    leaguesCreated: 0,
    teamsCreated: 0,
    playersCreated: 0,
    gamesCreated: 0,
    statsCreated: 0,
  }

  // Idempotent: skip if any team already exists.
  const existingTeams = await count('teams', [])
  if (existingTeams > 0) return result

  // 1) League + divisions
  const league = await create<{ id: string }>('leagues', {
    name: 'Premier Division',
    sport: 'soccer',
    season: '2026',
    division_count: 2,
    status: 'active',
    owner_user_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  if (league.data) result.leaguesCreated++
  const leagueId = league.data?.id ?? null

  const divisionByName: Record<string, string> = {}
  if (leagueId) {
    for (const divName of ['East', 'West']) {
      const div = await create<{ id: string }>('divisions', {
        league_id: leagueId,
        name: divName,
        conference: 'Premier',
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (div.data) divisionByName[divName] = div.data.id
    }
  }

  // 2) Teams keyed by abbreviation
  const teamByAbbr: Record<string, string> = {}
  for (const tm of TEAMS) {
    const created = await create<{ id: string }>('teams', {
      league_id: leagueId,
      division_id: divisionByName[tm.division] ?? null,
      name: tm.name,
      abbreviation: tm.abbr,
      city: tm.city,
      logo_url: tm.logo,
      primary_color: tm.primary,
      secondary_color: tm.secondary,
      division: tm.division,
      owner_user_id: null,
      wins: tm.wins,
      losses: tm.losses,
      draws: tm.draws,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (created.data) {
      result.teamsCreated++
      teamByAbbr[tm.abbr] = created.data.id
    }
  }

  // 3) Players + roster entries
  const playerByName: Record<string, { id: string; teamId: string }> = {}
  for (const p of PLAYERS) {
    const teamId = teamByAbbr[p.team]
    if (!teamId) continue
    const created = await create<{ id: string }>('players', {
      team_id: teamId,
      first_name: p.first,
      last_name: p.last,
      name: `${p.first} ${p.last}`,
      jersey_number: p.jersey,
      position: p.pos,
      height: null,
      weight: null,
      photo_url: `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(p.first + p.last)}`,
      birthdate: null,
      status: p.status ?? 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (created.data) {
      result.playersCreated++
      playerByName[`${p.first} ${p.last}`] = { id: created.data.id, teamId }
      await create('roster_entries', {
        team_id: teamId,
        player_id: created.data.id,
        joined_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        role: p.pos === 'Goalkeeper' ? 'starter' : 'starter',
        created_at: new Date(),
      })
    }
  }

  // 4) Games
  const gameIds: string[] = []
  for (const g of GAMES) {
    const homeId = teamByAbbr[g.homeAbbr]
    const awayId = teamByAbbr[g.awayAbbr]
    if (!homeId || !awayId) continue
    const day = new Date()
    day.setUTCDate(day.getUTCDate() + g.daysOffset)
    day.setUTCHours(g.hour, 0, 0, 0)
    const created = await create<{ id: string }>('games', {
      league_id: leagueId,
      season: '2026',
      week: Math.max(1, 12 + g.daysOffset),
      home_team_id: homeId,
      away_team_id: awayId,
      scheduled_at: day,
      date: day,
      time: `${String(g.hour).padStart(2, '0')}:00`,
      venue: g.venue,
      home_score: g.homeScore ?? 0,
      away_score: g.awayScore ?? 0,
      status: g.status,
      period: g.period ?? null,
      game_clock: g.clock ?? null,
      started_at: g.status === 'in_progress' || g.status === 'final' ? day : null,
      ended_at: g.status === 'final' ? day : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (created.data) {
      result.gamesCreated++
      gameIds.push(created.data.id)
    }
  }

  // 5) Player stats — one row per player against the most recent final
  // game so leaderboards aggregate sensibly. Stuff non-canonical
  // statistics (saves/shots/goals) into `extra` so the leaders endpoint
  // can surface them via stat aliases.
  const lastGameId = gameIds[6] ?? gameIds[0] ?? null
  for (const p of PLAYERS) {
    const player = playerByName[`${p.first} ${p.last}`]
    if (!player || !lastGameId) continue
    const extra: Record<string, number> = {}
    if (p.saves !== undefined) extra.saves = p.saves
    if (p.shots !== undefined) extra.shots = p.shots
    if (p.goals !== undefined) extra.goals = p.goals
    const stat = await create('player_stats', {
      match_id: lastGameId,
      player_id: player.id,
      team_id: player.teamId,
      points: p.points,
      assists: p.assists,
      rebounds: p.rebounds,
      fouls: p.fouls,
      minutes_played: p.minutes,
      // jsonb columns must receive a stringified JSON value
      extra: JSON.stringify(extra),
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (stat.data) result.statsCreated++
  }

  // 6) A handful of game_events on the in-progress game so MatchDetail
  // shows a play-by-play feed.
  const inProgressGameId = gameIds.find((_, idx) => GAMES[idx]?.status === 'in_progress')
  if (inProgressGameId) {
    const atlId = teamByAbbr['ATL']
    const bosId = teamByAbbr['BOS']
    const marquez = playerByName['Diego Marquez']
    const reeves = playerByName['Jamar Reeves']
    const petrov = playerByName['Aleksei Petrov']
    const events = [
      {
        period: 1,
        clock: '12:34',
        team: atlId,
        player: marquez?.id,
        type: 'goal',
        desc: 'Marquez slots home off a corner',
        sh: 1,
        sa: 0,
      },
      {
        period: 1,
        clock: '21:08',
        team: bosId,
        player: petrov?.id,
        type: 'goal',
        desc: 'Petrov equalizes on a counter',
        sh: 1,
        sa: 1,
      },
      {
        period: 2,
        clock: '08:45',
        team: atlId,
        player: reeves?.id,
        type: 'goal',
        desc: 'Reeves header from a free kick',
        sh: 2,
        sa: 1,
      },
      {
        period: 2,
        clock: '34:12',
        team: bosId,
        player: petrov?.id,
        type: 'goal',
        desc: "Petrov's second of the night",
        sh: 2,
        sa: 2,
      },
      {
        period: 3,
        clock: '02:55',
        team: atlId,
        player: marquez?.id,
        type: 'goal',
        desc: 'Marquez! Brace and the lead.',
        sh: 3,
        sa: 2,
      },
      {
        period: 3,
        clock: '04:21',
        team: atlId,
        player: null,
        type: 'sub',
        desc: 'Tactical substitution',
        sh: 3,
        sa: 2,
      },
    ]
    for (const ev of events) {
      await create('game_events', {
        game_id: inProgressGameId,
        type: ev.type,
        description: ev.desc,
        player_id: ev.player ?? null,
        team_id: ev.team ?? null,
        period: ev.period,
        game_clock: ev.clock,
        score_home: ev.sh,
        score_away: ev.sa,
        occurred_at: new Date(),
        created_at: new Date(),
      })
    }
  }

  logger.info('seedDemoOnce: sports-league populated', result)
  return result
}

/** Idempotent global seeder — runs ONCE per database. Subsequent calls
 *  return immediately. Concurrent first-callers share the same promise
 *  so we never double-seed under load. */
export async function seedDemoOnce(): Promise<GlobalSeedResult> {
  if (seedingPromise) return seedingPromise
  seedingPromise = doSeed().catch((err) => {
    logger.warn(err)
    seedingPromise = null
    return {
      leaguesCreated: 0,
      teamsCreated: 0,
      playersCreated: 0,
      gamesCreated: 0,
      statsCreated: 0,
    }
  })
  return seedingPromise
}

/** Per-user seed: auto-favorite the leader + an underdog so /settings
 *  + push notifications have something to react to on first signup.
 *  Idempotent on user_id. Best-effort. */
export async function seedFavoritesForUser(userId: string): Promise<void> {
  if (!userId) return
  try {
    await seedDemoOnce()
    const existing = await count('favorite_teams', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existing > 0) return
    const rows = await query<{ id: string; abbr: string }>(
      `SELECT id, abbreviation as abbr FROM public.teams WHERE abbreviation IN ('ATL', 'CHI') ORDER BY abbreviation`,
      [],
    )
    for (const t of rows.rows) {
      await create('favorite_teams', {
        user_id: userId,
        team_id: t.id,
        created_at: new Date(),
      })
    }
    // Welcome notification so /notifications isn't empty
    await create('notifications', {
      user_id: userId,
      type: 'welcome',
      title: 'Welcome to the league',
      body: 'We pinned Atlas United and Chicago Surge to your favorites — toggle alerts in Settings.',
      href: '/settings',
      read: false,
      created_at: new Date(),
    })
  } catch (err) {
    logger.warn(err)
  }
}
