import type { RequestHandler } from 'express'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { deleteDocument, index, search } from '@molecule/api-search'

import type { ProjectManagementLimits } from '../tiers.js'
import {
  accessibleProjectIds,
  getUserId,
  projectIfAccessible,
  projectIfOwner,
} from './_ownership.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'archived', 'on_hold']).optional(),
  color: z.string().max(7).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('project.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const ids = await accessibleProjectIds(userId)
    if (ids.length === 0) {
      res.json([])
      return
    }

    const { status, sort = 'updated_at', order = 'desc', q } = req.query
    const where: WhereCondition[] = [{ field: 'id', operator: 'in', value: ids }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    if (q && typeof q === 'string') {
      try {
        const result = await search('projects', { text: q, perPage: 50 })
        const searchIds = result.hits.map((h) => h.id).filter((id) => ids.includes(id))
        if (searchIds.length === 0) {
          res.json([])
          return
        }
        where[0] = { field: 'id', operator: 'in', value: searchIds }
      } catch (_error) {
        // Search bond unavailable (e.g. Meilisearch not running in CI) —
        // fall back to a DB-side ILIKE filter so the route remains functional.
        where.push({ field: 'name', operator: 'ilike', value: q })
      }
    }

    const items = await findMany('projects', {
      where,
      orderBy: [{ field: sort as string, direction: (order as string) === 'asc' ? 'asc' : 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('projects.list', error)
    res
      .status(500)
      .json({ error: t('project.error.list', {}, { defaultValue: 'Failed to list projects' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('project.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const project = await projectIfAccessible(userId, req.params.id as string)
    if (!project) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }
    res.json(project)
  } catch (error) {
    logger.error('projects.read', error)
    res
      .status(500)
      .json({ error: t('project.error.read', {}, { defaultValue: 'Failed to get project' }) })
  }
})

router.post(
  '/',
  enforceLimit<ProjectManagementLimits>({
    limitType: 'maxProjects',
    getLimit: (limits) => limits.maxProjects,
    getCurrent: async (userId) =>
      count('projects', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('project.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }

      const parsed = createSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues })
        return
      }

      const result = await create('projects', {
        ...parsed.data,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      const project = result.data

      if (project && (project as Record<string, unknown>).id) {
        await index('projects', String((project as Record<string, unknown>).id), {
          name: parsed.data.name,
          description: parsed.data.description || '',
        }).catch(() => {})
      }

      res.status(201).json(project)
    } catch (error) {
      logger.error('projects.create', error)
      res.status(500).json({
        error: t('project.error.create', {}, { defaultValue: 'Failed to create project' }),
      })
    }
  },
)

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('project.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    // Only the owner can mutate the project. Members can collaborate on
    // tasks/milestones inside it but can't rename/archive/delete.
    const owned = await projectIfOwner(userId, req.params.id as string)
    if (!owned) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }

    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    const result = await updateById('projects', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })

    if (parsed.data.name || parsed.data.description) {
      await index('projects', String(owned.id), {
        name: String(parsed.data.name ?? owned.name ?? ''),
        description: String(parsed.data.description ?? ''),
      }).catch(() => {})
    }

    res.json(result.data)
  } catch (error) {
    logger.error('projects.update', error)
    res
      .status(500)
      .json({ error: t('project.error.update', {}, { defaultValue: 'Failed to update project' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('project.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const owned = await projectIfOwner(userId, req.params.id as string)
    if (!owned) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }

    await deleteById('projects', req.params.id as string)
    await deleteDocument('projects', req.params.id as string).catch(() => {})
    res.status(204).end()
  } catch (error) {
    logger.error('projects.delete', error)
    res
      .status(500)
      .json({ error: t('project.error.delete', {}, { defaultValue: 'Failed to delete project' }) })
  }
})

export default router
