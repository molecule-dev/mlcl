import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PasswordManagerLimits } from '../tiers.js'

const router = Router()

const createVaultSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  icon: z.string().nullable().optional(),
})

const updateVaultSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  icon: z.string().nullable().optional(),
})

// List user's vaults
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const vaults = await findMany('vaults', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(vaults)
  } catch (error) {
    logger.error('vaults.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get vault — must scope by owner_id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const vault = await findById<Record<string, unknown>>('vaults', getParamId(req))
    if (!vault || vault.owner_id !== userId) {
      res.status(404).json({ error: t('vault.notFound', {}, { defaultValue: 'Vault not found' }) })
      return
    }
    res.json(vault)
  } catch (error) {
    logger.error('vaults.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create vault
// Free-tier vault cap — advertised on the pricing page but never enforced. Gate the create route.
const vaultLimit = enforceLimit<PasswordManagerLimits>({
  limitType: 'maxVaults',
  getLimit: (limits) => limits.maxVaults,
  getCurrent: async (userId) =>
    count('vaults', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  vaultLimit,
  validateBody(createVaultSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const now = new Date().toISOString()
      const result = await create('vaults', {
        name: req.body.name,
        description: req.body.description ?? '',
        icon: req.body.icon ?? null,
        owner_id: userId,
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('vaults.handler', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update vault
router.put('/:id', validateBody(updateVaultSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vaults', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('vault.notFound', {}, { defaultValue: 'Vault not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    const result = await updateById('vaults', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('vaults.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete vault
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
    const existing = await findById<Record<string, unknown>>('vaults', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('vault.notFound', {}, { defaultValue: 'Vault not found' }) })
      return
    }
    await deleteById('vaults', id)
    res.status(204).end()
  } catch (error) {
    logger.error('vaults.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
