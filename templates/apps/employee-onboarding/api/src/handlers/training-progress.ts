import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const logger = getLogger()

const createProgressSchema = z.object({
  module_id: z.string().min(1),
  onboarding_id: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  quiz_score: z.number().int().nullable().optional(),
})

const updateProgressSchema = z.object({
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  quiz_score: z.number().int().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (typeof req.query.module_id === 'string') {
      where.push({ field: 'module_id', operator: '=', value: req.query.module_id })
    }
    if (typeof req.query.onboarding_id === 'string') {
      where.push({ field: 'onboarding_id', operator: '=', value: req.query.onboarding_id })
    }
    const items = await findMany('training_progress', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (_err) {
    logger.error('training_progress.list', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('training_progress', id)
    if (!item || item.user_id !== userId) {
      return res.status(404).json({
        error: t('trainingProgress.notFound', undefined, {
          defaultValue: 'Training progress not found',
        }),
      })
    }
    res.json(item)
  } catch (_err) {
    logger.error('training_progress.read', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createProgressSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createProgressSchema>
    const result = await create('training_progress', {
      user_id: userId,
      module_id: body.module_id,
      onboarding_id: body.onboarding_id ?? null,
      started_at: body.started_at ? new Date(body.started_at) : new Date(),
      completed_at: body.completed_at ? new Date(body.completed_at) : null,
      quiz_score: body.quiz_score ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    logger.error('training_progress.create', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateProgressSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('training_progress', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('trainingProgress.notFound', undefined, {
          defaultValue: 'Training progress not found',
        }),
      })
    }
    const body = req.body as z.infer<typeof updateProgressSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.started_at !== undefined)
      updates.started_at = body.started_at ? new Date(body.started_at) : null
    if (body.completed_at !== undefined)
      updates.completed_at = body.completed_at ? new Date(body.completed_at) : null
    if (body.quiz_score !== undefined) updates.quiz_score = body.quiz_score

    const result = await updateById('training_progress', id, updates)
    res.json(result.data)
  } catch (_err) {
    logger.error('training_progress.update', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('training_progress', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('trainingProgress.notFound', undefined, {
          defaultValue: 'Training progress not found',
        }),
      })
    }
    await deleteById('training_progress', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('training_progress.delete', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
