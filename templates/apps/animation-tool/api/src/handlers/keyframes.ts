import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  projectId: z.string().min(1),
  layerId: z.string().optional(),
})

const createKeyframeSchema = z.object({
  projectId: z.string().min(1),
  layerId: z.string().optional(),
  time: z.coerce.number().nonnegative().optional(),
  property: z.string().min(1).max(64).optional(),
  value: z.unknown().optional(),
  easing: z.string().max(64).optional(),
})

const updateKeyframeSchema = z.object({
  time: z.coerce.number().nonnegative().optional(),
  value: z.unknown().optional(),
  easing: z.string().max(64).optional(),
})

// --- Helpers ---

async function projectOwnedBy(projectId: string, userId: string): Promise<boolean> {
  const project = await findById<Record<string, unknown>>('animation_projects', projectId)
  return Boolean(project && project.owner_id === userId)
}

// --- Routes ---

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { projectId, layerId } = req.query as unknown as z.infer<typeof listQuerySchema>
    if (!(await projectOwnedBy(projectId, userId))) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'project_id', operator: '=', value: projectId }]
    if (layerId) where.push({ field: 'layer_id', operator: '=', value: layerId })
    const keyframes = await findMany('keyframes', {
      where,
      orderBy: [{ field: 'time', direction: 'asc' }],
    })
    res.json(keyframes)
  } catch (error) {
    logger.error('GET /api/keyframes failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createKeyframeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { projectId, layerId, time, property, value, easing } = req.body as z.infer<
      typeof createKeyframeSchema
    >
    if (!(await projectOwnedBy(projectId, userId))) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const result = await create('keyframes', {
      project_id: projectId,
      layer_id: layerId ?? null,
      time: time ?? 0,
      property: property ?? 'opacity',
      value: value !== undefined ? JSON.stringify(value) : null,
      easing: easing ?? 'linear',
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('POST /api/keyframes failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateKeyframeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('keyframes', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('keyframes.notFound', {}, { defaultValue: 'Keyframe not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(existing.project_id), userId))) {
      res
        .status(404)
        .json({ error: t('keyframes.notFound', {}, { defaultValue: 'Keyframe not found' }) })
      return
    }
    const updates: Record<string, unknown> = {}
    if (req.body.time !== undefined) updates.time = req.body.time
    if (req.body.value !== undefined) updates.value = JSON.stringify(req.body.value)
    if (req.body.easing !== undefined) updates.easing = req.body.easing
    const result = await updateById('keyframes', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('PUT /api/keyframes/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('keyframes', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('keyframes.notFound', {}, { defaultValue: 'Keyframe not found' }) })
      return
    }
    if (!(await projectOwnedBy(String(existing.project_id), userId))) {
      res
        .status(404)
        .json({ error: t('keyframes.notFound', {}, { defaultValue: 'Keyframe not found' }) })
      return
    }
    await deleteById('keyframes', id)
    res.status(204).end()
  } catch (error) {
    logger.error('DELETE /api/keyframes/:id failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
