/**
 * Policies handler — per-user expense policies.
 *
 * Backs the `Settings` page's "Approval policies" table. Errors bubble
 * up to the express error middleware so failures show in dev.log
 * rather than being swallowed behind a 500.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { ExpenseReportLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const createPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  max_amount: z.number().nonnegative().optional(),
  categories: z.array(z.string()).optional(),
  requires_receipt_above: z.number().nonnegative().optional(),
  auto_approve_below: z.number().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

const updatePolicySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  max_amount: z.number().nonnegative().optional(),
  categories: z.array(z.string()).optional(),
  requires_receipt_above: z.number().nonnegative().optional(),
  auto_approve_below: z.number().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const policies = await findMany('expense_policies', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'name', direction: 'asc' }],
  })
  res.json(policies)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  const policy = await findById<Record<string, unknown>>('expense_policies', id)
  if (!policy || policy.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('policies.notFound', undefined, { defaultValue: 'Policy not found' }) })
  }
  res.json(policy)
})

// Enforce the per-tier policy cap (tiers.ts maxPolicies) — defined + advertised in CATALOG but
// enforceLimit was never called, so any tier could create unlimited policies. Counts the REAL
// table (`expense_policies` — a `policies` table does not exist, the count always threw 500).
const enforcePolicyLimit = enforceLimit<ExpenseReportLimits>({
  limitType: 'maxPolicies',
  getLimit: (limits) => limits.maxPolicies,
  getCurrent: async (userId) =>
    count('expense_policies', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforcePolicyLimit,
  validateBody(createPolicySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const {
      name,
      description,
      max_amount,
      categories,
      requires_receipt_above,
      auto_approve_below,
    } = req.body

    const result = await create('expense_policies', {
      user_id: userId,
      name,
      description,
      max_amount,
      categories: categories ?? [],
      requires_receipt_above: requires_receipt_above ?? 25,
      auto_approve_below: auto_approve_below ?? 0,
      is_active: true,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  },
)

router.put('/:id', validateBody(updatePolicySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('expense_policies', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('policies.notFound', undefined, { defaultValue: 'Policy not found' }) })
  }

  const {
    name,
    description,
    max_amount,
    categories,
    requires_receipt_above,
    auto_approve_below,
    is_active,
  } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (max_amount !== undefined) updates.max_amount = max_amount
  if (categories !== undefined) updates.categories = categories
  if (requires_receipt_above !== undefined) updates.requires_receipt_above = requires_receipt_above
  if (auto_approve_below !== undefined) updates.auto_approve_below = auto_approve_below
  if (is_active !== undefined) updates.is_active = is_active

  const result = await updateById('expense_policies', id, updates)
  res.json((result as { data?: unknown }).data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('expense_policies', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('policies.notFound', undefined, { defaultValue: 'Policy not found' }) })
  }
  await deleteById('expense_policies', id)
  res.status(204).end()
})

export default router
