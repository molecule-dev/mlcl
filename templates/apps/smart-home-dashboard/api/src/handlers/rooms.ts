import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { MutationResult } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

function unwrap<T>(result: MutationResult<T> | T): T {
  if (
    result &&
    typeof result === 'object' &&
    'data' in (result as object) &&
    'affected' in (result as object)
  ) {
    return (result as MutationResult<T>).data ?? (result as unknown as T)
  }
  return result as T
}

const router = Router()

const createRoomSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional().nullable(),
  floor: z.number().int().optional().default(1),
  area_sqft: z.number().int().optional().nullable(),
})

const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
  floor: z.number().int().optional(),
  area_sqft: z.number().int().optional().nullable(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rooms = await findMany('rooms', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(rooms)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const room = await findById<Record<string, unknown>>('rooms', id)
    if (!room || room.user_id !== userId) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    res.json(room)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createRoomSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { name, icon, floor, area_sqft } = req.body
    const result = await create('rooms', {
      user_id: userId,
      name,
      icon: icon ?? null,
      floor: floor ?? 1,
      area_sqft: area_sqft ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateRoomSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const room = await findById<Record<string, unknown>>('rooms', id)
    if (!room || room.user_id !== userId) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    const result = await updateById('rooms', id, { ...req.body, updated_at: new Date() })
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const room = await findById<Record<string, unknown>>('rooms', id)
    if (!room || room.user_id !== userId) {
      res.status(404).json({ error: t('rooms.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    await deleteById('rooms', id)
    res.status(204).end()
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
