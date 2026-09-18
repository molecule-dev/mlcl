/**
 * Players handler — public read, league-operator (admin) write.
 *
 * The `players` table is shared-league catalog data with no per-user owner
 * column; the seeded teams it links to carry `owner_user_id = NULL`, so the
 * previous "team owner, else any authenticated user" check fell OPEN and let any
 * signed-in user mutate the roster. Writes are now admin-gated via
 * `requireAdmin` (see `middleware/require-admin.ts`). Public read so
 * non-authenticated browsing works for the marketing-facing pages.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import { seedDemoOnce } from './_seed.js'

const router = Router()

const idOf = (req: Request): string => req.params.id as string

const listQuerySchema = z.object({
  team_id: z.string().optional(),
  status: z.enum(['active', 'injured', 'reserve']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

const createPlayerSchema = z
  .object({
    team_id: z.string().min(1).nullable().optional(),
    first_name: z.string().min(1).optional(),
    last_name: z.string().optional(),
    name: z.string().min(1).optional(),
    jersey_number: z.coerce.number().int().nonnegative().optional(),
    position: z.string().optional(),
    height: z.coerce.number().nonnegative().optional(),
    weight: z.coerce.number().nonnegative().optional(),
    photo_url: z.string().url().nullable().optional(),
    birthdate: z.string().optional(),
    status: z.enum(['active', 'injured', 'reserve']).optional(),
  })
  .refine((d) => Boolean(d.first_name || d.name), {
    message: 'first_name or name is required',
  })

const updatePlayerSchema = z.object({
  team_id: z.string().nullable().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().optional(),
  name: z.string().min(1).optional(),
  jersey_number: z.coerce.number().int().nonnegative().optional(),
  position: z.string().optional(),
  height: z.coerce.number().nonnegative().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  photo_url: z.string().url().nullable().optional(),
  birthdate: z.string().optional(),
  status: z.enum(['active', 'injured', 'reserve']).optional(),
})

// Map full position names to single-letter codes the UI filter buttons use.
// Players seeded with "Forward" / "Midfielder" / "Defender" / "Goalkeeper"
// would otherwise never match the F / M / D / GK filter chips on /players.
const POSITION_SHORT: Record<string, string> = {
  forward: 'F',
  midfielder: 'M',
  defender: 'D',
  goalkeeper: 'GK',
}

interface TeamRow {
  id: string
  name?: string | null
  abbreviation?: string | null
  primary_color?: string | null
  logo_url?: string | null
}
interface PlayerStatRow {
  player_id: string
  team_id?: string
  points?: number | string | null
  assists?: number | string | null
  minutes_played?: number | string | null
  extra?: { saves?: number; shots?: number; goals?: number } | null
}
interface PlayerRow {
  id: string
  team_id?: string | null
  jersey_number?: number | null
  position?: string | null
  [k: string]: unknown
}

function num(x: unknown): number {
  return typeof x === 'number' ? x : Number(x ?? 0) || 0
}

function aggregateStats(stats: PlayerStatRow[]): {
  points: number
  assists: number
  goals: number
  saves: number
  shots: number
  minutes: number
  games: number
} {
  const acc = { points: 0, assists: 0, goals: 0, saves: 0, shots: 0, minutes: 0, games: 0 }
  for (const s of stats) {
    acc.points += num(s.points)
    acc.assists += num(s.assists)
    acc.minutes += num(s.minutes_played)
    acc.goals += num(s.extra?.goals)
    acc.saves += num(s.extra?.saves)
    acc.shots += num(s.extra?.shots)
    acc.games += 1
  }
  return acc
}

function hydratePlayer(
  p: PlayerRow,
  team: TeamRow | undefined,
  agg: ReturnType<typeof aggregateStats>,
): PlayerRow & {
  jersey: number | null
  position_short: string | null
  position_full: string | null
  team_name: string | null
  team_abbr: string | null
  team_color: string | null
  team_logo: string | null
  goals: number
  assists: number
  saves: number
  shots: number
  minutes: number
  games_played: number
  points: number
  shooting_pct: number
} {
  const posKey = String(p.position ?? '')
    .trim()
    .toLowerCase()
  return {
    ...p,
    jersey: p.jersey_number ?? null,
    position_short: POSITION_SHORT[posKey] ?? null,
    position_full: p.position ?? null,
    position: POSITION_SHORT[posKey] ?? p.position ?? null,
    team_name: team?.name ?? null,
    team_abbr: team?.abbreviation ?? null,
    team_color: team?.primary_color ?? null,
    team_logo: team?.logo_url ?? null,
    goals: agg.goals,
    assists: agg.assists,
    saves: agg.saves,
    shots: agg.shots,
    minutes: agg.minutes,
    games_played: agg.games,
    points: agg.points,
    shooting_pct: agg.shots > 0 ? agg.goals / agg.shots : 0,
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const q = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (q.team_id) where.push({ field: 'team_id', operator: '=', value: q.team_id })
    if (q.status) where.push({ field: 'status', operator: '=', value: q.status })
    if (q.q) where.push({ field: 'last_name', operator: 'ilike', value: q.q })

    const pageNum = q.page ?? 1
    const limitNum = q.limit ?? 50

    const players = await findMany<PlayerRow>('players', {
      where,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      orderBy: [
        { field: 'last_name', direction: 'asc' },
        { field: 'first_name', direction: 'asc' },
      ],
    })
    const teams = await findMany<TeamRow>('teams', { limit: 500 })
    const teamById: Record<string, TeamRow> = Object.fromEntries(teams.map((tm) => [tm.id, tm]))
    const stats = await findMany<PlayerStatRow>('player_stats', { limit: 1000 })
    const statsByPlayer: Record<string, PlayerStatRow[]> = {}
    for (const s of stats) {
      const arr = statsByPlayer[s.player_id] ?? (statsByPlayer[s.player_id] = [])
      arr.push(s)
    }
    const hydrated = players.map((p) =>
      hydratePlayer(
        p,
        p.team_id ? teamById[p.team_id] : undefined,
        aggregateStats(statsByPlayer[p.id] ?? []),
      ),
    )
    res.json({ data: hydrated })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const player = await findById<PlayerRow>('players', idOf(req))
    if (!player) {
      res
        .status(404)
        .json({ error: t('players.notFound', undefined, { defaultValue: 'Player not found' }) })
      return
    }
    const stats = await findMany<PlayerStatRow>('player_stats', {
      where: [{ field: 'player_id', operator: '=', value: idOf(req) }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 25,
    })
    const team = player.team_id ? await findById<TeamRow>('teams', String(player.team_id)) : null
    const hydrated = hydratePlayer(player, team ?? undefined, aggregateStats(stats))
    res.json({ ...hydrated, stats })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createPlayerSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createPlayerSchema>
      const result = await create('players', {
        team_id: body.team_id ?? null,
        first_name: body.first_name ?? body.name?.split(' ').slice(0, -1).join(' ') ?? '',
        last_name: body.last_name ?? body.name?.split(' ').slice(-1).join(' ') ?? '',
        name: body.name ?? null,
        jersey_number: body.jersey_number ?? null,
        position: body.position ?? '',
        height: body.height ?? null,
        weight: body.weight ?? null,
        photo_url: body.photo_url ?? null,
        birthdate: body.birthdate ?? null,
        status: body.status ?? 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(updatePlayerSchema),
  async (req: Request, res: Response) => {
    try {
      const player = await findById<{ team_id?: string | null }>('players', idOf(req))
      if (!player) {
        res
          .status(404)
          .json({ error: t('players.notFound', undefined, { defaultValue: 'Player not found' }) })
        return
      }

      const result = await updateById('players', idOf(req), {
        ...(req.body as Record<string, unknown>),
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/:id',
  requireAdmin,
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const player = await findById<{ team_id?: string | null }>('players', idOf(req))
      if (!player) {
        res
          .status(404)
          .json({ error: t('players.notFound', undefined, { defaultValue: 'Player not found' }) })
        return
      }
      await deleteById('players', idOf(req))
      res.status(204).end()
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
