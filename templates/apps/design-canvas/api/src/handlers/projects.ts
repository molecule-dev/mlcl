import type { RequestHandler } from 'express'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { DesignCanvasLimits } from '../tiers.js'

const router = Router()

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  canvas_data: z.record(z.string(), z.unknown()).optional(),
  team_id: z.string().nullable().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  canvas_data: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const projects = await findMany('projects', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(projects)
  } catch (error) {
    logger.error('projects.list', error)
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
    const project = await findById<Record<string, unknown>>('projects', id)
    if (!project || project.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    res.json(project)
  } catch (error) {
    logger.error('projects.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<DesignCanvasLimits>({
    limitType: 'maxProjects',
    getLimit: (limits) => limits.maxProjects,
    getCurrent: async (userId) =>
      count('projects', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { name, width, height, canvas_data, team_id } = req.body

      const result = await create('projects', {
        user_id: userId,
        team_id: team_id ?? null,
        name,
        width: width ?? 1920,
        height: height ?? 1080,
        canvas_data: canvas_data ?? { shapes: [], layers: [] },
        created_at: new Date(),
        updated_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('projects.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('projects', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const { name, width, height, canvas_data } = req.body
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (name !== undefined) updates.name = name
    if (width !== undefined) updates.width = width
    if (height !== undefined) updates.height = height
    if (canvas_data !== undefined) updates.canvas_data = canvas_data

    const result = await updateById('projects', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('projects.update', error)
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
    const existing = await findById<Record<string, unknown>>('projects', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    await deleteById('projects', id)
    res.status(204).end()
  } catch (error) {
    logger.error('projects.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const source = await findById<Record<string, unknown>>('projects', id)
    if (!source || source.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    const duplicate = await create('projects', {
      user_id: userId,
      team_id: source.team_id ?? null,
      name: `${source.name as string} (Copy)`,
      width: source.width,
      height: source.height,
      canvas_data: source.canvas_data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(duplicate.data)
  } catch (error) {
    logger.error('projects.duplicate', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
