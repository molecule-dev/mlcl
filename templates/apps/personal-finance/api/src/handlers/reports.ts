import { type Request, type RequestHandler, type Response, Router } from 'express'
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

const dateRangeSchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
})

const incomeVsExpensesSchema = dateRangeSchema.extend({
  interval: z.enum(['hour', 'day', 'week', 'month', 'year']).optional(),
})

const budgetProgressSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1900).max(9999).optional(),
})

router.get(
  '/spending-by-category',
  validateQuery(dateRangeSchema) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { start_date, end_date } = req.query as { start_date: string; end_date: string }

      // Treat the end_date string as inclusive of the entire day. `new Date('2026-05-02')`
      // resolves to 00:00:00 UTC, which would silently drop transactions logged later
      // the same day. Snap to 23:59:59.999 to match the intent of the date-range UI.
      const endDate = new Date(end_date as string)
      endDate.setUTCHours(23, 59, 59, 999)

      const filters: Filter[] = [
        { field: 'user_id', operator: 'eq', value: userId },
        { field: 'type', operator: 'eq', value: 'expense' },
        { field: 'date', operator: 'gte', value: new Date(start_date as string) },
        { field: 'date', operator: 'lte', value: endDate },
      ]

      const measures: Measure[] = [
        { field: 'amount', function: 'sum', alias: 'total_amount' },
        { field: 'id', function: 'count', alias: 'transaction_count' },
      ]

      const report = await aggregate({
        table: 'transactions',
        measures,
        dimensions: ['category_id'],
        filters,
        orderBy: [{ field: 'total_amount', direction: 'desc' }],
      })

      res.json(report.rows)
    } catch (error) {
      logger.error('reports.handler', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get(
  '/income-vs-expenses',
  validateQuery(incomeVsExpensesSchema) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { start_date, end_date, interval } = req.query as {
        start_date: string
        end_date: string
        interval?: string
      }

      const filters: Filter[] = [{ field: 'user_id', operator: 'eq', value: userId }]

      const measures: Measure[] = [{ field: 'amount', function: 'sum', alias: 'total_amount' }]

      const validIntervals = ['hour', 'day', 'week', 'month', 'year'] as const
      const resolvedInterval = validIntervals.includes(interval as (typeof validIntervals)[number])
        ? (interval as (typeof validIntervals)[number])
        : 'month'

      const endDate = new Date(end_date as string)
      endDate.setUTCHours(23, 59, 59, 999)

      const report = await timeSeries({
        table: 'transactions',
        dateField: 'date',
        interval: resolvedInterval,
        measures,
        filters,
        startDate: new Date(start_date as string),
        endDate,
      })

      res.json(report.points)
    } catch (error) {
      logger.error('reports.handler', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get('/net-worth', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const measures: Measure[] = [{ field: 'balance', function: 'sum', alias: 'total_balance' }]

    const filters: Filter[] = [{ field: 'user_id', operator: 'eq', value: userId }]

    const report = await aggregate({
      table: 'accounts',
      measures,
      dimensions: ['type'],
      filters,
    })

    res.json(report.rows)
  } catch (error) {
    logger.error('reports.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get(
  '/budget-progress',
  validateQuery(budgetProgressSchema) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { month, year } = req.query as { month?: string | number; year?: string | number }
      const now = new Date()
      const resolvedMonth = Number(month) || now.getMonth() + 1
      const resolvedYear = Number(year) || now.getFullYear()

      const where: WhereCondition[] = [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'month', operator: '=', value: resolvedMonth },
        { field: 'year', operator: '=', value: resolvedYear },
      ]

      const budgets = await findMany('budgets', { where })

      const startDate = new Date(resolvedYear, resolvedMonth - 1, 1)
      const endDate = new Date(resolvedYear, resolvedMonth, 0, 23, 59, 59)

      const spending = await aggregate({
        table: 'transactions',
        measures: [{ field: 'amount', function: 'sum', alias: 'spent' }],
        dimensions: ['category_id'],
        filters: [
          { field: 'user_id', operator: 'eq', value: userId },
          { field: 'type', operator: 'eq', value: 'expense' },
          { field: 'date', operator: 'gte', value: startDate },
          { field: 'date', operator: 'lte', value: endDate },
        ],
      })

      res.json({ budgets, spending: spending.rows, month: resolvedMonth, year: resolvedYear })
    } catch (error) {
      logger.error('reports.handler', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
