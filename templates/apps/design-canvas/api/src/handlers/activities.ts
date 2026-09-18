import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({ projectId: z.string().min(1).optional() })

const createActivitySchema = z.object({
  projectId: z.string().min(1),
  action: z.enum(['opened', 'edited', 'exported', 'shared', 'commented']),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
    const projectId = req.query.projectId ? String(req.query.projectId) : null
    const where = projectId
      ? [{ field: 'project_id', operator: '=' as const, value: projectId }]
      : [{ field: 'user_id', operator: '=' as const, value: userId }]

    if (projectId && !(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const activities = await findMany('project_activities', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(activities)
  } catch (error) {
    logger.error('activities.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createActivitySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { projectId, action, metadata } = req.body
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const result = await create('project_activities', {
      project_id: projectId,
      user_id: userId,
      action,
      metadata: metadata ?? {},
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('activities.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
