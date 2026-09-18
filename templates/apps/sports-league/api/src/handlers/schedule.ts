/**
 * Schedule (matches/games) handler — public read, league-operator (admin) write.
 *
 * The `games` table is shared-league catalog data with no per-user owner column,
 * and the seeded teams carry `owner_user_id = NULL`, so the previous
 * "owner of either team, else any authenticated user" rule fell OPEN and let any
 * signed-in user mutate the schedule. Writes are now admin-gated via
 * `requireAdmin` (a valid session is not sufficient) — see
 * `middleware/require-admin.ts`.
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
const teamIdOf = (req: Request): string => req.params.teamId as string
const seasonOf = (req: Request): string => req.params.season as string
const weekOf = (req: Request): string => req.params.week as string

const teamIdParamSchema = z.object({ teamId: z.string().min(1) })

const weekParamSchema = z.object({
  season: z.string().min(1),
  week: z.coerce.number().int().nonnegative(),
})

const listQuerySchema = z.object({
  season: z.string().optional(),
  week: z.coerce.number().int().nonnegative().optional(),
  team_id: z.string().optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'live', 'final', 'postponed', 'cancelled'])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

const createGameSchema = z.object({
  home_team_id: z.string().min(1),
  away_team_id: z.string().min(1),
  venue: z.string().optional(),
  date: z.string().min(1),
  time: z.string().optional(),
  season: z.string().optional(),
  week: z.coerce.number().int().nonnegative().optional(),
  league_id: z.string().nullable().optional(),
  scheduled_at: z.string().optional(),
})

const updateGameSchema = z.object({
  venue: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  season: z.string().optional(),
  week: z.coerce.number().int().nonnegative().optional(),
  scheduled_at: z.string().optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'live', 'final', 'postponed', 'cancelled'])
    .optional(),
})

const postponeSchema = z.object({
  scheduled_at: z.string().optional(),
  date: z.string().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    await seedDemoOnce()
    const q = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (q.season) where.push({ field: 'season', operator: '=', value: q.season })
    if (q.week !== undefined) where.push({ field: 'week', operator: '=', value: q.week })
    if (q.team_id) where.push({ field: 'home_team_id', operator: '=', value: q.team_id })
    if (q.status) where.push({ field: 'status', operator: '=', value: q.status })

    const pageNum = q.page ?? 1
    const limitNum = q.limit ?? 50

    const games = await findMany('games', {
      where,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      orderBy: [{ field: 'date', direction: 'asc' }],
    })
    // Hydrate with team rows so the matches grid can render names + colors
    // without N round-trips.
    const teamIds = Array.from(
      new Set(
        games.flatMap((g) => {
          const row = g as Record<string, unknown>
          return [row.home_team_id, row.away_team_id].filter(Boolean) as string[]
        }),
      ),
    )
    const teams = teamIds.length
      ? await findMany('teams', { where: [{ field: 'id', operator: 'in', value: teamIds }] })
      : []
    const teamById = new Map(teams.map((t) => [String((t as Record<string, unknown>).id), t]))
    const hydrated = games.map((g) => {
      const row = g as Record<string, unknown>
      return {
        ...row,
        home_team: row.home_team_id ? (teamById.get(String(row.home_team_id)) ?? null) : null,
        away_team: row.away_team_id ? (teamById.get(String(row.away_team_id)) ?? null) : null,
      }
    })
    res.json({ data: hydrated })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/team/:teamId',
  validateParams(teamIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const home = await findMany('games', {
        where: [{ field: 'home_team_id', operator: '=', value: teamIdOf(req) }],
        orderBy: [{ field: 'date', direction: 'asc' }],
      })
      const away = await findMany('games', {
        where: [{ field: 'away_team_id', operator: '=', value: teamIdOf(req) }],
        orderBy: [{ field: 'date', direction: 'asc' }],
      })
      const all = [...home, ...away].sort((a, b) =>
        String((a as Record<string, unknown>).date ?? '').localeCompare(
          String((b as Record<string, unknown>).date ?? ''),
        ),
      )
      res.json({ data: all })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get(
  '/week/:season/:week',
  validateParams(weekParamSchema),
  async (req: Request, res: Response) => {
    try {
      const games = await findMany('games', {
        where: [
          { field: 'season', operator: '=', value: seasonOf(req) },
          { field: 'week', operator: '=', value: Number(weekOf(req)) },
        ],
        orderBy: [{ field: 'date', direction: 'asc' }],
      })
      res.json({ data: games })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const game = await findById<{ home_team_id?: string; away_team_id?: string }>(
      'games',
      idOf(req),
    )
    if (!game) {
      res
        .status(404)
        .json({ error: t('schedule.notFound', undefined, { defaultValue: 'Game not found' }) })
      return
    }

    const homeTeam = game.home_team_id ? await findById('teams', String(game.home_team_id)) : null
    const awayTeam = game.away_team_id ? await findById('teams', String(game.away_team_id)) : null
    res.json({ ...game, home_team: homeTeam, away_team: awayTeam })
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
  validateBody(createGameSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createGameSchema>

      const homeTeam = await findById<{ owner_user_id?: string | null }>('teams', body.home_team_id)
      if (!homeTeam) {
        res
          .status(404)
          .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
        return
      }
      const awayTeam = await findById<{ owner_user_id?: string | null }>('teams', body.away_team_id)
      if (!awayTeam) {
        res
          .status(404)
          .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
        return
      }

      const result = await create('games', {
        home_team_id: body.home_team_id,
        away_team_id: body.away_team_id,
        venue: body.venue ?? '',
        date: body.date,
        scheduled_at: body.scheduled_at ?? body.date,
        time: body.time ?? null,
        season: body.season ?? '',
        week: body.week ?? null,
        league_id: body.league_id ?? null,
        status: 'scheduled',
        home_score: 0,
        away_score: 0,
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
  validateBody(updateGameSchema),
  async (req: Request, res: Response) => {
    try {
      const game = await findById('games', idOf(req))
      if (!game) {
        res
          .status(404)
          .json({ error: t('schedule.notFound', undefined, { defaultValue: 'Game not found' }) })
        return
      }

      const result = await updateById('games', idOf(req), {
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

router.post(
  '/:id/postpone',
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(postponeSchema),
  async (req: Request, res: Response) => {
    try {
      const game = await findById('games', idOf(req))
      if (!game) {
        res
          .status(404)
          .json({ error: t('schedule.notFound', undefined, { defaultValue: 'Game not found' }) })
        return
      }

      const body = req.body as z.infer<typeof postponeSchema>
      const result = await updateById('games', idOf(req), {
        status: 'postponed',
        scheduled_at: body.scheduled_at ?? null,
        date: body.date ?? null,
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
      const game = await findById('games', idOf(req))
      if (!game) {
        res
          .status(404)
          .json({ error: t('schedule.notFound', undefined, { defaultValue: 'Game not found' }) })
        return
      }
      await deleteById('games', idOf(req))
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
