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

const ALLOWED_FREQUENCIES = [
  'daily',
  'twice_daily',
  'three_times_daily',
  'four_times_daily',
  'weekly',
  'as_needed',
  'other',
] as const
const ALLOWED_ROUTES = [
  'oral',
  'topical',
  'injection',
  'inhalation',
  'sublingual',
  'rectal',
  'other',
] as const
const ALLOWED_STATUSES = ['active', 'paused', 'discontinued'] as const

const createSchema = z.object({
  name: z.string().min(1),
  generic_name: z.string().optional(),
  dosage: z.string().min(1),
  frequency: z.enum(ALLOWED_FREQUENCIES).default('daily'),
  route: z.enum(ALLOWED_ROUTES).default('oral'),
  prescriber: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  indication: z.string().optional(),
  refills_total: z.number().int().nonnegative().default(0),
  pharmacy: z.string().optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).default('active'),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  generic_name: z.string().optional().nullable(),
  dosage: z.string().min(1).optional(),
  frequency: z.enum(ALLOWED_FREQUENCIES).optional(),
  route: z.enum(ALLOWED_ROUTES).optional(),
  prescriber: z.string().optional().nullable(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  indication: z.string().optional().nullable(),
  refills_total: z.number().int().nonnegative().optional(),
  pharmacy: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(ALLOWED_STATUSES).optional(),
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
    const meds = await findMany('medications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'start_date', direction: 'desc' }],
    })
    res.json(meds)
  } catch (error) {
    logger.error('medications.handler', error)
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
    const row = await findById<Record<string, unknown>>('medications', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('medications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier medications cap (tiers.ts maxMedications) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceMedicationLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxMedications',
  getLimit: (limits) => limits.maxMedications,
  getCurrent: async (userId) =>
    count('medications', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceMedicationLimit,
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
      const result = await create('medications', {
        user_id: userId,
        name: body.name,
        generic_name: body.generic_name ?? null,
        dosage: body.dosage,
        frequency: body.frequency,
        route: body.route,
        prescriber: body.prescriber ?? null,
        start_date: body.start_date ?? new Date().toISOString().split('T')[0],
        end_date: body.end_date ?? null,
        indication: body.indication ?? null,
        refills_total: body.refills_total,
        refills_used: 0,
        refills_remaining: body.refills_total,
        pharmacy: body.pharmacy ?? null,
        instructions: body.instructions ?? null,
        notes: body.notes ?? null,
        is_active: body.status === 'active',
        status: body.status,
        created_at: new Date(),
      })
      res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('medications.handler', error)
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
    const existing = await findById<Record<string, unknown>>('medications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() }
    // Keep the denormalized is_active mirror in sync with status. It is only
    // derived on create, so discontinuing/pausing a medication left it stale and
    // the dashboard "active medications" count (stats.ts) never dropped.
    if (body.status !== undefined) {
      updates.is_active = body.status === 'active'
    }
    const result = await updateById('medications', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('medications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/refill', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('medications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
    }
    const refillsUsed = (existing.refills_used as number | undefined) ?? 0
    const refillsTotal = (existing.refills_total as number | undefined) ?? 0
    if (refillsUsed >= refillsTotal) {
      return res.status(400).json({
        error: t('medications.noRefills', undefined, { defaultValue: 'No refills remaining.' }),
      })
    }
    const result = await updateById('medications', id, {
      refills_used: refillsUsed + 1,
      refills_remaining: Math.max(0, refillsTotal - (refillsUsed + 1)),
      updatedAt: new Date(),
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('medications.handler', error)
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
    const existing = await findById<Record<string, unknown>>('medications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('medications.notFound', undefined, { defaultValue: 'Medication not found.' }),
      })
    }
    await deleteById('medications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('medications.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
