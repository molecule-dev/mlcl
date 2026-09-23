/**
 * Transactions handler — `bank_transactions` read-only listings.
 *
 * Transactions in this app are server-derived (from posted transfers,
 * card spend, and other internal events). Users do not POST raw
 * transactions, so writes are not exposed; reads are scoped by `user_id`.
 *
 * The shaped response includes both the storage-native field names
 * (`merchant`, `posted_at`) and the UI-facing aliases (`description`,
 * `date_iso`) so the AccountDetail page can render rows without the
 * frontend knowing about the column layout.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  account_id: z.string().optional(),
  status: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

interface TxRow {
  id: string
  user_id: string
  account_id: string
  amount_cents: number | string
  merchant?: string | null
  category?: string | null
  method?: string | null
  status?: string | null
  posted_at?: string | Date | null
  running_balance_cents?: number | string | null
}

function shape(row: TxRow): Record<string, unknown> {
  const posted = row.posted_at ? new Date(row.posted_at as string | Date) : null
  return {
    id: row.id,
    account_id: row.account_id,
    amount_cents: Number(row.amount_cents ?? 0),
    merchant: row.merchant ?? '',
    description: row.merchant ?? '',
    category: row.category ?? '',
    method: row.method ?? 'card',
    status: row.status ?? 'posted',
    posted_at: posted ? posted.toISOString() : '',
    date_iso: posted ? posted.toISOString() : '',
    running_balance_cents: Number(row.running_balance_cents ?? 0),
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { account_id, status, start_date, end_date, start, end, limit, offset } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (account_id) where.push({ field: 'account_id', operator: '=', value: account_id })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const startCutoff = (start_date ?? start) as string | undefined
    const endCutoff = (end_date ?? end) as string | undefined
    if (startCutoff)
      where.push({ field: 'posted_at', operator: '>=', value: new Date(startCutoff) })
    if (endCutoff) where.push({ field: 'posted_at', operator: '<=', value: new Date(endCutoff) })

    const transactions = await findMany<TxRow>('bank_transactions', {
      where,
      orderBy: [{ field: 'posted_at', direction: 'desc' }],
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    })
    res.json(transactions.map(shape))
  } catch (err) {
    logger.error('transactions.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const tx = await findById<TxRow>('bank_transactions', getParamId(req))
    if (!tx || tx.user_id !== userId) {
      return res.status(404).json({ error: t('transactions.notFound') })
    }
    res.json(shape(tx))
  } catch (err) {
    logger.error('transactions.get', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
