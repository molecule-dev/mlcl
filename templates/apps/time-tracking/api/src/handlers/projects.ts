import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { TimeTrackingLimits } from '../tiers.js'

const router = Router()

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  color: z.string().optional(),
  budget_cents: z.number().int().nonnegative().optional().nullable(),
  billable: z.boolean().optional(),
  hourly_rate_cents: z.number().int().nonnegative().optional().nullable(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  color: z.string().optional(),
  budget_cents: z.number().int().nonnegative().optional().nullable(),
  billable: z.boolean().optional(),
  hourly_rate_cents: z.number().int().nonnegative().optional().nullable(),
  archived: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const { client_id, archived } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (client_id) where.push({ field: 'client_id', operator: '=', value: client_id })
    if (archived !== undefined) {
      where.push({ field: 'archived', operator: '=', value: archived === 'true' })
    }
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const items = await findMany('projects', { where, orderBy })
    res.json(items)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const project = await findById<Record<string, unknown>>('projects', id)
    if (!project || project.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    res.json(project)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier project cap (tiers.ts maxProjects) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited projects.
const enforceProjectLimit = enforceLimit<TimeTrackingLimits>({
  limitType: 'maxProjects',
  getLimit: (limits) => limits.maxProjects,
  getCurrent: async (userId) =>
    count('projects', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceProjectLimit,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }

      const { name, description, client_id, color, budget_cents, billable, hourly_rate_cents } =
        req.body

      const result = await create('projects', {
        owner_id: userId,
        name,
        description: description ?? null,
        client_id: client_id ?? null,
        color: color ?? '#808080',
        budget_cents: budget_cents ?? null,
        billable: billable ?? true,
        hourly_rate_cents: hourly_rate_cents ?? null,
        archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    } catch (err: unknown) {
      console.error('[time-tracking handler] internal error:', err)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('projects', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const field of [
      'name',
      'description',
      'client_id',
      'color',
      'budget_cents',
      'billable',
      'hourly_rate_cents',
      'archived',
    ]) {
      if (field in req.body) updates[field] = req.body[field]
    }
    const result = await updateById('projects', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Archive shortcut.
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('projects', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    const result = await updateById('projects', id, {
      archived: true,
      updated_at: new Date(),
    })
    res.json((result as { data?: unknown }).data ?? result)
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('projects', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    await deleteById('projects', id)
    res.status(204).end()
  } catch (err: unknown) {
    console.error('[time-tracking handler] internal error:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
