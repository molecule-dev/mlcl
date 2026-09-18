/**
 * Reports handler — payroll-summary, tax-liability, department-costs.
 *
 * Aggregates over the user's pay-stubs / pay-runs / employees in JS to
 * keep the no-raw-SQL invariant. The bonded reporting provider
 * (`@molecule/api-reporting-database`) is wired at startup but not
 * required here — these reports are simple roll-ups, not BI queries.
 *
 * Scope: every read is filtered by the caller's user_id.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

const dateRangeSchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
})

const taxLiabilitySchema = z.object({
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  year: z.coerce.number().int().min(2000).max(2999).optional(),
})

router.get(
  '/payroll-summary',
  validateQuery(dateRangeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      await seedDemoForUser(userId)

      const { start_date, end_date } = req.query as { start_date: string; end_date: string }
      const start = new Date(start_date)
      const end = new Date(end_date)

      const payRuns = await findMany<Record<string, unknown>>('pay_runs', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'pay_date', operator: '>=', value: start },
          { field: 'pay_date', operator: '<=', value: end },
        ],
      })

      interface PayrollSummary {
        total_gross: number
        total_taxes: number
        total_deductions: number
        total_net: number
        run_count: number
      }
      const summary = payRuns.reduce<PayrollSummary>(
        (acc, r) => {
          acc.total_gross += num(r.total_gross)
          acc.total_taxes += num(r.total_taxes)
          acc.total_deductions += num(r.total_deductions)
          acc.total_net += num(r.total_net)
          acc.run_count += 1
          return acc
        },
        { total_gross: 0, total_taxes: 0, total_deductions: 0, total_net: 0, run_count: 0 },
      )

      res.json({
        start_date,
        end_date,
        ...summary,
        runs: payRuns.map((r) => ({
          id: r.id,
          pay_date: r.pay_date,
          total_gross: num(r.total_gross),
          total_taxes: num(r.total_taxes),
          total_net: num(r.total_net),
        })),
      })
    } catch (error) {
      logger.error('reports.payroll-summary', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get(
  '/tax-liability',
  validateQuery(taxLiabilitySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      await seedDemoForUser(userId)

      const q = req.query as { quarter?: number; year?: number }
      const year = q.year ?? new Date().getFullYear()
      const quarter = q.quarter ?? Math.ceil((new Date().getMonth() + 1) / 3)

      const startMonth = (quarter - 1) * 3
      const start = new Date(year, startMonth, 1)
      const end = new Date(year, startMonth + 3, 0, 23, 59, 59)

      const stubs = await findMany<Record<string, unknown>>('pay_stubs', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'period_start', operator: '>=', value: start },
          { field: 'period_end', operator: '<=', value: end },
        ],
      })

      interface TaxTotals {
        federal_tax: number
        state_tax: number
        fica: number
        medicare: number
      }
      const totals = stubs.reduce<TaxTotals>(
        (acc, s) => {
          acc.federal_tax += num(s.federal_tax)
          acc.state_tax += num(s.state_tax)
          acc.fica += num(s.fica)
          acc.medicare += num(s.medicare)
          return acc
        },
        { federal_tax: 0, state_tax: 0, fica: 0, medicare: 0 },
      )

      res.json({
        year,
        quarter,
        stub_count: stubs.length,
        ...totals,
        total_liability: totals.federal_tax + totals.state_tax + totals.fica + totals.medicare,
      })
    } catch (error) {
      logger.error('reports.tax-liability', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.get('/department-costs', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await seedDemoForUser(userId)

    const employees = await findMany<Record<string, unknown>>('employees', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
    })

    const byDepartment = new Map<
      string,
      { department: string; head_count: number; total_salary: number }
    >()
    for (const e of employees) {
      const dept = (e.department as string | null) ?? 'Unassigned'
      const row = byDepartment.get(dept) ?? { department: dept, head_count: 0, total_salary: 0 }
      row.head_count += 1
      row.total_salary += num(e.salary)
      byDepartment.set(dept, row)
    }

    res.json({
      departments: [...byDepartment.values()].sort((a, b) => b.total_salary - a.total_salary),
    })
  } catch (error) {
    logger.error('reports.department-costs', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
