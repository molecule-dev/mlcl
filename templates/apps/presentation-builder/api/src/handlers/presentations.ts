import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PresentationBuilderLimits } from '../tiers.js'

const router = Router()

const createPresentationSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  themeId: z.string().nullable().optional(),
})

const updatePresentationSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  themeId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
})

async function authorizePresentation(
  presentationId: string,
  userId: string,
  requireWrite: boolean,
): Promise<Record<string, unknown> | null> {
  const presentation = await findById<Record<string, unknown>>('presentations', presentationId)
  if (!presentation) return null
  if (presentation.owner_id === userId) return presentation
  // Check share row.
  const share = await findOne<Record<string, unknown>>('presentation_shares', [
    { field: 'presentation_id', operator: '=', value: presentationId },
    { field: 'shared_with_user_id', operator: '=', value: userId },
  ])
  if (!share) return null
  if (requireWrite && share.role !== 'editor') return null
  return presentation
}

/**
 * Attach a live slide_count. The stored presentations.slide_count column was only ever
 * initialised to 0 and never maintained, so every presentation reported 0 slides — breaking
 * the analytics slide totals and the "editing vs ready" status the app derives from it
 * (`slide_count === 0 ? 'editing' : 'ready'`). Recompute from the slides table on read; slides
 * are hard-deleted, so a count is the exact total.
 */
async function withSlideCount(
  presentation: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const slideCount = await count('slides', [
    { field: 'presentation_id', operator: '=', value: String(presentation.id) },
  ])
  return { ...presentation, slide_count: slideCount }
}

router.get('/presentations', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const presentations = await findMany('presentations', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'trashed_at', operator: 'is_null' },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(await Promise.all((presentations as Record<string, unknown>[]).map(withSlideCount)))
  } catch (err) {
    logger.error('presentation.list_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/presentations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const presentation = await authorizePresentation(id, userId, false)
    if (!presentation) {
      return res.status(404).json({
        error: t('presentations.notFound', undefined, { defaultValue: 'Presentation not found' }),
      })
    }
    res.json(await withSlideCount(presentation))
  } catch (err) {
    logger.error('presentation.read_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/presentations',
  enforceLimit<PresentationBuilderLimits>({
    limitType: 'maxPresentations',
    getLimit: (limits) => limits.maxPresentations,
    getCurrent: async (userId) =>
      count('presentations', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'trashed_at', operator: 'is_null' },
      ]),
  }) as unknown as RequestHandler,
  validateBody(createPresentationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const { title, description, themeId } = req.body as z.infer<typeof createPresentationSchema>
      const result = await create('presentations', {
        owner_id: userId,
        title:
          title ??
          t('presentations.untitled', undefined, {
            defaultValue: 'Untitled Presentation',
          }),
        description: description ?? null,
        theme_id: themeId ?? null,
        slide_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('presentation.create_failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/presentations/:id',
  validateBody(updatePresentationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const id = getParamId(req)
      const existing = await authorizePresentation(id, userId, true)
      if (!existing) {
        return res.status(404).json({
          error: t('presentations.notFound', undefined, { defaultValue: 'Presentation not found' }),
        })
      }
      const { title, description, themeId, isPublic } = req.body as z.infer<
        typeof updatePresentationSchema
      >
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (title !== undefined) updates.title = title
      if (description !== undefined) updates.description = description
      if (themeId !== undefined) updates.theme_id = themeId
      if (isPublic !== undefined) {
        updates.is_public = isPublic
        if (isPublic && !existing.public_slug) {
          updates.public_slug = (existing.id as string).replace(/-/g, '').slice(0, 12)
        }
      }
      const result = await updateById('presentations', id, updates)
      res.json(result.data)
    } catch (err) {
      logger.error('presentation.update_failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/presentations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('presentations', id)
    if (!existing || existing.owner_id !== userId) {
      return res.status(404).json({
        error: t('presentations.notFound', undefined, { defaultValue: 'Presentation not found' }),
      })
    }
    await deleteById('presentations', id)
    res.status(204).end()
  } catch (err) {
    logger.error('presentation.delete_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/presentations/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const source = await authorizePresentation(id, userId, false)
    if (!source) {
      return res.status(404).json({
        error: t('presentations.notFound', undefined, { defaultValue: 'Presentation not found' }),
      })
    }
    const result = await create('presentations', {
      owner_id: userId,
      title: `${source.title as string} (Copy)`,
      description: source.description ?? null,
      theme_id: source.theme_id ?? null,
      slide_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('presentation.duplicate_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
