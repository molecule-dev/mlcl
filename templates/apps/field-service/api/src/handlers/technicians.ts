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
import type { FieldServiceLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { shapeTechnician } from './_shape.js'

const router = Router()

const createTechnicianSchema = z.object({
  name: z.string().min(1).max(200),
  trade: z.string().max(40).optional(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(320).optional().nullable(),
  skills: z.array(z.string().max(80)).max(20).optional(),
  active: z.boolean().optional(),
})

const updateTechnicianSchema = createTechnicianSchema.partial()

/** Statuses that count as "active work" for the active-job badge. */
const OPEN_JOB_STATUSES = new Set(['scheduled', 'en_route', 'in_progress'])

router.use(authorizers.auth())

// List technicians — owner-scoped, with open job counts.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (req.query.active === 'true' || req.query.active === 'false') {
      where.push({ field: 'active', operator: '=', value: req.query.active === 'true' })
    }

    const technicians = await findMany('technicians', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    const jobs = await findMany('jobs', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const openByTech = new Map<string, number>()
    for (const j of jobs as Array<Record<string, unknown>>) {
      const techId = typeof j.technician_id === 'string' ? j.technician_id : null
      const status = typeof j.status === 'string' ? j.status : ''
      if (techId && OPEN_JOB_STATUSES.has(status)) {
        openByTech.set(techId, (openByTech.get(techId) ?? 0) + 1)
      }
    }
    res.json(
      technicians.map((tech) => shapeTechnician(tech as Record<string, unknown>, openByTech)),
    )
  } catch (err) {
    logger.error('[technicians] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get technician details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('technicians', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('technicians.notFound', {}, { defaultValue: 'Technician not found' }),
      })
      return
    }
    res.json(shapeTechnician(check.row as Record<string, unknown>))
  } catch (err) {
    logger.error('[technicians] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create technician — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<FieldServiceLimits>({
    limitType: 'maxTechnicians',
    getLimit: (limits) => limits.maxTechnicians,
    getCurrent: async (userId) =>
      count('technicians', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTechnicianSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createTechnicianSchema>
      const now = new Date().toISOString()
      const result = await create('technicians', {
        owner_id: userId,
        name: body.name,
        trade: body.trade ?? 'general',
        phone: body.phone ?? null,
        email: body.email ?? null,
        skills: body.skills ?? [],
        active: body.active ?? true,
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(shapeTechnician(result.data as Record<string, unknown>))
    } catch (err) {
      logger.error('[technicians] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update technician — owner-only.
router.put('/:id', validateBody(updateTechnicianSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('technicians', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('technicians.notFound', {}, { defaultValue: 'Technician not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateTechnicianSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.trade !== undefined) updates.trade = body.trade
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.email !== undefined) updates.email = body.email
    if (body.skills !== undefined) updates.skills = body.skills
    if (body.active !== undefined) updates.active = body.active

    const result = await updateById('technicians', req.params.id as string, updates)
    res.json(shapeTechnician(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('[technicians] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete technician — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('technicians', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('technicians.notFound', {}, { defaultValue: 'Technician not found' }),
      })
      return
    }
    await deleteById('technicians', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[technicians] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
