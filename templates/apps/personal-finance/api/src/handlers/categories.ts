import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  type: z.enum(['income', 'expense']).default('expense'),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  type: z.enum(['income', 'expense']).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const categories = await findMany('categories', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })

    res.json(categories)
  } catch (error) {
    logger.error('categories.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { name, icon, color, parent_id, type } = req.body

    const result = await create('categories', {
      user_id: userId,
      name,
      icon,
      color,
      parent_id: parent_id || null,
      type: type || 'expense',
      created_at: new Date(),
    })

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('categories.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('categories', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('categories.notFound') })
    }

    const { name, icon, color, parent_id, type } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (icon !== undefined) updates.icon = icon
    if (color !== undefined) updates.color = color
    if (parent_id !== undefined) updates.parent_id = parent_id
    if (type !== undefined) updates.type = type

    const result = await updateById('categories', id, updates)

    res.json(result.data)
  } catch (error) {
    logger.error('categories.handler', error)
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
    const existing = await findById<Record<string, unknown>>('categories', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('categories.notFound') })
    }

    await deleteById('categories', id)
    res.status(204).end()
  } catch (error) {
    logger.error('categories.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
