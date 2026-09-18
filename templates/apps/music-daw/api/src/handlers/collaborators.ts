import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_ROLES = ['viewer', 'editor', 'admin'] as const

const createCollaboratorSchema = z.object({
  project_id: z.string().uuid(),
  invitee_email: z.string().email().optional(),
  collaborator_user_id: z.string().uuid().optional(),
  role: z.enum(ALLOWED_ROLES).default('editor'),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : null
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (projectId) where.push({ field: 'project_id', operator: '=', value: projectId })

    const rows = await findMany('collaborators', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('collaborators.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createCollaboratorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createCollaboratorSchema>
    const project = await findById<Record<string, unknown>>('music_projects', body.project_id)
    if (!project || project.user_id !== userId) {
      return res.status(404).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
      })
    }

    const result = await create('collaborators', {
      project_id: body.project_id,
      user_id: userId,
      collaborator_user_id: body.collaborator_user_id ?? null,
      invitee_email: body.invitee_email ?? null,
      role: body.role,
      invited_at: new Date(),
      created_at: new Date(),
    })

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('collaborators.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('collaborators', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('collaborators.notFound', undefined, { defaultValue: 'Collaborator not found.' }),
      })
    }

    await deleteById('collaborators', id)
    res.status(204).end()
  } catch (error) {
    logger.error('collaborators.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
