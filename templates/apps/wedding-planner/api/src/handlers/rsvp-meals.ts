/**
 * RSVP meal options — the menu the couple offers on the RSVP settings page
 * and the public RSVP form.
 *
 * GET    /      list meal options (position-ascending)
 * POST   /      add an option
 * PUT    /:id   edit an option
 * DELETE /:id   remove an option
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { findWeddingForUser } from './_seed.js'

const router = Router()

const createMealSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional().nullable(),
  position: z.number().int().min(0).optional(),
})

const updateMealSchema = createMealSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const meals = await findMany('rsvp_meals', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 50,
    })
    res.json(meals)
  } catch (err) {
    logger.error('rsvp-meals GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createMealSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    const result = await create('rsvp_meals', {
      user_id: userId,
      wedding_id: String(wedding.id),
      name: req.body.name,
      description: req.body.description ?? null,
      position: req.body.position ?? 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('rsvp-meals POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateMealSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const meal = await findById<Record<string, unknown>>('rsvp_meals', id)
      if (!meal || String(meal.user_id) !== userId) {
        return res
          .status(404)
          .json({ error: t('rsvpMeals.notFound', {}, { defaultValue: 'Meal option not found' }) })
      }
      const result = await updateById('rsvp_meals', id, req.body)
      res.json(result.data)
    } catch (err) {
      logger.error('rsvp-meals PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const meal = await findById<Record<string, unknown>>('rsvp_meals', id)
    if (!meal || String(meal.user_id) !== userId) {
      return res
        .status(404)
        .json({ error: t('rsvpMeals.notFound', {}, { defaultValue: 'Meal option not found' }) })
    }
    await deleteById('rsvp_meals', id)
    res.status(204).end()
  } catch (err) {
    logger.error('rsvp-meals DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
