/**
 * Accounts handler — `bank_accounts` CRUD.
 *
 * - Validates payloads via `@molecule/api-middleware-validation`.
 * - Always scopes reads/writes by `user_id` from the session (no IDOR).
 * - Returns masked (`****1234`) account/routing numbers; the encrypted
 *   ciphertext stays server-side via `@molecule/api-encryption`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { BankingDashboardLimits } from '../tiers.js'

const router = Router()

const createAccountSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['checking', 'savings', 'credit', 'brokerage', 'loan']).optional(),
  institution: z.string().optional(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  currency: z.string().optional(),
  balance_cents: z.number().int().optional(),
  available_cents: z.number().int().optional(),
})

function maskNumber(num: string): string {
  return '****' + num.slice(-4)
}

async function maskRow(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...row }
  delete out.account_number_encrypted
  delete out.routing_number_encrypted
  out.account_number = row.account_number_encrypted
    ? maskNumber(await decrypt(row.account_number_encrypted as string))
    : null
  out.routing_number = row.routing_number_encrypted
    ? maskNumber(await decrypt(row.routing_number_encrypted as string))
    : null
  // PostgreSQL returns bigint columns as strings; normalize so clients see numbers.
  if (out.balance_cents != null) out.balance_cents = Number(out.balance_cents)
  if (out.available_cents != null) out.available_cents = Number(out.available_cents)
  // The frontend expects `last4` (and `mask` already exists in DB). Mirror
  // the value under the friendlier alias so AccountDetail / Transfers can
  // read `account.last4` directly without a separate normaliser.
  out.last4 = (row.mask as string | null | undefined) ?? ''
  return out
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const accounts = await findMany<Record<string, unknown>>('bank_accounts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await Promise.all(accounts.map(maskRow)))
  } catch (err) {
    logger.error('accounts.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const account = await findById<Record<string, unknown>>('bank_accounts', getParamId(req))
    if (!account || account.user_id !== userId) {
      return res.status(404).json({ error: t('accounts.notFound') })
    }
    res.json(await maskRow(account))
  } catch (err) {
    logger.error('accounts.get', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id/balance', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const account = await findById<Record<string, unknown>>('bank_accounts', getParamId(req))
    if (!account || account.user_id !== userId) {
      return res.status(404).json({ error: t('accounts.notFound') })
    }
    const available = Number(account.available_cents ?? 0)
    const current = Number(account.balance_cents ?? 0)
    res.json({
      available_cents: available,
      balance_cents: current,
      pending_cents: current - available,
    })
  } catch (err) {
    logger.error('accounts.get', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  validateBody(createAccountSchema),
  enforceLimit<BankingDashboardLimits>({
    limitType: 'maxAccounts',
    getLimit: (limits) => limits.maxAccounts,
    getCurrent: async (userId) =>
      count('bank_accounts', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const {
        name,
        kind,
        institution,
        account_number,
        routing_number,
        currency,
        balance_cents,
        available_cents,
      } = req.body
      const result = await create('bank_accounts', {
        user_id: userId,
        name,
        kind: kind ?? 'checking',
        institution: institution ?? null,
        mask: account_number ? account_number.slice(-4) : null,
        account_number_encrypted: account_number ? await encrypt(account_number) : null,
        routing_number_encrypted: routing_number ? await encrypt(routing_number) : null,
        currency: currency ?? 'USD',
        balance_cents: balance_cents ?? 0,
        available_cents: available_cents ?? 0,
        status: 'active',
        opened_at: new Date(),
        created_at: new Date(),
      })
      res.status(201).json(await maskRow((result as { data: Record<string, unknown> }).data))
    } catch (err) {
      logger.error('accounts.create', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
