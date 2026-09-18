import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { AnimationToolLimits } from '../tiers.js'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  width: z.coerce.number().int().positive().max(8192).optional(),
  height: z.coerce.number().int().positive().max(8192).optional(),
  fps: z.coerce.number().int().positive().max(240).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  width: z.coerce.number().int().positive().max(8192).optional(),
  height: z.coerce.number().int().positive().max(8192).optional(),
  fps: z.coerce.number().int().positive().max(240).optional(),
  duration: z.coerce.number().nonnegative().optional(),
})

// --- Helpers ---

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
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const projects = await findMany('animation_projects', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(projects)
  } catch (error) {
    logger.error('GET /api/projects failed', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    if (!UUID_RX.test(id)) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const project = await findById<Record<string, unknown>>('animation_projects', id)
    if (!project) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    if (project.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    res.json(project)
  } catch (error) {
    logger.error('GET /api/projects/:id failed', error)
    res
      .status(404)
      .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
  }
})

router.post(
  '/',
  enforceLimit<AnimationToolLimits>({
    limitType: 'maxProjects',
    getLimit: (limits) => limits.maxProjects,
    getCurrent: async (userId) =>
      count('animation_projects', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { name, width, height, fps } = req.body as z.infer<typeof createProjectSchema>
      const now = new Date().toISOString()
      const result = await create('animation_projects', {
        name,
        width: width ?? 800,
        height: height ?? 600,
        fps: fps ?? 60,
        duration: 0,
        owner_id: userId,
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('POST /api/projects failed', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    if (!UUID_RX.test(id)) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const existing = await findById<Record<string, unknown>>('animation_projects', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    const result = await updateById('animation_projects', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('PUT /api/projects/:id failed', error)
    res
      .status(404)
      .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
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
    if (!UUID_RX.test(id)) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    const existing = await findById<Record<string, unknown>>('animation_projects', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    await deleteById('animation_projects', id)
    res.status(204).end()
  } catch (error) {
    logger.error('DELETE /api/projects/:id failed', error)
    res
      .status(404)
      .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
  }
})

export default router
