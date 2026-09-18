/**
 * Stats handler — public read aggregations over `player_stats`.
 *
 * Drives the Stats leaderboards page. Sport-agnostic: returns the basic
 * canonical columns plus anything in the `extra` JSONB.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoOnce } from './_seed.js'

const router = Router()

const playerIdOf = (req: Request): string => req.params.playerId as string
const statOf = (req: Request): string => req.params.stat as string

// Canonical stored columns on `player_stats`.
const STAT_FIELDS = ['points', 'assists', 'rebounds', 'fouls', 'minutes_played'] as const
type StatField = (typeof STAT_FIELDS)[number]

// Sport-specific aliases that read from the `extra` JSONB column when
// the column itself doesn't exist. Frontend asks for `scoring`/`saves`/
// `shots`/`goals` etc.; we map them to `extra.<key>` and aggregate.
const EXTRA_STAT_KEYS = ['saves', 'shots', 'goals', 'rebounds_total', 'tackles', 'blocks'] as const
type ExtraStatKey = (typeof EXTRA_STAT_KEYS)[number]

// Aliases — frontend uses friendly names, server resolves to a canonical
// or extra key. Example: `scoring` → `points` (basketball) or `goals` (soccer).
// We keep both candidates and pick whichever has data; falls back to `points`.
const ALIASES: Record<string, { canonical?: StatField; extra?: ExtraStatKey }[]> = {
  scoring: [{ extra: 'goals' }, { canonical: 'points' }],
  goals: [{ extra: 'goals' }],
  saves: [{ extra: 'saves' }],
  shots: [{ extra: 'shots' }],
}

const ALL_STAT_KEYS = [
  ...STAT_FIELDS,
  ...EXTRA_STAT_KEYS,
  ...Object.keys(ALIASES),
] as readonly string[]

const leaderParamSchema = z.object({
  stat: z.string().refine((s) => ALL_STAT_KEYS.includes(s), {
    message: `stat must be one of: ${ALL_STAT_KEYS.join(', ')}`,
  }),
})

const leaderQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
  match_id: z.string().optional(),
})

const playerParamSchema = z.object({
  playerId: z.string().min(1),
})

interface StatRow {
  player_id: string
  team_id?: string | null
  match_id?: string | null
  points?: number | string
  assists?: number | string
  rebounds?: number | string
  fouls?: number | string
  minutes_played?: number | string
  extra?: Record<string, unknown>
}

function readStatValue(
  row: StatRow,
  target: { canonical?: StatField; extra?: ExtraStatKey },
): number {
  if (target.canonical) {
    return Number((row as unknown as Record<string, unknown>)[target.canonical] ?? 0)
  }
  if (target.extra) {
    const extra = (row.extra ?? {}) as Record<string, unknown>
    return Number(extra[target.extra] ?? 0)
  }
  return 0
}

function resolveStatTargets(stat: string): { canonical?: StatField; extra?: ExtraStatKey }[] {
  if ((STAT_FIELDS as readonly string[]).includes(stat)) {
    return [{ canonical: stat as StatField }]
  }
  if ((EXTRA_STAT_KEYS as readonly string[]).includes(stat)) {
    return [{ extra: stat as ExtraStatKey }]
  }
  return ALIASES[stat] ?? [{ canonical: 'points' as StatField }]
}

router.get(
  '/leaders/:stat',
  validateParams(leaderParamSchema),
  validateQuery(leaderQuerySchema),
  async (req: Request, res: Response) => {
    try {
      // Best-effort: ensure the demo seed exists on first read so
      // /stats/leaders never returns an empty leaderboard for a fresh app.
      await seedDemoOnce()

      const statKey = statOf(req)
      const q = req.query as unknown as z.infer<typeof leaderQuerySchema>
      const where: WhereCondition[] = []
      if (q.match_id) where.push({ field: 'match_id', operator: '=', value: q.match_id })

      const targets = resolveStatTargets(statKey)

      const rows = await findMany<StatRow>('player_stats', {
        where,
        // `points` is always present so we can sort by it as a baseline
        // (resolveStatTargets re-sorts in JS by the actual target).
        orderBy: [{ field: 'points', direction: 'desc' }],
        limit: 1000,
      })

      // Pick the first target that yields any non-zero values; otherwise
      // fall through to the last target (the safe fallback).
      let activeTarget = targets[targets.length - 1]
      for (const target of targets) {
        const hasData = rows.some((r) => readStatValue(r, target) > 0)
        if (hasData) {
          activeTarget = target
          break
        }
      }

      // Aggregate per player when we're aggregating over a season (no match_id
      // filter). For per-match leaders the rows are already deduped.
      const aggregated = q.match_id
        ? rows.map((r) => ({
            player_id: r.player_id,
            team_id: (r.team_id ?? null) as string | null,
            total: readStatValue(r, activeTarget),
          }))
        : Object.values(
            rows.reduce<
              Record<string, { player_id: string; team_id: string | null; total: number }>
            >((acc, r) => {
              if (!acc[r.player_id]) {
                acc[r.player_id] = {
                  player_id: r.player_id,
                  team_id: (r.team_id ?? null) as string | null,
                  total: 0,
                }
              }
              acc[r.player_id].total += readStatValue(r, activeTarget)
              return acc
            }, {}),
          )

      // Hydrate with player + team name for friendlier responses.
      const playerIds = Array.from(new Set(aggregated.map((r) => r.player_id)))
      const teamIds = Array.from(
        new Set(aggregated.map((r) => r.team_id).filter(Boolean) as string[]),
      )
      const [players, teams] = await Promise.all([
        playerIds.length
          ? findMany<Record<string, unknown>>('players', {
              where: [{ field: 'id', operator: 'in', value: playerIds }],
            })
          : Promise.resolve([]),
        teamIds.length
          ? findMany<Record<string, unknown>>('teams', {
              where: [{ field: 'id', operator: 'in', value: teamIds }],
            })
          : Promise.resolve([]),
      ])
      const playerById = new Map(players.map((p) => [String(p.id), p]))
      const teamById = new Map(teams.map((tm) => [String(tm.id), tm]))

      const unitFor = (key: string): string => {
        if (key === 'scoring' || key === 'goals') return 'GOALS'
        if (key === 'assists') return 'AST'
        if (key === 'saves') return 'SAVES'
        if (key === 'shots') return 'SHOTS'
        if (key === 'points') return 'PTS'
        if (key === 'rebounds') return 'REB'
        if (key === 'fouls') return 'F'
        if (key === 'minutes_played') return 'MIN'
        return key.toUpperCase()
      }

      const data = aggregated
        .sort((a, b) => b.total - a.total)
        .slice(0, q.limit ?? 25)
        .filter((r) => r.total > 0 || aggregated.length <= (q.limit ?? 25))
        .map((r, idx) => {
          const playerRow = playerById.get(r.player_id) as Record<string, unknown> | undefined
          const teamRow = r.team_id
            ? (teamById.get(String(r.team_id)) as Record<string, unknown> | undefined)
            : undefined
          return {
            rank: idx + 1,
            player_id: r.player_id,
            player: playerRow ?? null,
            team_id: r.team_id ?? null,
            team: teamRow ?? null,
            value: r.total,
            // Convenience fields that match the frontend StatLeader shape so
            // the UI doesn't need to drill into nested `player`/`team` objects.
            name:
              playerRow?.name ??
              `${playerRow?.first_name ?? ''} ${playerRow?.last_name ?? ''}`.trim(),
            team_abbr: teamRow?.abbreviation ?? null,
            team_color: teamRow?.primary_color ?? null,
            unit: unitFor(statKey),
            delta: 'flat' as const,
          }
        })
      res.json({ data })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get(
  '/players/:playerId',
  validateParams(playerParamSchema),
  async (req: Request, res: Response) => {
    try {
      // Public read: per INVENTORY auth-rules, player_stats are public read.
      // No user_id ownership check is required here (intentional, not IDOR).
      const player = await findById('players', playerIdOf(req))
      if (!player) {
        res
          .status(404)
          .json({ error: t('players.notFound', undefined, { defaultValue: 'Player not found' }) })
        return
      }
      const stats = await findMany<StatRow>('player_stats', {
        where: [{ field: 'player_id', operator: '=', value: playerIdOf(req) }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      const totals = stats.reduce(
        (acc, r) => {
          for (const f of STAT_FIELDS)
            acc[f] += Number((r as unknown as Record<string, number>)[f] ?? 0)
          return acc
        },
        { points: 0, assists: 0, rebounds: 0, fouls: 0, minutes_played: 0 },
      )
      res.json({ player, stats, totals })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
