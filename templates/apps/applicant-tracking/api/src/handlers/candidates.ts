import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const noteBodySchema = z.object({
  body: z.string().min(1).max(4000),
})

const listQuerySchema = z.object({
  search: z.string().optional(),
  stage: z.enum(['sourced', 'screening', 'interview', 'offer', 'hired', 'rejected']).optional(),
  sort: z.string().optional().default('last_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})

const createBodySchema = z.object({
  first_name: z.string().min(1).max(120),
  last_name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  source: z.string().optional(),
  location: z.string().optional(),
})

const updateBodySchema = createBodySchema.partial().extend({
  stage: z.enum(['sourced', 'screening', 'interview', 'offer', 'hired', 'rejected']).optional(),
  ai_score: z.number().min(0).max(100).optional(),
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
    const { search, stage, sort, order } = parsed.data
    const where: { field: string; operator: '=' | 'ilike'; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (stage) where.push({ field: 'stage', operator: '=', value: stage })
    if (search) where.push({ field: 'email', operator: 'ilike', value: search })
    const items = await findMany('candidates', {
      where,
      orderBy: [{ field: sort, direction: order }],
    })
    res.json(items)
  } catch (err) {
    logger.error('candidates.list_failed', err)
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
    const item = await findById<Record<string, unknown>>('candidates', params.data.id)
    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('candidate.notFound', {}, { defaultValue: 'Candidate not found' }) })
    }
    res.json(item)
  } catch (err) {
    logger.error('candidates.get_failed', err)
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
    const result = await create('candidates', {
      user_id: userId,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone ?? null,
      linkedin_url: body.linkedin_url ?? null,
      source: body.source ?? null,
      location: body.location ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('candidates.create_failed', err)
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
    const existing = await findById<Record<string, unknown>>('candidates', params.data.id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('candidate.notFound', {}, { defaultValue: 'Candidate not found' }) })
    }
    const result = await updateById('candidates', params.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('candidates.update_failed', err)
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
    const existing = await findById<Record<string, unknown>>('candidates', params.data.id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('candidate.notFound', {}, { defaultValue: 'Candidate not found' }) })
    }
    await deleteById('candidates', params.data.id)
    res.status(204).end()
  } catch (err) {
    logger.error('candidates.delete_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/notes', async (req: Request, res: Response) => {
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
    const candidate = await findById<Record<string, unknown>>('candidates', params.data.id)
    if (!candidate || candidate.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('candidate.notFound', {}, { defaultValue: 'Candidate not found' }) })
    }
    const items = await findMany('notes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'candidate_id', operator: '=', value: params.data.id },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (err) {
    logger.error('candidates.notes_list_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const params = idParamSchema.safeParse({ id: getParamId(req) })
    const body = noteBodySchema.safeParse(req.body)
    if (!params.success || !body.success) {
      return res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        errors: [
          ...(params.success ? [] : params.error.issues),
          ...(body.success ? [] : body.error.issues),
        ],
      })
    }
    const candidate = await findById<Record<string, unknown>>('candidates', params.data.id)
    if (!candidate || candidate.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('candidate.notFound', {}, { defaultValue: 'Candidate not found' }) })
    }
    const result = await create('notes', {
      user_id: userId,
      candidate_id: params.data.id,
      author_user_id: userId,
      body: body.data.body,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('candidates.note_create_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
