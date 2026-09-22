import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDefaultOnboardingIfMissing } from '../seedDefaultOnboarding.js'
import type { EmployeeOnboardingLimits } from '../tiers.js'

const router = Router()

const logger = getLogger()

const createOnboardingSchema = z.object({
  employee_id: z.string().min(1).optional(),
  template_id: z.string().nullable().optional(),
  manager_id: z.string().nullable().optional(),
  buddy_id: z.string().nullable().optional(),
  start_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
})

const updateOnboardingSchema = z.object({
  employee_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  manager_id: z.string().nullable().optional(),
  buddy_id: z.string().nullable().optional(),
  start_date: z.string().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  completion_pct: z.number().min(0).max(100).optional(),
  completed_at: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    // First-time access: bootstrap the default onboarding (with starter
    // tasks / milestones / team / training / docs / notifications) if the
    // user has nothing yet. Idempotent — only seeds once per user.
    await seedDefaultOnboardingIfMissing(userId)

    const status = typeof req.query.status === 'string' ? req.query.status : null
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const items = await findMany('onboardings', {
      where,
      orderBy: [{ field: 'start_date', direction: 'desc' }],
    })
    res.json(items)
  } catch (_err) {
    logger.error('onboardings.list', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * GET /api/onboardings/me — the current user's primary onboarding plus
 * computed task counts. Used by the dashboard hero, profile progress
 * ring, and timeline header so the frontend doesn't have to re-derive
 * "your day N of 90" from raw rows on every render.
 */
router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const onboarding = await seedDefaultOnboardingIfMissing(userId)
    if (!onboarding) {
      return res.status(404).json({
        error: t('onboardings.notFound', undefined, { defaultValue: 'Onboarding not found' }),
      })
    }

    const onboardingId = String(onboarding.id)
    const tasks = await findMany<{ status: string; due_date?: string }>('onboarding_tasks', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'onboarding_id', operator: '=', value: onboardingId },
      ],
    })
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(
      (t) => t.status === 'complete' || t.status === 'completed' || t.status === 'done',
    ).length
    const inProgressTasks = tasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'active',
    ).length
    // A task is overdue when its due date has passed and it isn't complete. The old code counted
    // only tasks whose status was literally 'overdue' — a sentinel nothing ever sets — so the
    // Overdue stat stayed 0 even with many past-due tasks. Derive it from the stored due_date.
    const now = Date.now()
    const overdueTasks = tasks.filter(
      (t) =>
        t.status !== 'complete' &&
        t.status !== 'completed' &&
        t.status !== 'done' &&
        (t.status === 'overdue' || (t.due_date != null && new Date(t.due_date).getTime() < now)),
    ).length

    const milestones = await findMany<{ achieved_at?: string | null }>('timeline_milestones', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'onboarding_id', operator: '=', value: onboardingId },
      ],
    })
    const totalMilestones = milestones.length
    const achievedMilestones = milestones.filter((m) => m.achieved_at != null).length

    const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const startDate =
      onboarding.start_date instanceof Date
        ? onboarding.start_date
        : new Date(String(onboarding.start_date))
    const dayNumber = Math.max(
      1,
      Math.min(90, Math.round((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
    )

    const user = await findOne<{ id: string; name?: string | null; email?: string | null }>(
      'users',
      [{ field: 'id', operator: '=', value: userId }],
    )

    const firstName = user?.name?.split(/\s+/)[0] ?? null
    const fullName = user?.name ?? null

    res.json({
      onboarding,
      user: {
        id: user?.id ?? userId,
        name: fullName,
        firstName,
        email: user?.email ?? null,
      },
      counts: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalMilestones,
        achievedMilestones,
      },
      derived: {
        completionPct,
        dayNumber,
      },
    })
  } catch (_err) {
    logger.error('onboardings.me', _err as Error)
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
    const item = await findById<Record<string, unknown>>('onboardings', id)
    if (!item || item.user_id !== userId) {
      return res.status(404).json({
        error: t('onboardings.notFound', undefined, { defaultValue: 'Onboarding not found' }),
      })
    }

    const tasks = await findMany('onboarding_tasks', {
      where: [{ field: 'onboarding_id', operator: '=', value: id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...item, tasks })
  } catch (_err) {
    logger.error('onboardings.read', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier onboardings cap (tiers.ts maxOnboardings) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceOnboardingLimit = enforceLimit<EmployeeOnboardingLimits>({
  limitType: 'maxOnboardings',
  getLimit: (limits) => limits.maxOnboardings,
  getCurrent: async (userId) =>
    count('onboardings', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceOnboardingLimit,
  validateBody(createOnboardingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createOnboardingSchema>
      const result = await create('onboardings', {
        user_id: userId,
        employee_id: body.employee_id ?? null,
        template_id: body.template_id ?? null,
        manager_id: body.manager_id ?? null,
        buddy_id: body.buddy_id ?? null,
        start_date: body.start_date ? new Date(body.start_date) : new Date(),
        status: body.status ?? 'active',
        completion_pct: 0,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (_err) {
      logger.error('onboardings.create', _err as Error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateOnboardingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('onboardings', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('onboardings.notFound', undefined, { defaultValue: 'Onboarding not found' }),
      })
    }

    const body = req.body as z.infer<typeof updateOnboardingSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.employee_id !== undefined) updates.employee_id = body.employee_id
    if (body.template_id !== undefined) updates.template_id = body.template_id
    if (body.manager_id !== undefined) updates.manager_id = body.manager_id
    if (body.buddy_id !== undefined) updates.buddy_id = body.buddy_id
    if (body.start_date !== undefined) updates.start_date = new Date(body.start_date)
    if (body.status !== undefined) updates.status = body.status
    if (body.completion_pct !== undefined) updates.completion_pct = body.completion_pct
    if (body.completed_at !== undefined)
      updates.completed_at = body.completed_at ? new Date(body.completed_at) : null

    const result = await updateById('onboardings', id, updates)
    res.json(result.data)
  } catch (_err) {
    logger.error('onboardings.update', _err as Error)
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
    const existing = await findById<Record<string, unknown>>('onboardings', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('onboardings.notFound', undefined, { defaultValue: 'Onboarding not found' }),
      })
    }
    await deleteById('onboardings', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('onboardings.delete', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
