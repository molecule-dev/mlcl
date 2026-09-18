/**
 * Favorite teams handler — strictly owner-scoped.
 *
 * Drives the "follow your team → push notifications" flow listed in
 * INVENTORY user flow #1. Every read and write filters by the calling
 * user's id; no row is ever returned to anyone other than its owner.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { seedFavoritesForUser } from './_seed.js'

const router = Router()

const idOf = (req: Request): string => req.params.id as string

const createFavoriteSchema = z.object({
  team_id: z.string().min(1),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    // Best-effort: seed two starter favorites on first GET so /settings
    // and /dashboard "favorite teams" surface non-empty without a manual
    // pick step. Idempotent on user_id.
    await seedFavoritesForUser(userId)
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const favorites = await findMany<{ team_id: string }>('favorite_teams', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    // Hydrate with team rows so the UI doesn't need a second round-trip.
    const teamIds = favorites.map((f) => f.team_id)
    const teams = teamIds.length
      ? await findMany('teams', { where: [{ field: 'id', operator: 'in', value: teamIds }] })
      : []
    const teamsById = new Map(teams.map((tm) => [(tm as Record<string, string>).id, tm]))
    res.json({
      data: favorites.map((f) => ({ ...f, team: teamsById.get(f.team_id) ?? null })),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createFavoriteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    // Seed the user's two starter favorites (ATL+CHI) on first write too — not
    // just on first read. Otherwise a brand-new account that POSTs a third
    // favorite first would only ever have that single row, never the seed pair.
    await seedFavoritesForUser(userId)
    const body = req.body as z.infer<typeof createFavoriteSchema>
    const team = await findById('teams', body.team_id)
    if (!team) {
      res
        .status(404)
        .json({ error: t('teams.notFound', undefined, { defaultValue: 'Team not found' }) })
      return
    }

    const existing = await findOne('favorite_teams', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'team_id', operator: '=', value: body.team_id },
    ])
    if (existing) {
      res.status(200).json(existing)
      return
    }

    const result = await create('favorite_teams', {
      user_id: userId,
      team_id: body.team_id,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const fav = await findById<{ user_id?: string }>('favorite_teams', idOf(req))
    if (!fav || fav.user_id !== userId) {
      // Indistinguishable 404 — no information leak about whose row this is.
      res.status(404).json({
        error: t('favoriteTeams.notFound', undefined, { defaultValue: 'Favorite not found' }),
      })
      return
    }
    await deleteById('favorite_teams', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
