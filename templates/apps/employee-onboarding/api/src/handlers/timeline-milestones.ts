import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDefaultOnboardingIfMissing } from '../seedDefaultOnboarding.js'

const router = Router()

const logger = getLogger()

const createMilestoneSchema = z.object({
  onboarding_id: z.string().nullable().optional(),
  label: z.string().min(1),
  target_at: z.string().nullable().optional(),
  achieved_at: z.string().nullable().optional(),
})

const updateMilestoneSchema = createMilestoneSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    await seedDefaultOnboardingIfMissing(userId)

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (typeof req.query.onboarding_id === 'string') {
      where.push({ field: 'onboarding_id', operator: '=', value: req.query.onboarding_id })
    }
    const items = await findMany('timeline_milestones', {
      where,
      orderBy: [{ field: 'target_at', direction: 'asc' }],
    })
    res.json(items)
  } catch (_err) {
    logger.error('timeline_milestones.list', _err as Error)
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
    const item = await findById<Record<string, unknown>>('timeline_milestones', id)
    if (!item || item.user_id !== userId) {
      return res.status(404).json({
        error: t('milestones.notFound', undefined, { defaultValue: 'Milestone not found' }),
      })
    }
    res.json(item)
  } catch (_err) {
    logger.error('timeline_milestones.read', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createMilestoneSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createMilestoneSchema>
    const result = await create('timeline_milestones', {
      user_id: userId,
      onboarding_id: body.onboarding_id ?? null,
      label: body.label,
      target_at: body.target_at ? new Date(body.target_at) : null,
      achieved_at: body.achieved_at ? new Date(body.achieved_at) : null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (_err) {
    logger.error('timeline_milestones.create', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateMilestoneSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('timeline_milestones', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('milestones.notFound', undefined, { defaultValue: 'Milestone not found' }),
      })
    }
    const body = req.body as z.infer<typeof updateMilestoneSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.onboarding_id !== undefined) updates.onboarding_id = body.onboarding_id
    if (body.label !== undefined) updates.label = body.label
    if (body.target_at !== undefined)
      updates.target_at = body.target_at ? new Date(body.target_at) : null
    if (body.achieved_at !== undefined)
      updates.achieved_at = body.achieved_at ? new Date(body.achieved_at) : null

    const result = await updateById('timeline_milestones', id, updates)
    res.json(result.data)
  } catch (_err) {
    logger.error('timeline_milestones.update', _err as Error)
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
    const existing = await findById<Record<string, unknown>>('timeline_milestones', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('milestones.notFound', undefined, { defaultValue: 'Milestone not found' }),
      })
    }
    await deleteById('timeline_milestones', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('timeline_milestones.delete', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
