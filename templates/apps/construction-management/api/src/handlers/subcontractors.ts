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
import { asMap, shapeSubcontractor } from './_shape.js'

const router = Router()

export const SUBCONTRACTOR_STATUSES = ['invited', 'active', 'terminated'] as const

const createSubcontractorSchema = z.object({
  project_id: z.string().uuid(),
  trade: z.string().min(1).max(120),
  company: z.string().min(1).max(200),
  contact: z.string().max(300).optional(),
  contract_value_cents: z.number().int().min(0).max(1_000_000_000_000).optional(),
  status: z.enum(SUBCONTRACTOR_STATUSES).optional(),
})

const updateSubcontractorSchema = z.object({
  trade: z.string().min(1).max(120).optional(),
  company: z.string().min(1).max(200).optional(),
  contact: z.string().max(300).optional(),
  contract_value_cents: z.number().int().min(0).max(1_000_000_000_000).optional(),
  status: z.enum(SUBCONTRACTOR_STATUSES).optional(),
})

/** Project rows for the owner, as an id→row lookup map. */
async function projectLookup(userId: string): Promise<Map<string, Record<string, unknown>>> {
  const rows = await findMany('projects', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
  })
  return asMap(rows as Array<Record<string, unknown>>, 'id')
}

router.use(authorizers.auth())

// List subcontractors — owner-scoped, optional project filter. Seeds demo
// data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { project_id } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (project_id && typeof project_id === 'string') {
      where.push({ field: 'project_id', operator: '=', value: project_id })
    }

    const rows = await findMany('subcontractors', {
      where,
      orderBy: [{ field: 'trade', direction: 'asc' }],
    })
    const projectById = await projectLookup(userId)
    res.json(rows.map((r) => shapeSubcontractor(r as Record<string, unknown>, projectById)))
  } catch (err) {
    logger.error('[subcontractors] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get subcontractor — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('subcontractors', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('subs.notFound', {}, { defaultValue: 'Subcontractor not found' }),
      })
      return
    }
    const projectById = await projectLookup(userId)
    res.json(shapeSubcontractor(check.row as Record<string, unknown>, projectById))
  } catch (err) {
    logger.error('[subcontractors] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add a subcontractor to a project — entitlement-gated.
router.post(
  '/',
  enforceLimit<ConstructionManagementLimits>({
    limitType: 'maxSubcontractors',
    getLimit: (limits) => limits.maxSubcontractors,
    getCurrent: async (userId) =>
      count('subcontractors', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createSubcontractorSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createSubcontractorSchema>
      const projectCheck = await requireOwnership('projects', body.project_id, userId)
      if (!projectCheck.ok) {
        res.status(projectCheck.status).json({
          error: t('projects.notFound', {}, { defaultValue: 'Project not found' }),
        })
        return
      }
      const now = new Date().toISOString()
      const result = await create('subcontractors', {
        owner_id: userId,
        project_id: body.project_id,
        trade: body.trade,
        company: body.company,
        contact: body.contact ?? '',
        contract_value_cents: body.contract_value_cents ?? 0,
        status: body.status ?? 'invited',
        created_at: now,
        updated_at: now,
      })
      const projectById = await projectLookup(userId)
      res.status(201).json(shapeSubcontractor(result.data as Record<string, unknown>, projectById))
    } catch (err) {
      logger.error('[subcontractors] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update subcontractor — owner-only.
router.put('/:id', validateBody(updateSubcontractorSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('subcontractors', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('subs.notFound', {}, { defaultValue: 'Subcontractor not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateSubcontractorSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of ['trade', 'company', 'contact', 'contract_value_cents', 'status'] as const) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    const result = await updateById('subcontractors', req.params.id as string, updates)
    const projectById = await projectLookup(userId)
    res.json(shapeSubcontractor(result.data as Record<string, unknown>, projectById))
  } catch (err) {
    logger.error('[subcontractors] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Remove subcontractor — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('subcontractors', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('subs.notFound', {}, { defaultValue: 'Subcontractor not found' }),
      })
      return
    }
    await deleteById('subcontractors', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[subcontractors] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
