import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const registerSchema = z.object({
  // The recovery kit is an export/copy feature, not crypto — the client sends
  // the plain kit text it generated and the server stores it verbatim under a
  // column that says what it is (`recovery_kit`; formerly the lying
  // `encrypted_recovery_data` beside a decorative `public_key`).
  recovery_kit: z.string().min(1),
})

// Register a new recovery key for the current user
router.post('/', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await create('vault_recovery_keys', {
      user_id: userId,
      recovery_kit: req.body.recovery_kit,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('recovery-keys.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const keys = await findMany('vault_recovery_keys', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(keys)
  } catch (error) {
    logger.error('recovery-keys.handler', error)
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
    const existing = await findById<{ user_id: string }>('vault_recovery_keys', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('recoveryKey.notFound', {}, { defaultValue: 'Recovery key not found' }) })
      return
    }
    await deleteById('vault_recovery_keys', id)
    res.status(204).end()
  } catch (error) {
    logger.error('recovery-keys.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
