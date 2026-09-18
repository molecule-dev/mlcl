import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const listQuerySchema = z.object({
  job_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
  stage: z.string().optional(),
  sort: z.string().optional().default('applied_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createBodySchema = z.object({
  job_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  source: z.string().optional(),
  resume_url: z.string().url().optional(),
  cover_letter: z.string().optional(),
})

const updateBodySchema = z.object({
  stage: z
    .enum(['applied', 'sourced', 'screening', 'interview', 'offer', 'hired', 'rejected'])
    .optional(),
  source: z.string().optional(),
  cover_letter: z.string().optional(),
  resume_url: z.string().url().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const { job_id, candidate_id, stage, sort, order } = parsed.data
    const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
    if (job_id) where.push({ field: 'job_id', operator: '=' as const, value: job_id })
    if (candidate_id)
      where.push({ field: 'candidate_id', operator: '=' as const, value: candidate_id })
    if (stage) where.push({ field: 'stage', operator: '=' as const, value: stage })
    const items = await findMany('applications', {
      where,
      orderBy: [{ field: sort, direction: order }],
    })
    res.json(items)
  } catch (err) {
    console.error('GET /applications failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const params = idParamSchema.safeParse({ id: getParamId(req) })
    if (!params.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: params.error.issues,
      })
    }
    const item = await findById<Record<string, unknown>>('applications', params.data.id)
    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('application.notFound', {}, { defaultValue: 'Application not found' }) })
    }
    res.json(item)
  } catch (err) {
    console.error('GET /applications/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    const body = parsed.data
    const result = await create('applications', {
      user_id: userId,
      job_id: body.job_id,
      candidate_id: body.candidate_id,
      stage: 'applied',
      resume_url: body.resume_url ?? null,
      cover_letter: body.cover_letter ?? null,
      source: body.source ?? null,
      applied_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('POST /applications failed', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const params = idParamSchema.safeParse({ id: getParamId(req) })
    const body = updateBodySchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: [
          ...(params.success ? [] : params.error.issues),
          ...(body.success ? [] : body.error.issues),
        ],
      })
    }
    const existing = await findById<Record<string, unknown>>('applications', params.data.id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('application.notFound', {}, { defaultValue: 'Application not found' }) })
    }
    const result = await updateById('applications', params.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('PUT /applications/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const params = idParamSchema.safeParse({ id: getParamId(req) })
    if (!params.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: params.error.issues,
      })
    }
    const existing = await findById<Record<string, unknown>>('applications', params.data.id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('application.notFound', {}, { defaultValue: 'Application not found' }) })
    }
    await deleteById('applications', params.data.id)
    res.status(204).end()
  } catch (err) {
    console.error('DELETE /applications/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
