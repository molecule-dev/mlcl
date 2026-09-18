import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { serializeAccount } from '../lib/serialize.js'
import type { AccountingInvoicingLimits } from '../tiers.js'

const router = Router()

type RawAccountRow = Parameters<typeof serializeAccount>[0]

const createAccountSchema = z.object({
  code: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

const updateAccountSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  active: z.boolean().optional(),
  balance: z.number().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { type } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (type) where.push({ field: 'type', operator: '=', value: String(type) })

    const orderBy: OrderBy[] = [{ field: 'code', direction: 'asc' }]
    const items = await findMany<RawAccountRow>('accounts', { where, orderBy })
    res.json(items.map(serializeAccount))
  } catch (error) {
    logger.error('accounts.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const item = await findById<RawAccountRow>('accounts', getParamId(req))
    if (!item || item.user_id !== userId) {
      return res.status(404).json({ error: t('account.notFound') })
    }
    res.json(serializeAccount(item))
  } catch (error) {
    logger.error('accounts.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier accounts cap (tiers.ts maxAccounts) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceAccountLimit = enforceLimit<AccountingInvoicingLimits>({
  limitType: 'maxAccounts',
  getLimit: (limits) => limits.maxAccounts,
  getCurrent: async (userId) =>
    count('accounts', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceAccountLimit,
  validateBody(createAccountSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const result = await create<RawAccountRow>('accounts', {
        user_id: userId,
        code: req.body.code,
        name: req.body.name,
        type: req.body.type,
        description: req.body.description ?? null,
        balance: 0,
        currency: req.body.currency ?? 'USD',
        active: req.body.active ?? true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
      res.status(201).json(serializeAccount(result.data))
    } catch (error) {
      logger.error('accounts.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('accounts', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('account.notFound') })
    }

    const result = await updateById<RawAccountRow>('accounts', id, {
      ...req.body,
      updated_at: new Date(),
    })
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    res.json(serializeAccount(result.data))
  } catch (error) {
    logger.error('accounts.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('accounts', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('account.notFound') })
    }
    await deleteById('accounts', id)
    res.status(204).end()
  } catch (error) {
    logger.error('accounts.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
