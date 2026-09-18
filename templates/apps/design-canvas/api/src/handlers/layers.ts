import type { RequestHandler } from 'express'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { DesignCanvasLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  projectId: z.string().min(1),
})

const createLayerSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
})

const updateLayerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  position: z.number().int().min(0).optional(),
})

const reorderSchema = z.object({
  position: z.number().int().min(0),
})

async function userOwnsProject(userId: string, projectId: string): Promise<boolean> {
  const project = await findById<Record<string, unknown>>('projects', projectId)
  return Boolean(project && project.user_id === userId)
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const projectId = String(req.query.projectId)
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const layers = await findMany('layers', {
      where: [
        { field: 'project_id', operator: '=', value: projectId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(layers)
  } catch (error) {
    logger.error('layers.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<DesignCanvasLimits>({
    limitType: 'maxLayers',
    getLimit: (limits) => limits.maxLayers,
    getCurrent: async (userId) =>
      count('layers', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createLayerSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { projectId, name, visible, locked, opacity } = req.body
      if (!(await userOwnsProject(userId, projectId))) {
        return res
          .status(404)
          .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      }

      const existing = await findMany<Record<string, unknown>>('layers', {
        where: [{ field: 'project_id', operator: '=', value: projectId }],
        orderBy: [{ field: 'position', direction: 'desc' }],
        limit: 1,
      })
      const nextPosition =
        existing.length > 0 ? Number((existing[0] as { position: number }).position) + 1 : 0

      const result = await create('layers', {
        project_id: projectId,
        user_id: userId,
        name: name ?? t('layers.defaultName', {}, { defaultValue: 'New Layer' }),
        visible: visible ?? true,
        locked: locked ?? false,
        opacity: opacity ?? 1,
        position: nextPosition,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('layers.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateLayerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('layers', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    for (const k of ['name', 'visible', 'locked', 'opacity', 'position'] as const) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }

    const result = await updateById('layers', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('layers.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/reorder', validateBody(reorderSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const layer = await findById<Record<string, unknown>>('layers', id)
    if (!layer || layer.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
    }

    const { position } = req.body as { position: number }
    const layers = await findMany<Record<string, unknown>>('layers', {
      where: [{ field: 'project_id', operator: '=', value: layer.project_id as string }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })

    let currentPos = 0
    for (const l of layers) {
      if (l.id === id) continue
      if (currentPos === position) currentPos++
      await updateById('layers', l.id as string, { position: currentPos })
      currentPos++
    }
    const updated = await updateById('layers', id, {
      position,
      updated_at: new Date(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('layers.reorder', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('layers', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('layers.notFound', {}, { defaultValue: 'Layer not found' }) })
    }
    await deleteById('layers', id)
    res.status(204).end()
  } catch (error) {
    logger.error('layers.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
