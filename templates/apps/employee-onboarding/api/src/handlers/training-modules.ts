import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDefaultOnboardingIfMissing } from '../seedDefaultOnboarding.js'

const router = Router()

const logger = getLogger()

const quizSchema = z.array(
  z.object({
    question: z.string(),
    options: z.array(z.string()),
    answer: z.number().int(),
  }),
)

const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  duration_minutes: z.number().int().nonnegative().optional(),
  quiz: quizSchema.nullable().optional(),
})

const updateModuleSchema = createModuleSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    await seedDefaultOnboardingIfMissing(userId)

    const items = await findMany('training_modules', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (_err) {
    logger.error('training_modules.list', _err as Error)
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
    const item = await findById<Record<string, unknown>>('training_modules', id)
    if (!item || item.user_id !== userId) {
      return res.status(404).json({
        error: t('trainingModules.notFound', undefined, {
          defaultValue: 'Training module not found',
        }),
      })
    }
    res.json(item)
  } catch (_err) {
    logger.error('training_modules.read', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createModuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createModuleSchema>
    const result = await create('training_modules', {
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
      content: body.content ?? null,
      video_url: body.video_url ?? null,
      duration_minutes: body.duration_minutes ?? 0,
      // pg sends JS arrays as Postgres arrays, which JSONB rejects — serialize.
      quiz: body.quiz == null ? null : JSON.stringify(body.quiz),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    logger.error('training_modules.create', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateModuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('training_modules', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('trainingModules.notFound', undefined, {
          defaultValue: 'Training module not found',
        }),
      })
    }
    const body = req.body as z.infer<typeof updateModuleSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const k of [
      'title',
      'description',
      'content',
      'video_url',
      'duration_minutes',
      'quiz',
    ] as const) {
      if (body[k] !== undefined) {
        updates[k] = k === 'quiz' && body.quiz != null ? JSON.stringify(body.quiz) : body[k]
      }
    }
    const result = await updateById('training_modules', id, updates)
    res.json(result.data)
  } catch (_err) {
    logger.error('training_modules.update', _err as Error)
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
    const existing = await findById<Record<string, unknown>>('training_modules', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('trainingModules.notFound', undefined, {
          defaultValue: 'Training module not found',
        }),
      })
    }
    await deleteById('training_modules', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('training_modules.delete', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
