import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { HealthRecordsLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const ALLOWED_TYPES = [
  'blood_pressure',
  'heart_rate',
  'temperature',
  'respiratory_rate',
  'oxygen_saturation',
  'weight',
  'height',
  'bmi',
  'blood_glucose',
] as const

const ALLOWED_SOURCES = ['manual', 'device', 'provider'] as const

const createSchema = z.object({
  vital_type: z.enum(ALLOWED_TYPES),
  value: z.number(),
  secondary_value: z.number().optional(),
  unit: z.string().optional(),
  blood_pressure_sys: z.number().int().optional(),
  blood_pressure_dia: z.number().int().optional(),
  heart_rate: z.number().int().optional(),
  temperature: z.number().optional(),
  weight_kg: z.number().optional(),
  height_cm: z.number().optional(),
  spo2: z.number().int().optional(),
  respiratory_rate: z.number().int().optional(),
  source: z.enum(ALLOWED_SOURCES).default('manual'),
  recorded_at: z.string().optional(),
  notes: z.string().optional(),
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
    const vitals = await findMany('vitals', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
    })
    res.json(vitals)
  } catch (error) {
    logger.error('vitals.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/me/latest', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)
    const all = await findMany<Record<string, unknown>>('vitals', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
    })
    const latest: Record<string, Record<string, unknown>> = {}
    for (const row of all) {
      const type = row.vital_type as string | undefined
      if (type && !latest[type]) latest[type] = row
    }
    res.json(latest)
  } catch (error) {
    logger.error('vitals.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/types', (_req: Request, res: Response) => {
  res.json([
    { id: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
    { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { id: 'temperature', label: 'Temperature', unit: '\u00B0F' },
    { id: 'respiratory_rate', label: 'Respiratory Rate', unit: 'breaths/min' },
    { id: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%' },
    { id: 'weight', label: 'Weight', unit: 'lbs' },
    { id: 'height', label: 'Height', unit: 'in' },
    { id: 'bmi', label: 'BMI', unit: 'kg/m\u00B2' },
    { id: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL' },
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
    const row = await findById<Record<string, unknown>>('vitals', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('vitals.notFound', undefined, { defaultValue: 'Vital record not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('vitals.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier vitals cap (tiers.ts maxVitals) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceVitalLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxVitals',
  getLimit: (limits) => limits.maxVitals,
  getCurrent: async (userId) =>
    count('vitals', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceVitalLimit,
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
      const result = await create('vitals', {
        user_id: userId,
        vital_type: body.vital_type,
        value: body.value,
        secondary_value: body.secondary_value ?? null,
        unit: body.unit ?? null,
        blood_pressure_sys: body.blood_pressure_sys ?? null,
        blood_pressure_dia: body.blood_pressure_dia ?? null,
        heart_rate: body.heart_rate ?? null,
        temperature: body.temperature ?? null,
        weight_kg: body.weight_kg ?? null,
        height_cm: body.height_cm ?? null,
        spo2: body.spo2 ?? null,
        respiratory_rate: body.respiratory_rate ?? null,
        source: body.source,
        recorded_at: body.recorded_at ? new Date(body.recorded_at) : new Date(),
        notes: body.notes ?? null,
        created_at: new Date(),
      })
      res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('vitals.handler', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vitals', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('vitals.notFound', undefined, { defaultValue: 'Vital record not found.' }),
      })
    }
    await deleteById('vitals', id)
    res.status(204).end()
  } catch (error) {
    logger.error('vitals.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
