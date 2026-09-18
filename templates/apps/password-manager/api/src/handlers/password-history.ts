import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  item_id: z.string().min(1),
})

const createSchema = z.object({
  item_id: z.string().min(1),
  encrypted_password: z.string().min(1),
})

// List password history for an item the current user owns
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const itemId = String((req.query as Record<string, unknown>).item_id ?? '')
    const item = await findById<{ owner_id: string }>('vault_items', itemId)
    if (!item || item.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }
    const where: WhereCondition[] = [
      { field: 'item_id', operator: '=', value: itemId },
      { field: 'user_id', operator: '=', value: userId },
    ]
    const rows = await findMany('password_history', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('password-history.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const item = await findById<{ owner_id: string }>('vault_items', req.body.item_id)
    if (!item || item.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }
    const result = await create('password_history', {
      item_id: req.body.item_id,
      user_id: userId,
      encrypted_password: req.body.encrypted_password,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('password-history.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<{ user_id: string }>('password_history', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('history.notFound', {}, { defaultValue: 'History entry not found' }) })
      return
    }
    await deleteById('password_history', id)
    res.status(204).end()
  } catch (error) {
    logger.error('password-history.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
