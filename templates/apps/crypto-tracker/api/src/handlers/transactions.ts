import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface TransactionRow {
  id: string
  user_id: string
  symbol?: string
  kind?: string
  amount?: string | number
  price_usd?: string | number
  fee_usd?: string | number
  total_usd?: string | number
  exchange?: string | null
  occurred_at?: string | Date
  notes?: string | null
  created_at?: string | Date
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function decorateTransaction(row: TransactionRow): Record<string, unknown> {
  return {
    id: row.id,
    user_id: row.user_id,
    symbol: (row.symbol ?? '').toLowerCase(),
    kind: row.kind ?? 'buy',
    amount: num(row.amount),
    price_usd: num(row.price_usd),
    fee_usd: num(row.fee_usd),
    total_usd: num(row.total_usd),
    exchange: row.exchange ?? '',
    occurred_at: row.occurred_at,
    notes: row.notes ?? null,
    created_at: row.created_at,
  }
}

const createTransactionSchema = z.object({
  symbol: z.string().min(1),
  kind: z.enum(['buy', 'sell', 'transfer_in', 'transfer_out', 'reward', 'fee']),
  amount: z.coerce.number().nonnegative(),
  price_usd: z.coerce.number().nonnegative(),
  fee_usd: z.coerce.number().nonnegative().optional(),
  exchange: z.string().optional(),
  total_usd: z.coerce.number().optional(),
  occurred_at: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const txs = await findMany<TransactionRow>('crypto_transactions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    })
    res.json(txs.map(decorateTransaction))
  } catch (err) {
    console.error('[crypto-tracker] transactions handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const tx = await findById<TransactionRow>('crypto_transactions', getParamId(req))
    if (!tx || tx.user_id !== userId) {
      return res.status(404).json({ error: t('transactions.notFound') })
    }
    res.json(tx)
  } catch (err) {
    console.error('[crypto-tracker] transactions handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createTransactionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const body = req.body as z.infer<typeof createTransactionSchema>
    const total =
      body.total_usd !== undefined
        ? body.total_usd
        : body.amount * body.price_usd + (body.fee_usd ?? 0)

    const created = await create<TransactionRow>('crypto_transactions', {
      ...body,
      symbol: body.symbol.toLowerCase(),
      user_id: userId,
      total_usd: total,
      fee_usd: body.fee_usd ?? 0,
      exchange: body.exchange ?? 'manual',
      occurred_at: body.occurred_at ? new Date(body.occurred_at) : new Date(),
      created_at: new Date(),
    })
    const row = (created.data ?? (created as unknown as TransactionRow)) as TransactionRow
    res.status(201).json(decorateTransaction(row))
  } catch (err) {
    console.error('[crypto-tracker] transactions handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findById<TransactionRow>('crypto_transactions', getParamId(req))
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('transactions.notFound') })
    }

    await deleteById('crypto_transactions', getParamId(req))
    res.status(204).end()
  } catch (err) {
    console.error('[crypto-tracker] transactions handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
