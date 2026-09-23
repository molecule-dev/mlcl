/**
 * Reports handler — server-side aggregations for dashboard widgets.
 *
 * - Reads scoped by `user_id` from the session.
 * - Uses `@molecule/api-reporting` `aggregate`/`timeSeries` over the
 *   per-app tables; no raw SQL.
 * - Validates pass-through query params for safety even though the
 *   handler does not consume body input.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import type { Filter, Measure } from '@molecule/api-reporting'
import { aggregate, timeSeries } from '@molecule/api-reporting'

const router = Router()

const dashboardQuerySchema = z.object({
  days: z.string().optional(),
})

interface BankAccountRow {
  id: string
  kind: 'checking' | 'savings' | 'credit' | 'brokerage' | 'loan'
  balance_cents: number | string | null
  available_cents: number | string | null
}

router.get(
  '/dashboard_stats',
  validateQuery(dashboardQuerySchema),
  async (_req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
      const accounts = await findMany<BankAccountRow>('bank_accounts', { where })

      let net_worth_cents = 0
      let cash_on_hand_cents = 0
      let credit_used_cents = 0
      let credit_limit_cents = 0
      for (const a of accounts) {
        const bal = Number(a.balance_cents ?? 0)
        const avail = Number(a.available_cents ?? 0)
        if (a.kind === 'credit') {
          credit_used_cents += Math.abs(bal)
          credit_limit_cents += Math.max(avail + Math.abs(bal), 0)
        } else if (a.kind === 'loan') {
          net_worth_cents -= Math.abs(bal)
        } else {
          net_worth_cents += bal
          if (a.kind === 'checking' || a.kind === 'savings') {
            cash_on_hand_cents += bal
          }
        }
      }

      // 30-day net-worth time series — average daily running_balance_cents.
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 30)
      let balance_history_30d: Array<{ date: string; net_worth_cents: number }> = []
      try {
        const measures: Measure[] = [
          { field: 'running_balance_cents', function: 'avg', alias: 'net_worth_cents' },
        ]
        const filters: Filter[] = [{ field: 'user_id', operator: 'eq', value: userId }]
        const series = await timeSeries({
          table: 'bank_transactions',
          dateField: 'posted_at',
          interval: 'day',
          measures,
          filters,
          startDate,
          endDate,
        })
        balance_history_30d = series.points.map((point) => ({
          date: point.date,
          net_worth_cents: Math.round(Number(point.values?.net_worth_cents ?? 0)),
        }))
      } catch (_error) {
        // Series fetch failure falls back to empty history; non-fatal.
        balance_history_30d = []
      }

      // Net-worth change over last 30 days = current net worth - net worth 30 days ago.
      const baseline = balance_history_30d[0]?.net_worth_cents ?? net_worth_cents
      const net_worth_change_30d_cents = net_worth_cents - baseline

      res.json({
        net_worth_cents,
        net_worth_change_30d_cents,
        cash_on_hand_cents,
        credit_used_cents,
        credit_limit_cents,
        balance_history_30d,
      })
    } catch (err) {
      logger.error('reports.dashboard_stats', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get('/spending_by_category_30d', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const filters: Filter[] = [
      { field: 'user_id', operator: 'eq', value: userId },
      { field: 'posted_at', operator: 'gte', value: since },
      { field: 'amount_cents', operator: 'lt', value: 0 },
    ]
    const measures: Measure[] = [{ field: 'amount_cents', function: 'sum', alias: 'amount_cents' }]
    const report = await aggregate({
      table: 'bank_transactions',
      measures,
      dimensions: ['category'],
      filters,
      orderBy: [{ field: 'amount_cents', direction: 'asc' }],
    })
    res.json(report)
  } catch (err) {
    logger.error('reports.spending_by_category_30d', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/balance_history_30d', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)

    const measures: Measure[] = [
      { field: 'running_balance_cents', function: 'avg', alias: 'net_worth_cents' },
    ]
    const filters: Filter[] = [{ field: 'user_id', operator: 'eq', value: userId }]
    const report = await timeSeries({
      table: 'bank_transactions',
      dateField: 'posted_at',
      interval: 'day',
      measures,
      filters,
      startDate,
      endDate,
    })
    res.json(report)
  } catch (err) {
    logger.error('reports.balance_history_30d', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
