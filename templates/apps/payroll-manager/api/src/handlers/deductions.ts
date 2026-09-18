/**
 * Deductions handler — per-employee benefits / garnishments.
 *
 * Scope: every row carries `user_id` (the owner). Cross-user reads return
 * 404. The employee_id parent is also user-scoped at write time.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PayrollManagerLimits } from '../tiers.js'

const router = Router()

function getParamId(req: Request, key = 'id'): string {
  const v = req.params[key]
  return Array.isArray(v) ? v[0] : (v ?? '')
}

const createDeductionSchema = z.object({
  employee_id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['401k', 'health', 'dental', 'vision', 'loan', 'other']).default('other'),
  amount: z.number().nonnegative(),
  is_percentage: z.boolean().default(false),
  is_pretax: z.boolean().default(false),
})

const updateDeductionSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['401k', 'health', 'dental', 'vision', 'loan', 'other']).optional(),
  amount: z.number().nonnegative().optional(),
  is_percentage: z.boolean().optional(),
  is_pretax: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const employeeId = getParamId(req, 'employeeId')

    // Ensure the employee belongs to the calling user before exposing any
    // of its deductions — prevents IDOR via the parent-key lookup.
    const employee = await findById<Record<string, unknown>>('employees', employeeId)
    if (!employee || employee.user_id !== userId) {
      return res.json([])
    }

    const deductions = await findMany('deductions', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'employee_id', operator: '=', value: employeeId },
      ],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(deductions)
  } catch (error) {
    logger.error('deductions.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<PayrollManagerLimits>({
    limitType: 'maxDeductions',
    getLimit: (limits) => limits.maxDeductions,
    getCurrent: async (userId) =>
      count('deductions', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDeductionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const { employee_id, name, type, amount, is_percentage, is_pretax } = req.body

      // Confirm the parent employee is owned by the caller (no cross-user
      // deduction inserts via a stolen employee_id).
      const employee = await findById<Record<string, unknown>>('employees', employee_id)
      if (!employee || employee.user_id !== userId) {
        return res.status(404).json({ error: t('employees.notFound') })
      }

      const result = await create('deductions', {
        user_id: userId,
        employee_id,
        name,
        type,
        amount,
        is_percentage,
        is_pretax,
        is_active: true,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('deductions.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateDeductionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('deductions', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('deductions.notFound') })
    }

    const updates: Record<string, unknown> = {}
    for (const k of [
      'name',
      'type',
      'amount',
      'is_percentage',
      'is_pretax',
      'is_active',
    ] as const) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    const result = await updateById('deductions', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('deductions.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('deductions', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('deductions.notFound') })
    }

    await deleteById('deductions', id)
    res.status(204).end()
  } catch (error) {
    logger.error('deductions.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
