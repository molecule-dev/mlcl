/**
 * Employees handler — CRUD for the company's W-2 employees.
 *
 * Scope: every row carries `user_id` (the owner of the implicit company).
 * Cross-user reads return 404, never the row. SSN is AES-encrypted at rest
 * and never returned in plaintext (only last-4 mask).
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { log } from '@molecule/api-audit'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PayrollManagerLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

async function maskSsn(ssnEncrypted: string | null | undefined): Promise<string | null> {
  if (!ssnEncrypted) return null
  try {
    const raw = await decrypt(ssnEncrypted)
    return `***-**-${String(raw).slice(-4)}`
  } catch (_error) {
    // decrypt failure means ciphertext is corrupt or key changed — return null mask rather than crashing
    return null
  }
}

/**
 * Strip server-only / sensitive fields from an employee row before
 * sending it to the client. We never return the raw `ssn_encrypted`
 * blob — the masked `ssn` field is added by the caller.
 */
function publicEmployee(row: Record<string, unknown>): Record<string, unknown> {
  const { ssn_encrypted: _ssn, ...rest } = row
  void _ssn
  return rest
}

const createEmployeeSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  ssn: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  salary: z.number().nonnegative().default(0),
  pay_frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).default('biweekly'),
  start_date: z.string().optional(),
  tax_filing_status: z.enum(['single', 'married', 'head_of_household']).default('single'),
})

const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  ssn: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  salary: z.number().nonnegative().optional(),
  pay_frequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).optional(),
  tax_filing_status: z.enum(['single', 'married', 'head_of_household']).optional(),
  status: z.enum(['active', 'terminated', 'on_leave']).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await seedDemoForUser(userId)

    const { status, department } = req.query
    const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
    if (status) where.push({ field: 'status', operator: '=' as const, value: String(status) })
    if (department)
      where.push({ field: 'department', operator: '=' as const, value: String(department) })

    const employees = await findMany('employees', {
      where,
      orderBy: [{ field: 'last_name', direction: 'asc' }],
    })

    const masked = await Promise.all(
      employees.map(async (e: Record<string, unknown>) => ({
        ...publicEmployee(e),
        ssn: await maskSsn(e.ssn_encrypted as string | null | undefined),
      })),
    )

    res.json(masked)
  } catch (error) {
    logger.error('employees.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await seedDemoForUser(userId)

    const id = getParamId(req)
    const employee = await findById<Record<string, unknown>>('employees', id)
    if (!employee || employee.user_id !== userId) {
      return res.status(404).json({ error: t('employees.notFound') })
    }

    res.json({
      ...publicEmployee(employee),
      ssn: await maskSsn(employee.ssn_encrypted as string | null | undefined),
    })
  } catch (error) {
    logger.error('employees.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<PayrollManagerLimits>({
    limitType: 'maxEmployees',
    getLimit: (limits) => limits.maxEmployees,
    getCurrent: async (userId) =>
      count('employees', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createEmployeeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const {
        first_name,
        last_name,
        email,
        ssn,
        department,
        title,
        salary,
        pay_frequency,
        start_date,
        tax_filing_status,
      } = req.body

      const result = await create('employees', {
        user_id: userId,
        first_name,
        last_name,
        email,
        ssn_encrypted: ssn ? await encrypt(ssn) : null,
        department,
        title,
        salary,
        pay_frequency,
        start_date: start_date ? new Date(start_date) : new Date(),
        tax_filing_status,
        status: 'active',
        created_at: new Date(),
      })

      const created = result.data as Record<string, unknown> | null
      if (created?.id) {
        await log({
          actor: userId,
          action: 'create',
          resource: 'employee',
          resourceId: String(created.id),
        })
      }
      res.status(201).json(
        created
          ? {
              ...publicEmployee(created),
              ssn: await maskSsn(created.ssn_encrypted as string | null | undefined),
            }
          : created,
      )
    } catch (error) {
      logger.error('employees.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateEmployeeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('employees', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('employees.notFound') })
    }

    const updates: Record<string, unknown> = {}
    for (const k of [
      'first_name',
      'last_name',
      'email',
      'department',
      'title',
      'salary',
      'pay_frequency',
      'tax_filing_status',
      'status',
    ] as const) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    if (typeof req.body.ssn === 'string' && req.body.ssn.length > 0) {
      updates.ssn_encrypted = await encrypt(req.body.ssn)
    }
    const result = await updateById('employees', id, updates)
    await log({ actor: userId, action: 'update', resource: 'employee', resourceId: id })
    const updated = result.data as Record<string, unknown> | null
    res.json(
      updated
        ? {
            ...publicEmployee(updated),
            ssn: await maskSsn(updated.ssn_encrypted as string | null | undefined),
          }
        : updated,
    )
  } catch (error) {
    logger.error('employees.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('employees', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('employees.notFound') })
    }

    await deleteById('employees', id)
    await log({ actor: userId, action: 'delete', resource: 'employee', resourceId: id })
    res.status(204).end()
  } catch (error) {
    logger.error('employees.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
