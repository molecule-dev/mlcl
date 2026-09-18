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

import { ensureDemoSeeded } from './_seed.js'

const router = Router()

const dateRangeSchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
})

const taxSummarySchema = z.object({
  year: z.coerce.number().int().min(1900).max(9999).optional(),
})

router.get(
  '/revenue',
  validateQuery(dateRangeSchema) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      await ensureDemoSeeded(userId)

      const { start_date, end_date } = req.query as {
        start_date: string
        end_date: string
      }

      const endDate = new Date(end_date)
      endDate.setUTCHours(23, 59, 59, 999)

      const filters: Filter[] = [
        { field: 'user_id', operator: 'eq', value: userId },
        { field: 'created_at', operator: 'gte', value: new Date(start_date) },
        { field: 'created_at', operator: 'lte', value: endDate },
      ]

      const measures: Measure[] = [
        { field: 'amount', function: 'sum', alias: 'total_amount' },
        { field: 'id', function: 'count', alias: 'payment_count' },
      ]

      const report = await timeSeries({
        table: 'invoice_payments',
        dateField: 'created_at',
        interval: 'day',
        measures,
        filters,
        startDate: new Date(start_date),
        endDate,
      })

      res.json(report.points)
    } catch (error) {
      logger.error('reports.revenue', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get('/outstanding', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: 'in', value: ['sent', 'partial', 'overdue'] },
    ]

    const invoices = await findMany('invoices', {
      where,
      orderBy: [{ field: 'due_date', direction: 'asc' }],
    })

    res.json(invoices)
  } catch (error) {
    logger.error('reports.outstanding', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/aging', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const filters: Filter[] = [
      { field: 'user_id', operator: 'eq', value: userId },
      { field: 'status', operator: 'in', value: ['sent', 'partial', 'overdue'] },
    ]

    const report = await aggregate({
      table: 'invoices',
      measures: [
        { field: 'total', function: 'sum', alias: 'total_outstanding' },
        { field: 'id', function: 'count', alias: 'invoice_count' },
      ],
      dimensions: ['status'],
      filters,
    })

    res.json(report.rows)
  } catch (error) {
    logger.error('reports.aging', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/top-clients', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const report = await aggregate({
      table: 'invoices',
      measures: [
        { field: 'total', function: 'sum', alias: 'lifetime_revenue' },
        { field: 'id', function: 'count', alias: 'invoice_count' },
      ],
      dimensions: ['client_id'],
      filters: [{ field: 'user_id', operator: 'eq', value: userId }],
      orderBy: [{ field: 'lifetime_revenue', direction: 'desc' }],
    })

    res.json(report.rows)
  } catch (error) {
    logger.error('reports.topClients', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get(
  '/tax-summary',
  validateQuery(taxSummarySchema) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { year } = req.query as { year?: string | number }
      const resolvedYear = Number(year) || new Date().getUTCFullYear()
      const startDate = new Date(Date.UTC(resolvedYear, 0, 1))
      const endDate = new Date(Date.UTC(resolvedYear, 11, 31, 23, 59, 59, 999))

      const filters: Filter[] = [
        { field: 'user_id', operator: 'eq', value: userId },
        { field: 'created_at', operator: 'gte', value: startDate },
        { field: 'created_at', operator: 'lte', value: endDate },
      ]

      const report = await aggregate({
        table: 'invoices',
        measures: [
          { field: 'subtotal', function: 'sum', alias: 'taxable_amount' },
          { field: 'tax_amount', function: 'sum', alias: 'tax_collected' },
          { field: 'total', function: 'sum', alias: 'gross_amount' },
        ],
        dimensions: ['tax_rate'],
        filters,
      })

      res.json({ year: resolvedYear, rows: report.rows })
    } catch (error) {
      logger.error('reports.taxSummary', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get(
  '/payment-methods',
  validateQuery(dateRangeSchema.partial()) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { start_date, end_date } = req.query as {
        start_date?: string
        end_date?: string
      }

      const filters: Filter[] = [{ field: 'user_id', operator: 'eq', value: userId }]
      if (start_date) {
        filters.push({
          field: 'created_at',
          operator: 'gte',
          value: new Date(start_date),
        })
      }
      if (end_date) {
        const endDate = new Date(end_date)
        endDate.setUTCHours(23, 59, 59, 999)
        filters.push({ field: 'created_at', operator: 'lte', value: endDate })
      }

      const report = await aggregate({
        table: 'invoice_payments',
        measures: [
          { field: 'amount', function: 'sum', alias: 'total_amount' },
          { field: 'id', function: 'count', alias: 'payment_count' },
        ],
        dimensions: ['method'],
        filters,
      })

      res.json(report.rows)
    } catch (error) {
      logger.error('reports.paymentMethods', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get(
  '/cash-flow',
  validateQuery(dateRangeSchema) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { start_date, end_date } = req.query as {
        start_date: string
        end_date: string
      }
      const endDate = new Date(end_date)
      endDate.setUTCHours(23, 59, 59, 999)

      const report = await timeSeries({
        table: 'invoice_payments',
        dateField: 'created_at',
        interval: 'month',
        measures: [{ field: 'amount', function: 'sum', alias: 'collected' }],
        filters: [
          { field: 'user_id', operator: 'eq', value: userId },
          { field: 'created_at', operator: 'gte', value: new Date(start_date) },
          { field: 'created_at', operator: 'lte', value: endDate },
        ],
        startDate: new Date(start_date),
        endDate,
      })

      res.json(report.points)
    } catch (error) {
      logger.error('reports.cashFlow', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
