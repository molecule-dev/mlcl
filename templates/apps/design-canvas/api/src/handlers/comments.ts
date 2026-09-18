import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({ projectId: z.string().min(1) })

const createCommentSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().min(1).max(4000),
  x: z.number().optional(),
  y: z.number().optional(),
  parentId: z.string().nullable().optional(),
})

const updateCommentSchema = z.object({
  body: z.string().min(1).max(4000).optional(),
  resolved: z.boolean().optional(),
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
    const comments = await findMany('project_comments', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(comments)
  } catch (error) {
    logger.error('comments.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createCommentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { projectId, body, x, y, parentId } = req.body
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const result = await create('project_comments', {
      project_id: projectId,
      author_id: userId,
      body,
      x: x ?? null,
      y: y ?? null,
      parent_id: parentId ?? null,
      resolved: false,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('comments.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateCommentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('project_comments', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
    }

    const isAuthor = existing.author_id === userId
    const ownsProject = await userOwnsProject(userId, existing.project_id as string)
    if (!isAuthor && !ownsProject) {
      return res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
    }

    const updates: Record<string, unknown> = {}
    if (req.body.body !== undefined && isAuthor) updates.body = req.body.body
    if (req.body.resolved !== undefined) updates.resolved = req.body.resolved

    const result = await updateById('project_comments', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('comments.update', error)
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
    const existing = await findById<Record<string, unknown>>('project_comments', id)
    if (!existing || existing.author_id !== userId) {
      return res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
    }
    await deleteById('project_comments', id)
    res.status(204).end()
  } catch (error) {
    logger.error('comments.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
