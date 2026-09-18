/**
 * Taxes handler — federal/state tax brackets (global) + per-employee W-4
 * withholdings (user-scoped).
 *
 * Brackets are seeded by the 0010 migration and refreshed annually. The
 * v1 calc engine is a simple bracket lookup against this table; complex
 * multi-state handling is deferred to v2 (see INVENTORY.md "Open
 * questions / decisions deferred").
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

function getParamId(req: Request, key = 'id'): string {
  const v = req.params[key]
  return Array.isArray(v) ? v[0] : (v ?? '')
}

const bracketsQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2999).optional(),
  filing_status: z.enum(['single', 'married', 'head_of_household']).optional(),
})

const withholdingsSchema = z.object({
  federal_allowances: z.number().int().min(0).default(0),
  state_allowances: z.number().int().min(0).default(0),
  additional_withholding: z.number().nonnegative().default(0),
  exempt: z.boolean().default(false),
})

router.get('/brackets', validateQuery(bracketsQuerySchema), async (req: Request, res: Response) => {
  try {
    const where: Array<{ field: string; operator: '='; value: unknown }> = []
    const q = req.query as { year?: number; filing_status?: string }
    if (q.year) where.push({ field: 'year', operator: '=', value: q.year })
    if (q.filing_status)
      where.push({ field: 'filing_status', operator: '=', value: q.filing_status })

    const brackets = await findMany('tax_brackets', {
      where: where.length > 0 ? where : undefined,
      orderBy: [{ field: 'min_income', direction: 'asc' }],
    })
    res.json(brackets)
  } catch (error) {
    logger.error('taxes.brackets', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/withholdings/:employeeId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const employeeId = getParamId(req, 'employeeId')

    // Confirm the parent employee is owned by the caller before exposing
    // any of its withholdings (prevents IDOR via parent-key lookup).
    const employee = await findById<Record<string, unknown>>('employees', employeeId)
    if (!employee || employee.user_id !== userId) {
      return res.json([])
    }

    const withholdings = await findMany('tax_withholdings', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'employee_id', operator: '=', value: employeeId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(withholdings)
  } catch (error) {
    logger.error('taxes.withholdings.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put(
  '/withholdings/:employeeId',
  validateBody(withholdingsSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const employeeId = getParamId(req, 'employeeId')
      const employee = await findById<Record<string, unknown>>('employees', employeeId)
      if (!employee || employee.user_id !== userId) {
        return res.status(404).json({ error: t('employees.notFound') })
      }

      const { federal_allowances, state_allowances, additional_withholding, exempt } = req.body

      const existing = await findMany<Record<string, unknown>>('tax_withholdings', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'employee_id', operator: '=', value: employeeId },
        ],
        limit: 1,
      })

      if (existing.length > 0 && existing[0].id) {
        const result = await updateById('tax_withholdings', existing[0].id as string, {
          federal_allowances,
          state_allowances,
          additional_withholding,
          exempt,
        })
        return res.json(result.data)
      }

      const result = await create('tax_withholdings', {
        user_id: userId,
        employee_id: employeeId,
        federal_allowances,
        state_allowances,
        additional_withholding,
        exempt,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('taxes.withholdings.put', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
