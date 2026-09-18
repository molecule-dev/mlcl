import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const ALLOWED_ORDER_KINDS = ['lab', 'imaging', 'referral', 'medication', 'other'] as const
const ALLOWED_ORDER_STATUSES = ['open', 'completed', 'cancelled'] as const

const diagnosisSchema = z.object({
  condition_id: z.string().uuid().optional(),
  icd10_code: z.string().optional(),
  description: z.string().min(1),
})

const orderSchema = z.object({
  kind: z.enum(ALLOWED_ORDER_KINDS),
  description: z.string().min(1),
  status: z.enum(ALLOWED_ORDER_STATUSES).default('open'),
})

const createSchema = z.object({
  provider_id: z.string().optional(),
  provider_name: z.string().optional(),
  clinic_name: z.string().optional(),
  scheduled_at: z.string().optional(),
  completed_at: z.string().optional(),
  chief_complaint: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  follow_up_at: z.string().optional(),
  notes: z.string().optional(),
  diagnoses: z.array(diagnosisSchema).optional(),
  orders: z.array(orderSchema).optional(),
})

const updateSchema = z.object({
  provider_name: z.string().optional().nullable(),
  clinic_name: z.string().optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  chief_complaint: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  follow_up_at: z.string().optional().nullable(),
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
    const visits = await findMany('visits', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'scheduled_at', direction: 'desc' }],
    })
    res.json(visits)
  } catch (error) {
    logger.error('visits.handler', error)
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
    const visit = await findById<Record<string, unknown>>('visits', id)
    if (!visit || visit.user_id !== userId) {
      return res.status(404).json({
        error: t('visits.notFound', undefined, { defaultValue: 'Visit not found.' }),
      })
    }
    const diagnoses = await findMany('visit_diagnoses', {
      where: [{ field: 'visit_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    const orders = await findMany('visit_orders', {
      where: [{ field: 'visit_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json({ ...visit, diagnoses, orders })
  } catch (error) {
    logger.error('visits.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('visits', {
      user_id: userId,
      provider_id: body.provider_id ?? null,
      provider_name: body.provider_name ?? null,
      clinic_name: body.clinic_name ?? null,
      scheduled_at: body.scheduled_at ? new Date(body.scheduled_at) : null,
      completed_at: body.completed_at ? new Date(body.completed_at) : null,
      chief_complaint: body.chief_complaint ?? null,
      assessment: body.assessment ?? null,
      plan: body.plan ?? null,
      follow_up_at: body.follow_up_at ? new Date(body.follow_up_at) : null,
      notes: body.notes ?? null,
      created_at: new Date(),
    })
    const created = (result as { data?: Record<string, unknown> }).data ?? result
    const visitId = (created as { id?: string }).id
    if (visitId) {
      for (const dx of body.diagnoses ?? []) {
        await create('visit_diagnoses', {
          visit_id: visitId,
          user_id: userId,
          condition_id: dx.condition_id ?? null,
          icd10_code: dx.icd10_code ?? null,
          description: dx.description,
          created_at: new Date(),
        })
      }
      for (const ord of body.orders ?? []) {
        await create('visit_orders', {
          visit_id: visitId,
          user_id: userId,
          kind: ord.kind,
          description: ord.description,
          status: ord.status,
          created_at: new Date(),
        })
      }
    }
    res.status(201).json(created)
  } catch (error) {
    logger.error('visits.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('visits', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('visits.notFound', undefined, { defaultValue: 'Visit not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('visits', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('visits.handler', error)
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
    const existing = await findById<Record<string, unknown>>('visits', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('visits.notFound', undefined, { defaultValue: 'Visit not found.' }),
      })
    }
    await deleteById('visits', id)
    res.status(204).end()
  } catch (error) {
    logger.error('visits.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
