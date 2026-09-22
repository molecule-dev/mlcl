/**
 * Pay-runs handler — periodic payroll runs and their pay-stubs.
 *
 * Scope: every row carries `user_id` (the owner). Cross-user reads return
 * 404. Approval transitions are append-only audit events.
 *
 * v1 ships the wizard up through "approve" — actual ACH/Modern-Treasury
 * disbursement is deferred to v2 per SERVICES.md.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { log } from '@molecule/api-audit'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PayrollManagerLimits } from '../tiers.js'
import { computeStub, type FederalBracket, seedDemoForUser } from './_seed.js'

const router = Router()

function getUserEmail(res: Response): string | null {
  return (res.locals.session as { email?: string } | undefined)?.email ?? null
}

const createPayRunSchema = z.object({
  pay_period_start: z.string().min(1),
  pay_period_end: z.string().min(1),
  pay_date: z.string().min(1),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await seedDemoForUser(userId)

    const { status } = req.query
    const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
    if (status) where.push({ field: 'status', operator: '=' as const, value: String(status) })

    const payRuns = await findMany('pay_runs', {
      where,
      orderBy: [{ field: 'pay_date', direction: 'desc' }],
    })
    res.json(payRuns)
  } catch (error) {
    logger.error('pay-runs.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await seedDemoForUser(userId)

    const id = getParamId(req)
    const payRun = await findById<Record<string, unknown>>('pay_runs', id)
    if (!payRun || payRun.user_id !== userId) {
      return res.status(404).json({ error: t('payRuns.notFound') })
    }

    const payStubs = await findMany('pay_stubs', {
      where: [{ field: 'pay_run_id', operator: '=', value: id }],
      orderBy: [{ field: 'employee_name', direction: 'asc' }],
    })

    res.json({ ...payRun, stubs: payStubs })
  } catch (error) {
    logger.error('pay-runs.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<PayrollManagerLimits>({
    limitType: 'maxPayRuns',
    getLimit: (limits) => limits.maxPayRuns,
    getCurrent: async (userId) =>
      count('pay_runs', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPayRunSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const { pay_period_start, pay_period_end, pay_date } = req.body
      const result = await create('pay_runs', {
        user_id: userId,
        pay_period_start: new Date(pay_period_start),
        pay_period_end: new Date(pay_period_end),
        pay_date: new Date(pay_date),
        status: 'draft',
        total_gross: 0,
        total_net: 0,
        total_taxes: 0,
        total_deductions: 0,
        employee_count: 0,
        created_at: new Date(),
      })
      const created = result.data as Record<string, unknown> | null
      if (created?.id) {
        await log({
          actor: userId,
          action: 'create',
          resource: 'pay_run',
          resourceId: String(created.id),
        })
      }
      res.status(201).json(created)
    } catch (error) {
      logger.error('pay-runs.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const payRun = await findById<Record<string, unknown>>('pay_runs', id)
    if (!payRun || payRun.user_id !== userId) {
      return res.status(404).json({ error: t('payRuns.notFound') })
    }

    const current = String(payRun.status)
    // A processed pay run is TERMINAL. Re-approving it would flip status back to
    // 'approved' and let POST /:id/process run a SECOND time — duplicate pay stubs
    // and a double payment. Only a draft run can be approved; an already-approved
    // run is an idempotent no-op.
    if (current === 'approved') {
      return res.json({ success: true })
    }
    if (current !== 'draft') {
      return res.status(409).json({
        error: t(
          'payRuns.notApprovable',
          {},
          {
            defaultValue: 'A processed pay run cannot be re-approved',
          },
        ),
      })
    }

    await updateById('pay_runs', id, {
      status: 'approved',
      approved_by: userId,
      approved_at: new Date(),
    })
    await log({ actor: userId, action: 'approve', resource: 'pay_run', resourceId: id })
    res.json({ success: true })
  } catch (error) {
    logger.error('pay-runs.approve', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const payRun = await findById<Record<string, unknown>>('pay_runs', id)
    if (!payRun || payRun.user_id !== userId) {
      return res.status(404).json({ error: t('payRuns.notFound') })
    }
    if (payRun.status !== 'approved') {
      return res.status(400).json({ error: t('payRuns.notApproved') })
    }

    // Generate pay-stubs for every active employee, computing federal tax from
    // the seeded IRS bracket schedule for each employee's filing status. The
    // stubs are user-scoped via the user_id column. The dashboard / reports /
    // pay-stub pages all read from this table.
    const employees = await findMany<Record<string, unknown>>('employees', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
    })

    // Load the whole federal bracket schedule once and group it by filing status
    // so married vs single (vs head_of_household) withhold correctly. Use the pay
    // period's tax year, falling back to the latest seeded year. tax_filing_status
    // + tax_brackets were previously ignored — every employee got a flat rate.
    const bracketRows = await findMany<Record<string, unknown>>('tax_brackets', {
      orderBy: [{ field: 'min_income', direction: 'asc' }],
    })
    const payYear = payRun.pay_period_start
      ? new Date(String(payRun.pay_period_start)).getUTCFullYear()
      : new Date().getUTCFullYear()
    const availableYears = [...new Set(bracketRows.map((b) => Number(b.year)))]
    const bracketYear = availableYears.includes(payYear)
      ? payYear
      : availableYears.length > 0
        ? Math.max(...availableYears)
        : payYear
    const bracketsByStatus = new Map<string, FederalBracket[]>()
    for (const b of bracketRows) {
      if (Number(b.year) !== bracketYear) continue
      const status = String(b.filing_status)
      const list = bracketsByStatus.get(status) ?? []
      list.push({
        min_income: Number(b.min_income),
        max_income: b.max_income == null ? null : Number(b.max_income),
        rate: Number(b.rate),
      })
      bracketsByStatus.set(status, list)
    }

    let totalGross = 0
    let totalTaxes = 0
    let totalDeductions = 0
    let totalNet = 0

    for (const e of employees) {
      // Apply the employee's configured deductions (benefits/garnishments) to the stub — without
      // this the whole deductions resource was inert: stubs showed $0 deductions and overstated net.
      const empDeductions = (
        await findMany<Record<string, unknown>>('deductions', {
          where: [
            { field: 'employee_id', operator: '=', value: String(e.id) },
            { field: 'user_id', operator: '=', value: userId },
          ],
        })
      ).map((d) => ({
        amount: Number(d.amount ?? 0),
        is_percentage: Boolean(d.is_percentage),
        is_pretax: Boolean(d.is_pretax),
      }))
      // Apply the employee's W-4 tax_withholdings (allowances, additional withholding, exempt) to
      // the stub — without this the whole withholdings resource was inert: an exempt employee still
      // had full federal tax withheld and extra/allowance settings did nothing.
      const withholdingRows = await findMany<Record<string, unknown>>('tax_withholdings', {
        where: [
          { field: 'employee_id', operator: '=', value: String(e.id) },
          { field: 'user_id', operator: '=', value: userId },
        ],
        limit: 1,
      })
      const withholding = withholdingRows[0]
        ? {
            federal_allowances: Number(withholdingRows[0].federal_allowances ?? 0),
            state_allowances: Number(withholdingRows[0].state_allowances ?? 0),
            additional_withholding: Number(withholdingRows[0].additional_withholding ?? 0),
            exempt: Boolean(withholdingRows[0].exempt),
          }
        : {}
      const brackets = bracketsByStatus.get(String(e.tax_filing_status ?? 'single')) ?? []
      const m = computeStub(
        Number(e.salary),
        String(e.pay_frequency),
        empDeductions,
        brackets,
        withholding,
      )
      totalGross += m.gross
      totalTaxes += m.federal_tax + m.state_tax + m.fica + m.medicare
      totalDeductions += m.deductions_total
      totalNet += m.net
      await create('pay_stubs', {
        user_id: userId,
        pay_run_id: id,
        employee_id: e.id,
        employee_name: `${e.first_name} ${e.last_name}`,
        gross: m.gross,
        federal_tax: m.federal_tax,
        state_tax: m.state_tax,
        fica: m.fica,
        medicare: m.medicare,
        deductions_total: m.deductions_total,
        net: m.net,
        hours: 80,
        period_start: payRun.pay_period_start,
        period_end: payRun.pay_period_end,
        created_at: new Date(),
      })
    }

    await updateById('pay_runs', id, {
      status: 'processed',
      processed_at: new Date(),
      employee_count: employees.length,
      total_gross: Math.round(totalGross * 100) / 100,
      total_taxes: Math.round(totalTaxes * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
    })

    // Drop a notification so the user sees the "ran payroll" event in the
    // header dropdown without polling. The Notifications page also picks
    // it up.
    await create('notifications', {
      user_id: userId,
      category: 'pay_run',
      title: t('payRuns.processedSubject'),
      body: t('payRuns.processedBody', { id: String(id) }),
      href: `/pay-runs/${String(id)}`,
      unread: true,
      created_at: new Date(),
    })

    await log({ actor: userId, action: 'process', resource: 'pay_run', resourceId: id })

    const email = getUserEmail(res)
    if (email) {
      await sendMail({
        from: process.env.EMAIL_FROM ?? `noreply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        to: email,
        subject: t('payRuns.processedSubject'),
        text: t('payRuns.processedBody', { id: String(id) }),
      })
    }
    res.json({
      success: true,
      stubs_generated: employees.length,
      total_net: Math.round(totalNet * 100) / 100,
    })
  } catch (err) {
    logger.error('pay-runs.process', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
