import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createGoalSchema = z.object({
  name: z.string().min(1),
  target_amount: z.number().positive(),
  current_amount: z.number().default(0),
  target_date: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().optional(),
  target_date: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const goals = await findMany('goals', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'target_date', direction: 'asc' }],
    })

    res.json(goals)
  } catch (error) {
    logger.error('goals.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const goal = await findById<Record<string, unknown>>('goals', id)

    if (!goal || goal.user_id !== userId) {
      return res.status(404).json({ error: t('goals.notFound') })
    }

    res.json(goal)
  } catch (error) {
    logger.error('goals.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createGoalSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { name, target_amount, current_amount, target_date, icon, color } = req.body

    const result = await create('goals', {
      user_id: userId,
      name,
      target_amount,
      current_amount: current_amount || 0,
      target_date: target_date ? new Date(target_date) : null,
      icon,
      color,
      status: 'active',
      created_at: new Date(),
    })

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('goals.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateGoalSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('goals', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('goals.notFound') })
    }

    const { name, target_amount, current_amount, target_date, icon, color, status } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (target_amount !== undefined) updates.target_amount = target_amount
    if (current_amount !== undefined) updates.current_amount = current_amount
    if (target_date !== undefined) updates.target_date = target_date ? new Date(target_date) : null
    if (icon !== undefined) updates.icon = icon
    if (color !== undefined) updates.color = color
    if (status !== undefined) updates.status = status

    const result = await updateById('goals', id, updates)

    res.json(result.data)
  } catch (error) {
    logger.error('goals.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('goals', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('goals.notFound') })
    }

    await deleteById('goals', id)
    res.status(204).end()
  } catch (error) {
    logger.error('goals.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
