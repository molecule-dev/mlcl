/**
 * Schedule / scores API → MatchCard prop shape mapper.
 *
 * The API returns games with `home_team` / `away_team` joined as full
 * row objects (id, name, abbreviation, primary_color, …). The MatchCard
 * component expects a much smaller `home` / `away` shape with `name`,
 * `abbreviation`, `color`, `score`. Without the mapper, MatchCard
 * crashes with "Cannot read properties of undefined (reading 'color')".
 *
 * This module is the single boundary that translates API shapes into UI
 * shapes — used by every page that renders a `<MatchCard>` (Dashboard,
 * Matches, Schedule, MatchDetail).
 */

import type { Match, MatchTeam } from '../components/MatchCard.js'

interface ApiTeamRow {
  id?: string
  name?: string
  abbreviation?: string | null
  city?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  logo_url?: string | null
}

export interface ScheduleGame {
  id: string
  scheduled_at?: string | null
  date?: string | null
  time?: string | null
  venue?: string | null
  status?: string
  period?: number | string | null
  game_clock?: string | null
  home_score?: number | null
  away_score?: number | null
  home_team?: ApiTeamRow | null
  away_team?: ApiTeamRow | null
  home_team_id?: string
  away_team_id?: string
}

const STATUS_MAP: Record<string, Match['status']> = {
  live: 'live',
  in_progress: 'in_progress',
  scheduled: 'scheduled',
  final: 'final',
  postponed: 'postponed',
}

function toTeam(
  t: ApiTeamRow | null | undefined,
  fallbackId?: string,
  score?: number | null,
): MatchTeam | null {
  if (!t || !t.name) {
    if (!fallbackId) return null
    return {
      id: fallbackId,
      name: 'Team',
      abbreviation: undefined,
      color: '#94a3b8',
      logo_url: null,
      score: score ?? null,
    }
  }
  return {
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation ?? undefined,
    color: t.primary_color ?? '#94a3b8',
    logo_url: t.logo_url ?? null,
    score: score ?? null,
  }
}

export function toMatch(g: ScheduleGame | null | undefined): Match | null {
  if (!g || !g.id) return null
  const home = toTeam(g.home_team, g.home_team_id, g.home_score)
  const away = toTeam(g.away_team, g.away_team_id, g.away_score)
  if (!home || !away) return null
  const status: Match['status'] = STATUS_MAP[g.status ?? 'scheduled'] ?? 'scheduled'
  const iso = g.scheduled_at ?? g.date ?? undefined
  let time = g.time ?? undefined
  if (!time && iso) {
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) {
      const hh = d.getHours().toString().padStart(2, '0')
      const mm = d.getMinutes().toString().padStart(2, '0')
      time = `${hh}:${mm}`
    }
  }
  return {
    id: g.id,
    date: iso,
    time,
    venue: g.venue ?? null,
    status,
    period: g.period ?? undefined,
    game_clock: g.game_clock ?? undefined,
    home,
    away,
  }
}
