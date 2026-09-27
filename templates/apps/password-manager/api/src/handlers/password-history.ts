import type { Request, Response } from 'express'
import { Router } from 'express'
import { createHash } from 'node:crypto'
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
  // The plaintext password the client just saved. The server stores only a
  // sha256 digest + last-4 preview — never the value itself, and no
  // caller-supplied blob (the old `encrypted_password` column held exactly
  // that, verbatim, under a name that lied about crypto).
  password: z.string().min(1),
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
    // One-way digest + a last-4 hint: enough to recognize an old password,
    // useless for recovering it. The hash makes the stored artifact inert —
    // there is no verify consumer today, and if one is added later it
    // compares digests, not ciphertext.
    const result = await create('password_history', {
      item_id: req.body.item_id,
      user_id: userId,
      password_hash: createHash('sha256').update(req.body.password, 'utf8').digest('hex'),
      password_preview: req.body.password.slice(-4),
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
