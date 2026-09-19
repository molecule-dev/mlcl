/**
 * Guest list CRUD.
 *
 * GET    /?status=&side=&q=   list the caller's guests (name-ascending)
 * POST   /                    add a guest
 * PUT    /:id                 edit a guest (status, meal, contact, …)
 * DELETE /:id                 remove a guest (their seat is released by FK cascade)
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { findWeddingForUser } from './_seed.js'

const router = Router()

const RSVP_STATUSES = ['pending', 'yes', 'no', 'maybe'] as const
const SIDES = ['partner_a', 'partner_b', 'both'] as const

const listQuerySchema = z.object({
  status: z.enum(RSVP_STATUSES).optional(),
  side: z.enum(SIDES).optional(),
  q: z.string().optional(),
  limit: z.string().optional(),
})

const createGuestSchema = z.object({
  name: z.string().min(1).max(200),
  side: z.enum(SIDES).optional(),
  group_name: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  rsvp_status: z.enum(RSVP_STATUSES).optional(),
  meal_choice: z.string().max(120).optional().nullable(),
  plus_ones: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).optional().nullable(),
})

const updateGuestSchema = createGuestSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { status, side, q, limit } = req.query as Record<string, string | undefined>

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'rsvp_status', operator: '=', value: status })
    if (side) where.push({ field: 'side', operator: '=', value: side })
    if (q) where.push({ field: 'name', operator: 'ilike', value: q })

    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const guests = await findMany('guests', {
      where,
      orderBy,
      limit: Number(limit) || 500,
    })
    res.json(guests)
  } catch (err) {
    logger.error('guests GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createGuestSchema), async (req: Request, res: Response) => {
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
    const result = await create('guests', {
      ...req.body,
      user_id: userId,
      wedding_id: String(wedding.id),
      rsvp_status: req.body.rsvp_status ?? 'pending',
      plus_ones: req.body.plus_ones ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('guests POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function ownedGuest(userId: string, id: string): Promise<Record<string, unknown> | null> {
  const guest = await findById<Record<string, unknown>>('guests', id)
  if (!guest || String(guest.user_id) !== userId) return null
  return guest
}

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateGuestSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      if (!(await ownedGuest(userId, id))) {
        return res
          .status(404)
          .json({ error: t('guests.notFound', {}, { defaultValue: 'Guest not found' }) })
      }
      const writes: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
      // Any manual status change by the couple counts as a response.
      if (req.body.rsvp_status && req.body.rsvp_status !== 'pending') {
        writes.responded_at = new Date().toISOString()
      }
      const result = await updateById('guests', id, writes)
      res.json(result.data)
    } catch (err) {
      logger.error('guests PUT :id failed', err)
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
    if (!(await ownedGuest(userId, id))) {
      return res
        .status(404)
        .json({ error: t('guests.notFound', {}, { defaultValue: 'Guest not found' }) })
    }
    await deleteById('guests', id)
    res.status(204).end()
  } catch (err) {
    logger.error('guests DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
