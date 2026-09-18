import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { PLAN_INFO } from '../lib/plans.js'

const router = Router()

interface UserRow {
  id?: string
  planKey?: string | null
  planExpiresAt?: string | Date | null
}

interface PaymentRow {
  id?: string
  createdAt?: string | Date | null
  productId?: string | null
  data?: unknown
}

function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function readNumber(source: unknown, key: string): number | null {
  if (source && typeof source === 'object' && key in (source as Record<string, unknown>)) {
    const v = (source as Record<string, unknown>)[key]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const user = await findById<UserRow>('users', userId)
    const planKey = (user?.planKey ?? 'free').toLowerCase()
    const plan = PLAN_INFO[planKey] ?? PLAN_INFO.free

    let requestsUsed = 0
    try {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const history = await findMany('try_it_history', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'created_at', operator: '>=', value: since },
        ],
      })
      requestsUsed = history.length
    } catch (_error) {
      // Best-effort aggregation; missing history is recoverable — show 0
      requestsUsed = 0
    }

    let invoices: { id: string; date: string; amount_cents: number; status: string }[] = []
    try {
      const where: WhereCondition[] = [{ field: 'userId', operator: '=', value: userId }]
      const orderBy: OrderBy[] = [{ field: 'createdAt', direction: 'desc' }]
      const rows = await findMany<PaymentRow>('payments', { where, orderBy })
      invoices = rows.map((r) => ({
        id: typeof r.id === 'string' ? r.id : '',
        date: fmtDate(r.createdAt ?? null),
        amount_cents:
          readNumber(r.data, 'amount_cents') ?? readNumber(r.data, 'amount') ?? plan.monthly_cents,
        status: 'paid',
      }))
    } catch (_error) {
      // Best-effort invoice fetch; missing payment rows are recoverable — show empty list
      invoices = []
    }

    res.json({
      plan_name: plan.name,
      monthly_cents: plan.monthly_cents,
      requests_used: requestsUsed,
      requests_quota: plan.requests_quota,
      payment_method: null,
      invoices,
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
