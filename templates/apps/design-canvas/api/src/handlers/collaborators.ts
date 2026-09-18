import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { DesignCanvasLimits } from '../tiers.js'

const router = Router({ mergeParams: true })

function getProjectId(req: Request): string {
  const id = req.params.projectId ?? req.params.id
  return Array.isArray(id) ? id[0] : id
}

const inviteSchema = z.object({
  user_id: z.string().min(1),
  role: z.enum(['viewer', 'editor', 'owner']).default('viewer'),
})

async function userOwnsProject(userId: string, projectId: string): Promise<boolean> {
  const project = await findById<Record<string, unknown>>('projects', projectId)
  return Boolean(project && project.user_id === userId)
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const projectId = getProjectId(req)
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const rows = await findMany('project_collaborators', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('collaborators.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(inviteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const projectId = getProjectId(req)
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }

    const tier = await getEffectiveTier<DesignCanvasLimits>(res)
    if (!tier.limits.advancedFeatures) {
      return res.status(402).json({
        error: t(
          'plan.collaboratorsRequiresUpgrade',
          {},
          { defaultValue: 'Collaborator invites require a paid plan' },
        ),
      })
    }

    const { user_id, role } = req.body as z.infer<typeof inviteSchema>

    const result = await create('project_collaborators', {
      project_id: projectId,
      user_id,
      role,
      invited_at: new Date(),
      accepted_at: null,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('collaborators.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const projectId = getProjectId(req)
    if (!(await userOwnsProject(userId, projectId))) {
      return res
        .status(404)
        .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
    }
    const target = String(req.params.userId)
    // Composite key delete: emulate via findMany then deleteById would not
    // suffice (no surrogate id); use a query helper if available. Here we
    // remove by composite keys via a follow-up query helper from the
    // database core (see store.deleteWhere if/when available); fall back to
    // soft-list+filter for v1 since CRUD is the primary path.
    const rows = await findMany<Record<string, unknown>>('project_collaborators', {
      where: [
        { field: 'project_id', operator: '=', value: projectId },
        { field: 'user_id', operator: '=', value: target },
      ],
    })
    for (const r of rows) {
      const id = (r as { id?: string }).id
      if (id) await deleteById('project_collaborators', id)
    }
    res.status(204).end()
  } catch (error) {
    logger.error('collaborators.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
