/**
 * Cards handler — `debit_cards` CRUD + freeze/unfreeze.
 *
 * - Validates payloads via `@molecule/api-middleware-validation`.
 * - Encrypts PAN at rest; reads return masked (`****1234`) values only.
 * - Freeze flips status active ↔ frozen, audited via
 *   `@molecule/api-audit`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { log } from '@molecule/api-audit'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { BankingDashboardLimits } from '../tiers.js'

const router = Router()

const createCardSchema = z.object({
  account_id: z.string().min(1),
  card_number: z.string().min(8),
  expiry: z.string().min(1),
  name_on_card: z.string().min(1),
  daily_limit_cents: z.number().int().positive().optional(),
})

async function maskCard(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out = { ...row }
  delete out.card_number_encrypted
  out.card_number = row.card_number_encrypted
    ? '****' + (await decrypt(row.card_number_encrypted as string)).slice(-4)
    : null
  return out
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const cards = await findMany<Record<string, unknown>>('debit_cards', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await Promise.all(cards.map(maskCard)))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const card = await findById<Record<string, unknown>>('debit_cards', getParamId(req))
    if (!card || card.user_id !== userId) {
      return res.status(404).json({ error: t('cards.notFound') })
    }
    res.json(await maskCard(card))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  validateBody(createCardSchema),
  enforceLimit<BankingDashboardLimits>({
    limitType: 'maxCards',
    getLimit: (limits) => limits.maxCards,
    getCurrent: async (userId) =>
      count('debit_cards', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const { account_id, card_number, expiry, name_on_card, daily_limit_cents } = req.body
      const account = await findById<Record<string, unknown>>('bank_accounts', account_id)
      if (!account || account.user_id !== userId) {
        return res.status(404).json({ error: t('accounts.notFound') })
      }

      const result = await create('debit_cards', {
        user_id: userId,
        account_id,
        card_number_encrypted: await encrypt(card_number),
        expiry,
        name_on_card,
        status: 'active',
        daily_limit_cents: daily_limit_cents ?? 500000,
        created_at: new Date(),
      })
      res.status(201).json(await maskCard((result as { data: Record<string, unknown> }).data))
    } catch (_err) {
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id/freeze', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const card = await findById<Record<string, unknown>>('debit_cards', id)
    if (!card || card.user_id !== userId) {
      return res.status(404).json({ error: t('cards.notFound') })
    }
    const next = card.status === 'frozen' ? 'active' : 'frozen'
    const result = await updateById('debit_cards', id, { status: next })
    try {
      await log({
        actor: userId,
        action: `card.${next === 'frozen' ? 'frozen' : 'unfrozen'}`,
        resource: 'debit_card',
        resourceId: id,
      })
    } catch (_error) {
      // audit failures must not fail the user-visible request
    }
    res.json(await maskCard((result as { data: Record<string, unknown> }).data))
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
