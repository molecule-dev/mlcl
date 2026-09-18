/**
 * `/api/favorites` — saved venues per signed-in user.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, deleteMany, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { decorateFavorites } from './_decorate.js'

const router = Router()

const addSchema = z.object({
  venue_id: z.string().min(1),
})

const venueParamSchema = z.object({ venueId: z.string().min(1) })

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const rows = await findMany<Record<string, unknown>>('favorites', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  const data = await decorateFavorites(rows)
  res.json({ data })
})

router.post('/', validateBody(addSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { venue_id } = req.body as z.infer<typeof addSchema>

  // Idempotent: if a favorite already exists for this (user, venue),
  // return it instead of throwing on the unique-constraint collision.
  const existing = await findOne<Record<string, unknown>>('favorites', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'venue_id', operator: '=', value: venue_id },
  ])
  if (existing) {
    const decorated = await decorateFavorites([existing])
    res.status(200).json(decorated[0] ?? null)
    return
  }
  try {
    const result = await create<Record<string, unknown>>('favorites', {
      user_id: userId,
      venue_id,
      created_at: new Date(),
    })
    const fav = (result.data ?? result) as Record<string, unknown>
    const decorated = await decorateFavorites([fav])
    res.status(201).json(decorated[0] ?? null)
  } catch (err) {
    logger.error({ err, userId, venue_id }, '[favorites.add] insert failed')
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  const existing = await findOne<Record<string, unknown>>('favorites', [
    { field: 'id', operator: '=', value: id },
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!existing) {
    res.status(204).send()
    return
  }
  await deleteById('favorites', id)
  res.status(204).send()
})

router.delete(
  '/by-venue/:venueId',
  validateParams(venueParamSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const venueId = String(req.params.venueId)
    await deleteMany('favorites', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'venue_id', operator: '=', value: venueId },
    ])
    res.status(204).send()
  },
)

export default router
