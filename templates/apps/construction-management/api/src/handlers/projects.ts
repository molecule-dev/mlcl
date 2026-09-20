import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { ConstructionManagementLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { shapeProject } from './_shape.js'

const router = Router()

export const PROJECT_PHASES = [
  'preconstruction',
  'site_work',
  'foundations',
  'structure',
  'envelope',
  'mechanicals',
  'finishes',
  'closeout',
] as const

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(40).optional(),
  description: z.string().max(4000).optional(),
  phase: z.enum(PROJECT_PHASES).optional(),
  budget_cents: z.number().int().min(0).max(1_000_000_000_000).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  start_date: z.string().regex(DATE_RE).optional().nullable(),
  end_date: z.string().regex(DATE_RE).optional().nullable(),
})

const updateProjectSchema = createProjectSchema.partial()

router.use(authorizers.auth())

// List projects — owner-scoped. Seeds demo data on first authenticated call.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const rows = await findMany('projects', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(rows.map((r) => shapeProject(r as Record<string, unknown>)))
  } catch (err) {
    logger.error('[projects] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get project — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('projects', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    res.json(shapeProject(check.row as Record<string, unknown>))
  } catch (err) {
    logger.error('[projects] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create project — entitlement-gated.
router.post(
  '/',
  enforceLimit<ConstructionManagementLimits>({
    limitType: 'maxProjects',
    getLimit: (limits) => limits.maxProjects,
    getCurrent: async (userId) =>
      count('projects', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createProjectSchema>
      const now = new Date().toISOString()
      const result = await create('projects', {
        owner_id: userId,
        name: body.name,
        code: body.code ?? '',
        description: body.description ?? '',
        phase: body.phase ?? 'preconstruction',
        budget_cents: body.budget_cents ?? 0,
        progress: body.progress ?? 0,
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(shapeProject(result.data as Record<string, unknown>))
    } catch (err) {
      logger.error('[projects] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update project fields — owner-only.
router.put('/:id', validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('projects', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateProjectSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of [
      'name',
      'code',
      'description',
      'phase',
      'budget_cents',
      'progress',
      'start_date',
      'end_date',
    ] as const) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    const result = await updateById('projects', req.params.id as string, updates)
    res.json(shapeProject(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('[projects] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete project — owner-only. Cascades through every project-scoped table
// (the database bond does not enforce FKs, so children are swept explicitly).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('projects', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const projectId = req.params.id as string

    for (const log of await findMany('daily_logs', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
    })) {
      const logId = (log as Record<string, unknown>).id
      if (typeof logId !== 'string') continue
      for (const entry of await findMany('log_entries', {
        where: [{ field: 'log_id', operator: '=', value: logId }],
      })) {
        const entryId = (entry as Record<string, unknown>).id
        if (typeof entryId === 'string') await deleteById('log_entries', entryId)
      }
      await deleteById('daily_logs', logId)
    }

    for (const item of await findMany('punch_items', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
    })) {
      const itemId = (item as Record<string, unknown>).id
      if (typeof itemId === 'string') await deleteById('punch_items', itemId)
    }

    for (const rfi of await findMany('rfis', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
    })) {
      const rfiId = (rfi as Record<string, unknown>).id
      if (typeof rfiId !== 'string') continue
      for (const resp of await findMany('rfi_responses', {
        where: [{ field: 'rfi_id', operator: '=', value: rfiId }],
      })) {
        const respId = (resp as Record<string, unknown>).id
        if (typeof respId === 'string') await deleteById('rfi_responses', respId)
      }
      await deleteById('rfis', rfiId)
    }

    for (const sub of await findMany('subcontractors', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
    })) {
      const subId = (sub as Record<string, unknown>).id
      if (typeof subId === 'string') await deleteById('subcontractors', subId)
    }

    await deleteById('projects', projectId)
    res.status(204).end()
  } catch (err) {
    logger.error('[projects] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
