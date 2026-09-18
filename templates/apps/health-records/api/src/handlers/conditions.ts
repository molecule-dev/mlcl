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

const ALLOWED_STATUSES = ['active', 'resolved', 'chronic'] as const
const ALLOWED_SEVERITIES = ['mild', 'moderate', 'severe'] as const
const ALLOWED_SOURCES = ['provider', 'self'] as const

const createSchema = z.object({
  name: z.string().min(1),
  icd10_code: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).default('active'),
  severity: z.enum(ALLOWED_SEVERITIES).optional(),
  onset_date: z.string().optional(),
  resolution_date: z.string().optional(),
  provider_name: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(ALLOWED_SOURCES).default('self'),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  icd10_code: z.string().optional().nullable(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  severity: z.enum(ALLOWED_SEVERITIES).optional().nullable(),
  onset_date: z.string().optional().nullable(),
  resolution_date: z.string().optional().nullable(),
  provider_name: z.string().optional().nullable(),
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
    const conditions = await findMany('conditions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(conditions)
  } catch (error) {
    logger.error('conditions.handler', error)
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
    const row = await findById<Record<string, unknown>>('conditions', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('conditions.notFound', undefined, { defaultValue: 'Condition not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('conditions.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier conditions cap (tiers.ts maxConditions) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceConditionLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxConditions',
  getLimit: (limits) => limits.maxConditions,
  getCurrent: async (userId) =>
    count('conditions', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceConditionLimit,
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
      const result = await create('conditions', {
        user_id: userId,
        name: body.name,
        icd10_code: body.icd10_code ?? null,
        status: body.status,
        severity: body.severity ?? null,
        onset_date: body.onset_date ?? null,
        resolution_date: body.resolution_date ?? null,
        provider_name: body.provider_name ?? null,
        notes: body.notes ?? null,
        source: body.source,
        created_at: new Date(),
      })
      const created = (result as { data?: Record<string, unknown> }).data ?? result
      res.status(201).json(created)
    } catch (error) {
      logger.error('conditions.handler', error)
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
    const existing = await findById<Record<string, unknown>>('conditions', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('conditions.notFound', undefined, { defaultValue: 'Condition not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('conditions', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('conditions.handler', error)
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
    const existing = await findById<Record<string, unknown>>('conditions', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('conditions.notFound', undefined, { defaultValue: 'Condition not found.' }),
      })
    }
    await deleteById('conditions', id)
    res.status(204).end()
  } catch (error) {
    logger.error('conditions.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
