import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDefaultOnboardingIfMissing } from '../seedDefaultOnboarding.js'
import type { EmployeeOnboardingLimits } from '../tiers.js'

const router = Router()

const createTaskSchema = z.object({
  onboarding_id: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.enum(['paperwork', 'training', 'intro', 'it', 'general', 'other']).optional(),
  assignee_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  position: z.number().int().optional(),
})

const updateTaskSchema = z.object({
  onboarding_id: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.enum(['paperwork', 'training', 'intro', 'it', 'general', 'other']).optional(),
  assignee_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  position: z.number().int().optional(),
  status: z.enum(['pending', 'in_progress', 'complete', 'overdue']).optional(),
  completed_at: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    await seedDefaultOnboardingIfMissing(userId)

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (typeof req.query.onboarding_id === 'string') {
      where.push({ field: 'onboarding_id', operator: '=', value: req.query.onboarding_id })
    }
    if (typeof req.query.status === 'string') {
      where.push({ field: 'status', operator: '=', value: req.query.status })
    }

    const items = await findMany('onboarding_tasks', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('onboarding_tasks', id)
    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('tasks.notFound', undefined, { defaultValue: 'Task not found' }) })
    }
    res.json(item)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier tasks cap (tiers.ts maxTasks) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceTaskLimit = enforceLimit<EmployeeOnboardingLimits>({
  limitType: 'maxTasks',
  getLimit: (limits) => limits.maxTasks,
  getCurrent: async (userId) =>
    count('onboarding_tasks', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceTaskLimit,
  validateBody(createTaskSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createTaskSchema>
      const result = await create('onboarding_tasks', {
        user_id: userId,
        onboarding_id: body.onboarding_id ?? null,
        title: body.title,
        description: body.description ?? null,
        category: body.category ?? 'general',
        assignee_id: body.assignee_id ?? null,
        due_date: body.due_date ? new Date(body.due_date) : null,
        position: body.position ?? 0,
        status: 'pending',
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('onboarding_tasks', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('tasks.notFound', undefined, { defaultValue: 'Task not found' }) })
    }

    const body = req.body as z.infer<typeof updateTaskSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.onboarding_id !== undefined) updates.onboarding_id = body.onboarding_id
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.category !== undefined) updates.category = body.category
    if (body.assignee_id !== undefined) updates.assignee_id = body.assignee_id
    if (body.due_date !== undefined)
      updates.due_date = body.due_date ? new Date(body.due_date) : null
    if (body.position !== undefined) updates.position = body.position
    if (body.status !== undefined) {
      updates.status = body.status
      if (body.status === 'complete' && !existing.completed_at) {
        updates.completed_at = new Date()
        updates.completed_by = userId
      }
    }
    if (body.completed_at !== undefined) {
      updates.completed_at = body.completed_at ? new Date(body.completed_at) : null
    }

    const result = await updateById('onboarding_tasks', id, updates)
    res.json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('onboarding_tasks', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('tasks.notFound', undefined, { defaultValue: 'Task not found' }) })
    }
    await deleteById('onboarding_tasks', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
