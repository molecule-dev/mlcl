/**
 * Stat-leader API → StatLeader prop shape mapper.
 *
 * The `/api/stats/leaders/<stat>` endpoint returns rows with hydrated
 * `player` and `team` rows nested inside, like:
 *
 *     { rank, player_id, player: { name, ... }, team: { abbreviation, primary_color, ... }, value, unit }
 *
 * The `<StatLeaderRow />` component expects flat fields `name`,
 * `team_abbr`, `team_color`, `value` (string), `unit`. This mapper is
 * the single boundary that translates the API shape into UI shape.
 */

import type { StatLeader } from '../components/StatLeaderRow.js'

interface ApiLeaderRow {
  rank?: number
  player_id?: string | number
  player?: {
    id?: string
    name?: string
    first_name?: string
    last_name?: string
    photo_url?: string | null
  } | null
  team_id?: string
  team?: {
    id?: string
    name?: string
    abbreviation?: string | null
    primary_color?: string | null
  } | null
  value?: number | string
  unit?: string
}

export function toStatLeader(
  row: ApiLeaderRow | null | undefined,
  fallbackRank: number,
): StatLeader | null {
  if (!row) return null
  const playerName =
    row.player?.name ||
    [row.player?.first_name, row.player?.last_name].filter(Boolean).join(' ').trim() ||
    'Unknown'
  const value = row.value ?? 0
  return {
    player_id: row.player_id ?? row.player?.id ?? `row-${fallbackRank}`,
    rank: row.rank ?? fallbackRank,
    name: playerName,
    team_abbr: row.team?.abbreviation ?? '—',
    team_color: row.team?.primary_color ?? undefined,
    value: typeof value === 'number' ? value.toString() : String(value),
    unit: row.unit ?? '',
  }
}

export function toStatLeaders(rows: unknown[]): StatLeader[] {
  return rows
    .map((r, i) => toStatLeader(r as ApiLeaderRow, i + 1))
    .filter((l): l is StatLeader => l !== null)
}
