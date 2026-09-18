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

const ALLOWED_CATEGORIES = [
  'blood',
  'urine',
  'imaging',
  'pathology',
  'microbiology',
  'genetic',
  'other',
] as const
const ALLOWED_STATUSES = ['pending', 'final', 'amended', 'cancelled'] as const
const ALLOWED_FLAGS = ['low', 'high', 'critical', 'normal'] as const

const labValueSchema = z.object({
  test_name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  reference_low: z.number().optional().nullable(),
  reference_high: z.number().optional().nullable(),
  flag: z.enum(ALLOWED_FLAGS).default('normal'),
})

const createSchema = z.object({
  panel_name: z.string().optional(),
  test_name: z.string().min(1),
  category: z.enum(ALLOWED_CATEGORIES).default('blood'),
  ordering_provider: z.string().optional(),
  performing_lab: z.string().optional(),
  collected_date: z.string().optional(),
  result_date: z.string().optional(),
  results: z.array(labValueSchema).optional(),
  units: z.string().optional(),
  reference_range: z.string().optional(),
  flag: z.enum(ALLOWED_FLAGS).default('normal'),
  notes: z.string().optional(),
  attachment_id: z.string().uuid().optional(),
})

const updateSchema = z.object({
  panel_name: z.string().optional().nullable(),
  category: z.enum(ALLOWED_CATEGORIES).optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  result_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  flag: z.enum(ALLOWED_FLAGS).optional(),
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
    const labs = await findMany<Record<string, unknown>>('lab_results', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'collected_date', direction: 'desc' }],
    })
    // Hydrate each lab with its `lab_result_values` so the list view shows
    // the actual measured numbers — without this, every panel renders as
    // "—mg/dL". The detail endpoint already does this; the list one didn't.
    const allValues = await findMany<{
      result_id: string
      test_name: string
      value: string
      unit?: string | null
      reference_low?: string | number | null
      reference_high?: string | number | null
      flag?: string
    }>('lab_result_values', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const valuesByResult = new Map<string, typeof allValues>()
    for (const v of allValues) {
      const list = valuesByResult.get(v.result_id) ?? []
      list.push(v)
      valuesByResult.set(v.result_id, list)
    }
    const hydrated = (labs as Array<Record<string, unknown>>).map((l) => {
      const id = String(l.id)
      const vals = valuesByResult.get(id) ?? []
      const existing = Array.isArray(l.results) ? (l.results as Array<Record<string, unknown>>) : []
      const merged =
        vals.length > 0
          ? vals.map((v) => ({
              test_name: v.test_name,
              value: v.value,
              unit: v.unit ?? null,
              reference_low: v.reference_low ?? null,
              reference_high: v.reference_high ?? null,
              flag: v.flag ?? 'normal',
            }))
          : existing
      return { ...l, results: merged }
    })
    res.json(hydrated)
  } catch (error) {
    logger.error('labs.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/categories', (_req: Request, res: Response) => {
  res.json([
    { id: 'blood', label: 'Blood Work' },
    { id: 'urine', label: 'Urinalysis' },
    { id: 'imaging', label: 'Imaging' },
    { id: 'pathology', label: 'Pathology' },
    { id: 'microbiology', label: 'Microbiology' },
    { id: 'genetic', label: 'Genetic Testing' },
    { id: 'other', label: 'Other' },
  ])
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
    const row = await findById<Record<string, unknown>>('lab_results', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('labs.notFound', undefined, { defaultValue: 'Lab result not found.' }),
      })
    }
    const values = await findMany('lab_result_values', {
      where: [{ field: 'result_id', operator: '=', value: id }],
      orderBy: [{ field: 'test_name', direction: 'asc' }],
    })
    res.json({ ...row, values })
  } catch (error) {
    logger.error('labs.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

function computeFlag(value: number, low?: number | null, high?: number | null): string {
  if (low != null && value < low) return 'low'
  if (high != null && value > high) return 'high'
  return 'normal'
}

// Enforce the per-tier lab results cap (tiers.ts maxLabs) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceLabLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxLabs',
  getLimit: (limits) => limits.maxLabs,
  getCurrent: async (userId) =>
    count('lab_results', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceLabLimit,
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
      const result = await create('lab_results', {
        user_id: userId,
        panel_name: body.panel_name ?? null,
        test_name: body.test_name,
        category: body.category,
        ordering_provider: body.ordering_provider ?? null,
        performing_lab: body.performing_lab ?? null,
        collected_date: body.collected_date ?? new Date().toISOString().split('T')[0],
        drawn_at: body.collected_date ? new Date(body.collected_date) : new Date(),
        result_date: body.result_date ?? null,
        resulted_at: body.result_date ? new Date(body.result_date) : null,
        status: body.result_date ? 'final' : 'pending',
        results: JSON.stringify(body.results ?? []),
        units: body.units ?? null,
        reference_range: body.reference_range ?? null,
        flag: body.flag,
        attachment_id: body.attachment_id ?? null,
        notes: body.notes ?? null,
        created_at: new Date(),
      })
      const created = (result as { data?: Record<string, unknown> }).data ?? result
      const createdId = (created as { id?: string }).id
      if (createdId && body.results && body.results.length > 0) {
        for (const v of body.results) {
          const numeric = Number(v.value)
          const computedFlag = !isNaN(numeric)
            ? computeFlag(numeric, v.reference_low, v.reference_high)
            : v.flag
          await create('lab_result_values', {
            result_id: createdId,
            user_id: userId,
            test_name: v.test_name,
            value: v.value,
            unit: v.unit ?? null,
            reference_low: v.reference_low ?? null,
            reference_high: v.reference_high ?? null,
            flag: computedFlag,
            created_at: new Date(),
          })
        }
      }
      res.status(201).json(created)
    } catch (error) {
      logger.error('labs.handler', error)
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
    const existing = await findById<Record<string, unknown>>('lab_results', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('labs.notFound', undefined, { defaultValue: 'Lab result not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('lab_results', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('labs.handler', error)
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
    const existing = await findById<Record<string, unknown>>('lab_results', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('labs.notFound', undefined, { defaultValue: 'Lab result not found.' }),
      })
    }
    await deleteById('lab_results', id)
    res.status(204).end()
  } catch (error) {
    logger.error('labs.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
