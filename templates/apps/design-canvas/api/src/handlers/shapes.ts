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

const shapeTypes = z.enum(['rect', 'ellipse', 'text', 'path', 'image', 'line'])

const baseShapeSchema = z.object({
  type: shapeTypes,
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  rotation: z.number().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  opacity: z.number().min(0).max(1).optional(),
  text: z.string().nullable().optional(),
  fontSize: z.number().positive().optional(),
  fontFamily: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  zIndex: z.number().int().optional(),
  layerId: z.string().nullable().optional(),
})

const listQuerySchema = z.object({ projectId: z.string().min(1) })

const createShapeSchema = baseShapeSchema.extend({
  projectId: z.string().min(1),
})

const updateShapeSchema = baseShapeSchema.partial()

const batchSchema = z.object({
  projectId: z.string().min(1),
  shapes: z.array(baseShapeSchema).min(1).max(500),
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

    const shapes = await findMany('shapes', {
      where: [
        { field: 'project_id', operator: '=', value: projectId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'z_index', direction: 'asc' }],
    })
    res.json(shapes)
  } catch (error) {
    logger.error('shapes.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const shape = await findById<Record<string, unknown>>('shapes', id)
    if (!shape || shape.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('shapes.notFound', {}, { defaultValue: 'Shape not found' }) })
    }
    res.json(shape)
  } catch (error) {
    logger.error('shapes.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

function shapeColumns(
  userId: string,
  projectId: string,
  data: z.infer<typeof baseShapeSchema>,
): Record<string, unknown> {
  return {
    project_id: projectId,
    user_id: userId,
    layer_id: data.layerId ?? null,
    type: data.type,
    x: data.x ?? 0,
    y: data.y ?? 0,
    width: data.width ?? 100,
    height: data.height ?? 100,
    rotation: data.rotation ?? 0,
    fill: data.fill ?? '#000000',
    stroke: data.stroke ?? null,
    stroke_width: data.strokeWidth ?? 0,
    opacity: data.opacity ?? 1,
    text: data.text ?? null,
    font_size: data.fontSize ?? 16,
    font_family: data.fontFamily ?? 'Inter',
    properties: data.properties ?? {},
    z_index: data.zIndex ?? 0,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

router.post(
  '/',
  enforceLimit<DesignCanvasLimits>({
    limitType: 'maxShapes',
    getLimit: (limits) => limits.maxShapes,
    getCurrent: async (userId) =>
      count('shapes', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createShapeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { projectId, ...rest } = req.body
      if (!(await userOwnsProject(userId, projectId))) {
        return res
          .status(404)
          .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      }
      const result = await create('shapes', shapeColumns(userId, projectId, rest))
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('shapes.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.post('/batch', validateBody(batchSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { projectId, shapes: shapeList } = req.body as z.infer<typeof batchSchema>
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    const created = []
    for (const shape of shapeList) {
      const r = await create('shapes', shapeColumns(userId, projectId, shape))
      created.push(r.data)
    }
    res.status(201).json(created)
  } catch (error) {
    logger.error('shapes.batch', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateShapeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('shapes', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('shapes.notFound', {}, { defaultValue: 'Shape not found' }) })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    const dbFieldMap: Record<string, string> = {
      strokeWidth: 'stroke_width',
      fontSize: 'font_size',
      fontFamily: 'font_family',
      zIndex: 'z_index',
      layerId: 'layer_id',
    }
    for (const k of [
      'type',
      'x',
      'y',
      'width',
      'height',
      'rotation',
      'fill',
      'stroke',
      'strokeWidth',
      'opacity',
      'text',
      'fontSize',
      'fontFamily',
      'zIndex',
      'layerId',
      'properties',
    ] as const) {
      if (req.body[k] !== undefined) {
        updates[dbFieldMap[k] ?? k] = req.body[k]
      }
    }

    const result = await updateById('shapes', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('shapes.update', error)
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
    const existing = await findById<Record<string, unknown>>('shapes', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('shapes.notFound', {}, { defaultValue: 'Shape not found' }) })
    }
    await deleteById('shapes', id)
    res.status(204).end()
  } catch (error) {
    logger.error('shapes.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
