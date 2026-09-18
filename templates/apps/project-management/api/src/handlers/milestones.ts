import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  accessibleProjectIds,
  getUserId,
  milestoneAccessible,
  milestoneWritable,
  projectIfWritable,
} from './_ownership.js'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  project_id: z.string().min(1),
  due_date: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed']).optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('milestone.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const accessibleIds = await accessibleProjectIds(userId)
    if (accessibleIds.length === 0) {
      res.json([])
      return
    }

    const { project_id, sort = 'due_date', order = 'asc' } = req.query
    let projectFilter = accessibleIds
    if (project_id && typeof project_id === 'string') {
      if (!accessibleIds.includes(project_id)) {
        res.json([])
        return
      }
      projectFilter = [project_id]
    }
    const where: WhereCondition[] = [{ field: 'project_id', operator: 'in', value: projectFilter }]

    const items = await findMany('milestones', {
      where,
      orderBy: [{ field: sort as string, direction: (order as string) === 'asc' ? 'asc' : 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('milestones.list', error)
    res
      .status(500)
      .json({ error: t('milestone.error.list', {}, { defaultValue: 'Failed to list milestones' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('milestone.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const access = await milestoneAccessible(userId, req.params.id as string)
    if (!access) {
      res
        .status(404)
        .json({ error: t('milestone.notFound', {}, { defaultValue: 'Milestone not found' }) })
      return
    }
    res.json(access.milestone)
  } catch (error) {
    logger.error('milestones.read', error)
    res
      .status(500)
      .json({ error: t('milestone.error.read', {}, { defaultValue: 'Failed to get milestone' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('milestone.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
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

    const result = await create('milestones', {
      ...parsed.data,
      status: parsed.data.status || 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('milestones.create', error)
    res.status(500).json({
      error: t('milestone.error.create', {}, { defaultValue: 'Failed to create milestone' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('milestone.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const access = await milestoneWritable(userId, req.params.id as string)
    if (!access) {
      res
        .status(404)
        .json({ error: t('milestone.notFound', {}, { defaultValue: 'Milestone not found' }) })
      return
    }

    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues })
      return
    }

    const result = await updateById('milestones', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('milestones.update', error)
    res.status(500).json({
      error: t('milestone.error.update', {}, { defaultValue: 'Failed to update milestone' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('milestone.error.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const access = await milestoneWritable(userId, req.params.id as string)
    if (!access) {
      res
        .status(404)
        .json({ error: t('milestone.notFound', {}, { defaultValue: 'Milestone not found' }) })
      return
    }
    await deleteById('milestones', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('milestones.delete', error)
    res.status(500).json({
      error: t('milestone.error.delete', {}, { defaultValue: 'Failed to delete milestone' }),
    })
  }
})

export default router
