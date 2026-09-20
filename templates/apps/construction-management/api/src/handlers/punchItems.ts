import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { ConstructionManagementLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapePunchItem } from './_shape.js'

const router = Router()

export const PUNCH_SEVERITIES = ['low', 'medium', 'high'] as const
export const PUNCH_STATUSES = ['open', 'in_progress', 'closed'] as const
type PunchStatus = (typeof PUNCH_STATUSES)[number]

/** Which status transitions the workflow allows. */
const ALLOWED_TRANSITIONS: Record<PunchStatus, PunchStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['closed'],
  closed: [],
}

const createPunchSchema = z.object({
  project_id: z.string().uuid(),
  location: z.string().min(1).max(200),
  severity: z.enum(PUNCH_SEVERITIES).optional(),
  description: z.string().min(1).max(2000),
  assignee: z.string().max(200).optional().nullable(),
  photo_url: z.string().url().max(2000).optional().nullable(),
})

const updatePunchSchema = z.object({
  location: z.string().min(1).max(200).optional(),
  severity: z.enum(PUNCH_SEVERITIES).optional(),
  description: z.string().min(1).max(2000).optional(),
  assignee: z.string().max(200).optional().nullable(),
  photo_url: z.string().url().max(2000).optional().nullable(),
})

const statusSchema = z.object({
  status: z.enum(PUNCH_STATUSES),
})

/** Project rows for the owner, as an id→row lookup map. */
async function projectLookup(userId: string): Promise<Map<string, Record<string, unknown>>> {
  const rows = await findMany('projects', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
  })
  return asMap(rows as Array<Record<string, unknown>>, 'id')
}

router.use(authorizers.auth())

// List punch items — owner-scoped, optional project/status/severity filters.
// Seeds demo data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { project_id, status, severity } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (project_id && typeof project_id === 'string') {
      where.push({ field: 'project_id', operator: '=', value: project_id })
    }
    if (status && PUNCH_STATUSES.includes(String(status) as PunchStatus)) {
      where.push({ field: 'status', operator: '=', value: String(status) })
    }
    if (
      severity &&
      PUNCH_SEVERITIES.includes(String(severity) as (typeof PUNCH_SEVERITIES)[number])
    ) {
      where.push({ field: 'severity', operator: '=', value: String(severity) })
    }

    const rows = await findMany('punch_items', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    const projectById = await projectLookup(userId)
    res.json(rows.map((r) => shapePunchItem(r as Record<string, unknown>, projectById)))
  } catch (err) {
    logger.error('[punch-items] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get punch item — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('punch_items', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('punch.notFound', {}, { defaultValue: 'Punch item not found' }) })
      return
    }
    const projectById = await projectLookup(userId)
    res.json(shapePunchItem(check.row as Record<string, unknown>, projectById))
  } catch (err) {
    logger.error('[punch-items] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// File a punch item — entitlement-gated.
router.post(
  '/',
  enforceLimit<ConstructionManagementLimits>({
    limitType: 'maxPunchItems',
    getLimit: (limits) => limits.maxPunchItems,
    getCurrent: async (userId) =>
      count('punch_items', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPunchSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createPunchSchema>
      const projectCheck = await requireOwnership('projects', body.project_id, userId)
      if (!projectCheck.ok) {
        res.status(projectCheck.status).json({
          error: t('projects.notFound', {}, { defaultValue: 'Project not found' }),
        })
        return
      }
      const now = new Date().toISOString()
      const result = await create('punch_items', {
        owner_id: userId,
        project_id: body.project_id,
        location: body.location,
        severity: body.severity ?? 'medium',
        description: body.description,
        assignee: body.assignee ?? null,
        status: 'open',
        photo_url: body.photo_url ?? null,
        closed_at: null,
        created_at: now,
        updated_at: now,
      })
      const projectById = await projectLookup(userId)
      res.status(201).json(shapePunchItem(result.data as Record<string, unknown>, projectById))
    } catch (err) {
      logger.error('[punch-items] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update punch fields (assign, add photo, edit) — owner-only. Status changes
// go through /status.
router.put('/:id', validateBody(updatePunchSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('punch_items', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('punch.notFound', {}, { defaultValue: 'Punch item not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updatePunchSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of ['location', 'severity', 'description', 'assignee', 'photo_url'] as const) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    const result = await updateById('punch_items', req.params.id as string, updates)
    const projectById = await projectLookup(userId)
    res.json(shapePunchItem(result.data as Record<string, unknown>, projectById))
  } catch (err) {
    logger.error('[punch-items] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Status transition — validates the open → in_progress → closed workflow and
// stamps closed_at when the item is closed out.
router.post('/:id/status', validateBody(statusSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('punch_items', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('punch.notFound', {}, { defaultValue: 'Punch item not found' }) })
      return
    }
    const row = check.row as Record<string, unknown>
    const current = String(row.status ?? 'open') as PunchStatus
    const next = (req.body as z.infer<typeof statusSchema>).status
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      res.status(409).json({
        error: t(
          'punch.invalidTransition',
          { from: current, to: next },
          { defaultValue: 'Cannot move a {{from}} punch item to {{to}}' },
        ),
      })
      return
    }
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status: next, updated_at: now }
    if (next === 'closed') updates.closed_at = now

    const result = await updateById('punch_items', req.params.id as string, updates)
    const projectById = await projectLookup(userId)
    res.json(shapePunchItem(result.data as Record<string, unknown>, projectById))
  } catch (err) {
    logger.error('[punch-items] status failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete punch item — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('punch_items', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('punch.notFound', {}, { defaultValue: 'Punch item not found' }) })
      return
    }
    await deleteById('punch_items', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[punch-items] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
