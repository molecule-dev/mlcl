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

const ALLOWED_ROUTES = [
  'intramuscular',
  'subcutaneous',
  'intradermal',
  'oral',
  'nasal',
  'other',
] as const

const createSchema = z.object({
  vaccine_name: z.string().min(1),
  cvx_code: z.string().optional(),
  dose_number: z.number().int().positive().default(1),
  series_total: z.number().int().positive().default(1),
  administered_date: z.string().optional(),
  expiration_date: z.string().optional(),
  lot_number: z.string().optional(),
  manufacturer: z.string().optional(),
  administered_by: z.string().optional(),
  administering_provider: z.string().optional(),
  facility: z.string().optional(),
  site: z.string().optional(),
  route: z.enum(ALLOWED_ROUTES).default('intramuscular'),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  vaccine_name: z.string().min(1).optional(),
  cvx_code: z.string().optional().nullable(),
  dose_number: z.number().int().positive().optional(),
  series_total: z.number().int().positive().optional(),
  administered_date: z.string().optional(),
  expiration_date: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  administered_by: z.string().optional().nullable(),
  administering_provider: z.string().optional().nullable(),
  facility: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  route: z.enum(ALLOWED_ROUTES).optional(),
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
    const rows = await findMany('immunizations', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'administered_date', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('immunizations.handler', error)
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
    const row = await findById<Record<string, unknown>>('immunizations', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('immunizations.notFound', undefined, { defaultValue: 'Immunization not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('immunizations.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier immunizations cap (tiers.ts maxImmunizations) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceImmunizationLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxImmunizations',
  getLimit: (limits) => limits.maxImmunizations,
  getCurrent: async (userId) =>
    count('immunizations', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceImmunizationLimit,
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
      const result = await create('immunizations', {
        user_id: userId,
        vaccine_name: body.vaccine_name,
        cvx_code: body.cvx_code ?? null,
        dose_number: body.dose_number,
        series_total: body.series_total,
        administered_date: body.administered_date ?? new Date().toISOString().split('T')[0],
        administered_at: body.administered_date ? new Date(body.administered_date) : new Date(),
        expiration_date: body.expiration_date ?? null,
        lot_number: body.lot_number ?? null,
        manufacturer: body.manufacturer ?? null,
        administered_by: body.administered_by ?? body.administering_provider ?? null,
        administering_provider: body.administering_provider ?? null,
        facility: body.facility ?? null,
        site: body.site ?? null,
        route: body.route,
        notes: body.notes ?? null,
        created_at: new Date(),
      })
      res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('immunizations.handler', error)
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
    const existing = await findById<Record<string, unknown>>('immunizations', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('immunizations.notFound', undefined, { defaultValue: 'Immunization not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('immunizations', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('immunizations.handler', error)
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
    const existing = await findById<Record<string, unknown>>('immunizations', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('immunizations.notFound', undefined, { defaultValue: 'Immunization not found.' }),
      })
    }
    await deleteById('immunizations', id)
    res.status(204).end()
  } catch (error) {
    logger.error('immunizations.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
