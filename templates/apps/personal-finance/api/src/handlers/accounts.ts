import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PersonalFinanceLimits } from '../tiers.js'

const router = Router()

const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'cash', 'other']),
  institution: z.string().optional(),
  account_number: z.string().optional(),
  currency: z.string().default('USD'),
  initial_balance: z.number().default(0),
})

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'cash', 'other']).optional(),
  institution: z.string().optional(),
  account_number: z.string().optional(),
  currency: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const accounts = await findMany('accounts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })

    const decrypted = await Promise.all(
      accounts.map(async (account: Record<string, unknown>) => ({
        ...account,
        account_number: account.account_number_encrypted
          ? await decrypt(account.account_number_encrypted as string)
          : null,
      })),
    )

    res.json(decrypted)
  } catch (error) {
    logger.error('accounts.handler', error)
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
    const account = await findById<Record<string, unknown>>('accounts', id)

    if (!account || account.user_id !== userId) {
      return res.status(404).json({ error: t('accounts.notFound') })
    }

    res.json({
      ...account,
      account_number: account.account_number_encrypted
        ? await decrypt(account.account_number_encrypted as string)
        : null,
    })
  } catch (error) {
    logger.error('accounts.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<PersonalFinanceLimits>({
    limitType: 'maxAccounts',
    getLimit: (limits) => limits.maxAccounts,
    getCurrent: async (userId) =>
      count('accounts', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAccountSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { name, type, institution, account_number, currency, initial_balance } = req.body

      const result = await create('accounts', {
        user_id: userId,
        name,
        type,
        institution,
        account_number_encrypted: account_number ? await encrypt(account_number) : null,
        currency: currency || 'USD',
        balance: initial_balance || 0,
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('accounts.handler', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('accounts', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('accounts.notFound') })
    }

    const { name, type, institution, account_number, currency } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (type !== undefined) updates.type = type
    if (institution !== undefined) updates.institution = institution
    if (currency !== undefined) updates.currency = currency
    if (account_number !== undefined) {
      updates.account_number_encrypted = account_number ? await encrypt(account_number) : null
    }

    const result = await updateById('accounts', id, updates)

    res.json(result.data)
  } catch (error) {
    logger.error('accounts.handler', error)
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
    const existing = await findById<Record<string, unknown>>('accounts', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('accounts.notFound') })
    }

    await deleteById('accounts', id)
    res.status(204).end()
  } catch (error) {
    logger.error('accounts.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
