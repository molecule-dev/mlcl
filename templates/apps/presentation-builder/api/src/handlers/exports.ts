import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, findOne } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { PresentationBuilderLimits } from '../tiers.js'

const router = Router()

async function userOwnsPresentation(presentationId: string, userId: string): Promise<boolean> {
  const presentation = await findById<Record<string, unknown>>('presentations', presentationId)
  if (!presentation) return false
  if (presentation.owner_id === userId) return true
  const share = await findOne<Record<string, unknown>>('presentation_shares', [
    { field: 'presentation_id', operator: '=', value: presentationId },
    { field: 'shared_with_user_id', operator: '=', value: userId },
  ])
  return !!share
}

const createExportSchema = z.object({
  presentationId: z.string().min(1),
  format: z.enum(['pdf', 'pptx', 'png_zip']).optional(),
})

const listExportsQuerySchema = z.object({
  presentationId: z.string().min(1),
})

router.post(
  '/exports',
  enforceLimit<PresentationBuilderLimits>({
    limitType: 'maxExports',
    getLimit: (limits) => limits.maxExports,
    getCurrent: async (userId) =>
      count('presentation_exports', [{ field: 'requested_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createExportSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const { presentationId, format } = req.body as z.infer<typeof createExportSchema>
      if (!(await userOwnsPresentation(presentationId, userId))) {
        return res.status(404).json({
          error: t('exports.presentationNotFound', undefined, {
            defaultValue: 'Presentation not found',
          }),
        })
      }
      const result = await create('presentation_exports', {
        presentation_id: presentationId,
        requested_by: userId,
        format: format ?? 'pdf',
        status: 'pending',
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error(err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get(
  '/exports',
  validateQuery(listExportsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const presentationId = req.query.presentationId as string
      if (!(await userOwnsPresentation(presentationId, userId))) {
        return res.status(404).json({
          error: t('exports.presentationNotFound', undefined, {
            defaultValue: 'Presentation not found',
          }),
        })
      }
      const exports = await findMany('presentation_exports', {
        where: [{ field: 'presentation_id', operator: '=', value: presentationId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      res.json(exports)
    } catch (err) {
      logger.error(err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
