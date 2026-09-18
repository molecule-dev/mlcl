import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

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
import { broadcast } from '@molecule/api-realtime'
import { deleteDocument, index, search } from '@molecule/api-search'

import type { ProjectManagementLimits } from '../tiers.js'
import {
  accessibleProjectIds,
  getUserId,
  projectIfWritable,
  taskAccessible,
  taskWritable,
} from './_ownership.js'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  project_id: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee_id: z.string().optional(),
  milestone_id: z.string().optional(),
  due_date: z.string().optional(),
  position: z.number().optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('task.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const accessibleIds = await accessibleProjectIds(userId)
    if (accessibleIds.length === 0) {
      res.json([])
      return
    }

    const {
      project_id,
      status,
      assignee_id,
      priority,
      milestone_id,
      sort = 'position',
      order = 'asc',
      q,
    } = req.query
    let projectFilter = accessibleIds
    if (project_id && typeof project_id === 'string') {
      if (!accessibleIds.includes(project_id)) {
        res.json([])
        return
      }
      projectFilter = [project_id]
    }
    const where: WhereCondition[] = [{ field: 'project_id', operator: 'in', value: projectFilter }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (assignee_id) where.push({ field: 'assignee_id', operator: '=', value: assignee_id })
    if (priority) where.push({ field: 'priority', operator: '=', value: priority })
    if (milestone_id) where.push({ field: 'milestone_id', operator: '=', value: milestone_id })

    if (q && typeof q === 'string') {
      const result = await search('tasks', { text: q, perPage: 100 })
      const ids = result.hits.map((h) => h.id)
      if (ids.length === 0) {
        res.json([])
        return
      }
      where.push({ field: 'id', operator: 'in', value: ids })
    }

    const items = await findMany('tasks', {
      where,
      orderBy: [{ field: sort as string, direction: (order as string) === 'asc' ? 'asc' : 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('tasks.list', error)
    res
      .status(500)
      .json({ error: t('task.error.list', {}, { defaultValue: 'Failed to list tasks' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('task.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const access = await taskAccessible(userId, req.params.id as string)
    if (!access) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }
    res.json(access.task)
  } catch (error) {
    logger.error('tasks.read', error)
    res
      .status(500)
      .json({ error: t('task.error.read', {}, { defaultValue: 'Failed to get task' }) })
  }
})

// Free-tier task cap — defined in tiers.ts + advertised on the Pricing page, but only maxProjects
// was enforced; task create ignored maxTasks. Count the user's own tasks (created_by), mirroring
// the maxProjects gate.
const enforceTaskLimit = enforceLimit<ProjectManagementLimits>({
  limitType: 'maxTasks',
  getLimit: (limits) => limits.maxTasks,
  getCurrent: async (userId) =>
    count('tasks', [{ field: 'created_by', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceTaskLimit, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('task.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    const project = await projectIfWritable(userId, parsed.data.project_id)
    if (!project) {
      res
        .status(404)
        .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
      return
    }

    const result = await create('tasks', {
      ...parsed.data,
      status: parsed.data.status || 'todo',
      priority: parsed.data.priority || 'medium',
      position: parsed.data.position || 0,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const task = result.data

    if (task && (task as Record<string, unknown>).id) {
      const id = String((task as Record<string, unknown>).id)
      await index('tasks', id, {
        title: parsed.data.title,
        description: parsed.data.description || '',
      }).catch(() => {})
      await broadcast(parsed.data.project_id, 'task:created', task).catch(() => {})
    }

    res.status(201).json(task)
  } catch (error) {
    logger.error('tasks.create', error)
    res
      .status(500)
      .json({ error: t('task.error.create', {}, { defaultValue: 'Failed to create task' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('task.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const access = await taskWritable(userId, req.params.id as string)
    if (!access) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }

    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    // Don't allow re-parenting a task into a project the user can't access.
    if (parsed.data.project_id && parsed.data.project_id !== access.task.project_id) {
      const target = await projectIfWritable(userId, parsed.data.project_id)
      if (!target) {
        res
          .status(404)
          .json({ error: t('project.notFound', {}, { defaultValue: 'Project not found' }) })
        return
      }
    }

    const result = await updateById('tasks', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })

    const updated = await findById<Record<string, unknown>>('tasks', req.params.id as string)
    if (updated) {
      await index('tasks', String(updated.id), {
        title: String(updated.title || ''),
        description: String(updated.description || ''),
      }).catch(() => {})
      await broadcast(String(updated.project_id), 'task:updated', updated).catch(() => {})
    }

    res.json(result.data)
  } catch (error) {
    logger.error('tasks.update', error)
    res
      .status(500)
      .json({ error: t('task.error.update', {}, { defaultValue: 'Failed to update task' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('task.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const access = await taskWritable(userId, req.params.id as string)
    if (!access) {
      res.status(404).json({ error: t('task.notFound', {}, { defaultValue: 'Task not found' }) })
      return
    }
    await deleteById('tasks', req.params.id as string)
    await deleteDocument('tasks', req.params.id as string).catch(() => {})
    await broadcast(String(access.task.project_id), 'task:deleted', { id: req.params.id }).catch(
      () => {},
    )
    res.status(204).end()
  } catch (error) {
    logger.error('tasks.delete', error)
    res
      .status(500)
      .json({ error: t('task.error.delete', {}, { defaultValue: 'Failed to delete task' }) })
  }
})

export default router
