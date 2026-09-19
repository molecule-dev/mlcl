/**
 * `/api/rooms` — CRUD for the physical room units (number, floor, type,
 * housekeeping status). The status board drives the Dashboard tiles.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

export const ROOM_STATUSES = ['vacant_clean', 'occupied', 'cleaning', 'out_of_order'] as const

const listQuerySchema = z.object({
  status: z.enum(ROOM_STATUSES).optional(),
  room_type_id: z.string().uuid().optional(),
})

const createSchema = z.object({
  number: z.string().min(1).max(12),
  floor: z.coerce.number().int().min(-5).max(120),
  room_type_id: z.string().uuid(),
  status: z.enum(ROOM_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
})

const updateSchema = z.object({
  number: z.string().min(1).max(12).optional(),
  floor: z.coerce.number().int().min(-5).max(120).optional(),
  room_type_id: z.string().uuid().optional(),
  status: z.enum(ROOM_STATUSES).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { status, room_type_id } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (room_type_id) where.push({ field: 'room_type_id', operator: '=', value: room_type_id })
    const rows = await findMany('rooms', {
      ...(where.length > 0 ? { where } : {}),
      orderBy: [
        { field: 'floor', direction: 'asc' },
        { field: 'number', direction: 'asc' },
      ],
    })
    res.json({ data: rows })
  } catch (error) {
    logger.error('rooms.list', error)
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
    const result = await create('rooms', {
      number: body.number,
      floor: body.floor,
      room_type_id: body.room_type_id,
      status: body.status ?? 'vacant_clean',
      notes: body.notes ?? null,
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('rooms.create', error)
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
      if (body.number !== undefined) patch.number = body.number
      if (body.floor !== undefined) patch.floor = body.floor
      if (body.room_type_id !== undefined) patch.room_type_id = body.room_type_id
      if (body.status !== undefined) patch.status = body.status
      if (body.notes !== undefined) patch.notes = body.notes
      const result = await updateById('rooms', getParamId(req), patch)
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('rooms.update', error)
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
    await deleteById('rooms', getParamId(req))
    res.status(204).end()
  } catch (error) {
    logger.error('rooms.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
