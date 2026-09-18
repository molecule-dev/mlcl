import type { RequestHandler } from 'express'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany } from '@molecule/api-database'
import { enforceLimit, getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { DesignCanvasLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({ projectId: z.string().min(1) })

const createExportSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(['png', 'svg', 'pdf', 'jpg']).default('png'),
  quality: z.number().int().min(1).max(100).default(90),
  scale: z.number().positive().max(8).default(1),
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

    const exportRows = await findMany('exports', {
      where: [
        { field: 'project_id', operator: '=', value: projectId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(exportRows)
  } catch (error) {
    logger.error('exports.list', error)
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
    const exportRecord = await findById<Record<string, unknown>>('exports', id)
    if (!exportRecord || exportRecord.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('exports.notFound', {}, { defaultValue: 'Export not found' }) })
    }
    res.json(exportRecord)
  } catch (error) {
    logger.error('exports.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<DesignCanvasLimits>({
    limitType: 'maxExports',
    getLimit: (limits) => limits.maxExports,
    getCurrent: async (userId) =>
      count('exports', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createExportSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { projectId, format, quality, scale } = req.body
      if (!(await userOwnsProject(userId, projectId))) {
        return res
          .status(404)
          .json({ error: t('projects.notFound', {}, { defaultValue: 'Project not found' }) })
      }

      // Exporting is a paid-plan feature (DesignCanvasLimits.canExport). The
      // maxExports COUNT gate alone still let a free user (canExport:false)
      // create exports up to the cap — gate on the flag too, mirroring the
      // advancedFeatures gate on collaborator invites.
      const tier = await getEffectiveTier<DesignCanvasLimits>(res)
      if (!tier.limits.canExport) {
        return res.status(402).json({
          error: t(
            'plan.exportRequiresUpgrade',
            {},
            { defaultValue: 'Exporting requires a paid plan' },
          ),
        })
      }

      const result = await create('exports', {
        project_id: projectId,
        user_id: userId,
        format,
        quality,
        scale,
        status: 'ready',
        download_url: `https://exports.example.test/${projectId}.${format}`,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('exports.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
