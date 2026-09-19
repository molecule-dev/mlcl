/**
 * `/api/guests` — CRUD for guest profiles + per-guest stay history.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  search: z.string().min(1).max(120).optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(320).optional(),
  phone: z.string().min(3).max(40).optional(),
  preferred_language: z.string().min(2).max(10).optional(),
  notes: z.string().max(4000).optional(),
})

const updateSchema = createSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { search } = req.query as unknown as z.infer<typeof listQuerySchema>
    const rows = await findMany('guests', {
      ...(search ? { where: [{ field: 'name', operator: 'ilike', value: search }] } : {}),
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json({ data: rows })
  } catch (error) {
    logger.error('guests.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const guest = await findOne('guests', [{ field: 'id', operator: '=', value: getParamId(req) }])
    if (!guest) {
      res.status(404).json({ error: t('guests.notFound', {}, { defaultValue: 'Guest not found' }) })
      return
    }
    const stays = await findMany('reservations', {
      where: [{ field: 'guest_id', operator: '=', value: getParamId(req) }],
      orderBy: [{ field: 'check_in', direction: 'desc' }],
    })
    res.json({ ...guest, stays })
  } catch (error) {
    logger.error('guests.detail', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('guests', {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      preferred_language: body.preferred_language ?? 'en',
      notes: body.notes ?? null,
      stay_count: 0,
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('guests.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      if (!getUserId(res)) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const patch: Record<string, unknown> = {}
      if (body.name !== undefined) patch.name = body.name
      if (body.email !== undefined) patch.email = body.email
      if (body.phone !== undefined) patch.phone = body.phone
      if (body.preferred_language !== undefined) patch.preferred_language = body.preferred_language
      if (body.notes !== undefined) patch.notes = body.notes
      const result = await updateById('guests', getParamId(req), patch)
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('guests.update', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    await deleteById('guests', getParamId(req))
    res.status(204).end()
  } catch (error) {
    logger.error('guests.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
