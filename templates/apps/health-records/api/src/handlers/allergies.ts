import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { HealthRecordsLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const ALLOWED_CATEGORIES = ['medication', 'food', 'environmental', 'biologic', 'other'] as const
const ALLOWED_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'] as const
const ALLOWED_STATUSES = ['active', 'inactive', 'resolved'] as const

const createSchema = z.object({
  allergen: z.string().min(1),
  substance: z.string().optional(),
  category: z.enum(ALLOWED_CATEGORIES).default('medication'),
  reaction: z.string().optional(),
  severity: z.enum(ALLOWED_SEVERITIES).default('moderate'),
  onset_date: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).default('active'),
  verified_by: z.string().optional(),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  allergen: z.string().min(1).optional(),
  substance: z.string().optional().nullable(),
  category: z.enum(ALLOWED_CATEGORIES).optional(),
  reaction: z.string().optional().nullable(),
  severity: z.enum(ALLOWED_SEVERITIES).optional(),
  onset_date: z.string().optional().nullable(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  verified_by: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)
    const rows = await findMany('allergies', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('allergies.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('allergies', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('allergies.notFound', undefined, { defaultValue: 'Allergy not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('allergies.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier allergies cap (tiers.ts maxAllergies) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceAllergyLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxAllergies',
  getLimit: (limits) => limits.maxAllergies,
  getCurrent: async (userId) =>
    count('allergies', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceAllergyLimit,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }
      const body = req.body as z.infer<typeof createSchema>
      const result = await create('allergies', {
        user_id: userId,
        allergen: body.allergen,
        substance: body.substance ?? body.allergen,
        category: body.category,
        reaction: body.reaction ?? null,
        severity: body.severity,
        onset_date: body.onset_date ?? null,
        status: body.status,
        is_active: body.status === 'active',
        verified_by: body.verified_by ?? null,
        notes: body.notes ?? null,
        created_at: new Date(),
      })
      res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('allergies.handler', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('allergies', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('allergies.notFound', undefined, { defaultValue: 'Allergy not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() }
    // Keep the denormalized is_active mirror in sync with status (only derived on
    // create) so a resolved/inactive allergy drops out of the dashboard "active
    // allergies" count (stats.ts).
    if (body.status !== undefined) {
      updates.is_active = body.status === 'active'
    }
    const result = await updateById('allergies', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('allergies.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('allergies', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('allergies.notFound', undefined, { defaultValue: 'Allergy not found.' }),
      })
    }
    await deleteById('allergies', id)
    res.status(204).end()
  } catch (error) {
    logger.error('allergies.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
