/**
 * `/api/bookmarks` — saved properties.
 *
 * GET /                                    — auth; list current user's bookmarks (optional ?resourceType filter)
 * POST /                                   — auth; create a bookmark (idempotent on (user, resourceType, resourceId))
 * DELETE /:resourceType/:resourceId        — auth; remove a bookmark by composite key
 *
 * Bookmarks live in the canonical `@molecule/api-resource-bookmark`
 * table (`bookmarks`) with `userId`/`resourceType`/`resourceId` keys.
 * The property-listing app uses `resourceType=property`; the SearchPage
 * and SavedPropertiesPage call this endpoint to bookmark/unbookmark
 * individual properties by composite key (no bookmark id round-trip).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { addBookmark, getBookmarks, removeBookmark } from '@molecule/api-resource-bookmark'

const router = Router()

const listQuery = z.object({
  resourceType: z.string().optional(),
  folder: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})

const createSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  folder: z.string().optional(),
})

router.get('/', validateQuery(listQuery), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { resourceType, folder, page, limit } = req.query as unknown as z.infer<typeof listQuery>
    const { data } = await getBookmarks(userId, {
      resourceType,
      folder,
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data })
  } catch (error) {
    logger.error('bookmarks.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const body = req.body as z.infer<typeof createSchema>
    const existing = await findOne<Record<string, unknown>>('bookmarks', [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: body.resourceType },
      { field: 'resourceId', operator: '=', value: body.resourceId },
    ])
    if (existing) {
      return res.status(200).json(existing)
    }
    const bookmark = await addBookmark(userId, body.resourceType, body.resourceId, body.folder)
    res.status(201).json(bookmark)
  } catch (error) {
    logger.error('bookmarks.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:resourceType/:resourceId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const resourceType = String(req.params.resourceType)
    const resourceId = String(req.params.resourceId)
    const owned = await findOne<Record<string, unknown>>('bookmarks', [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: resourceType },
      { field: 'resourceId', operator: '=', value: resourceId },
    ])
    if (!owned) {
      return res
        .status(404)
        .json({ error: t('bookmark.notFound', {}, { defaultValue: 'Bookmark not found' }) })
    }
    await removeBookmark(userId, resourceType, resourceId)
    res.status(204).send()
  } catch (error) {
    logger.error('bookmarks.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
