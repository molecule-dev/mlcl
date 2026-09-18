import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createShareSchema = z.object({
  vault_id: z.string().min(1),
  shared_with_user_id: z.string().min(1),
  permission: z.enum(['view', 'edit', 'admin']).default('view'),
})

const updateShareSchema = z.object({
  permission: z.enum(['view', 'edit', 'admin']).optional(),
  accepted_at: z.string().nullable().optional(),
})

// List vaults shared WITH the current user
router.get('/incoming', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'shared_with_user_id', operator: '=', value: userId }]
    const shares = await findMany('vault_shares', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(shares)
  } catch (error) {
    logger.error('shares.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// List shares the current user has CREATED for their vaults
router.get('/outgoing', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'shared_by', operator: '=', value: userId }]
    const shares = await findMany('vault_shares', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(shares)
  } catch (error) {
    logger.error('shares.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create share — only the vault owner can share
router.post('/', validateBody(createShareSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const vault = await findById<{ owner_id: string }>('vaults', req.body.vault_id)
    if (!vault || vault.owner_id !== userId) {
      res.status(404).json({ error: t('vault.notFound', {}, { defaultValue: 'Vault not found' }) })
      return
    }
    const result = await create('vault_shares', {
      vault_id: req.body.vault_id,
      shared_by: userId,
      shared_with_user_id: req.body.shared_with_user_id,
      permission: req.body.permission ?? 'view',
      created_at: new Date().toISOString(),
      accepted_at: null,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('shares.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateShareSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<{ shared_by: string; shared_with_user_id: string }>(
      'vault_shares',
      id,
    )
    if (!existing) {
      res.status(404).json({ error: t('share.notFound', {}, { defaultValue: 'Share not found' }) })
      return
    }
    // Owner can update permission; recipient can accept (set accepted_at).
    const isOwner = existing.shared_by === userId
    const isRecipient = existing.shared_with_user_id === userId
    if (!isOwner && !isRecipient) {
      res.status(404).json({ error: t('share.notFound', {}, { defaultValue: 'Share not found' }) })
      return
    }
    const updates: Record<string, unknown> = {}
    if (isOwner && req.body.permission !== undefined) updates.permission = req.body.permission
    if (isRecipient && req.body.accepted_at !== undefined)
      updates.accepted_at = req.body.accepted_at
    const result = await updateById('vault_shares', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('shares.handler', error)
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
    const existing = await findById<{ shared_by: string; shared_with_user_id: string }>(
      'vault_shares',
      id,
    )
    if (!existing || (existing.shared_by !== userId && existing.shared_with_user_id !== userId)) {
      res.status(404).json({ error: t('share.notFound', {}, { defaultValue: 'Share not found' }) })
      return
    }
    await deleteById('vault_shares', id)
    res.status(204).end()
  } catch (error) {
    logger.error('shares.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
