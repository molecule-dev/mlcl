/**
 * Bookmarks ("Saved") for the current user.
 *
 * Wraps the `@molecule/api-resource-bookmark` service so the per-app router
 * exposes the endpoints the Feed/Saved pages call without needing the full
 * resource-package wrapper machinery (which the per-app template skips).
 *
 * Every endpoint requires a session (own-bookmarks only — no cross-user
 * reads). The DB enforces UNIQUE on (userId, resourceType, resourceId), so
 * `addBookmark` is idempotent.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { findById, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import {
  addBookmark,
  getBookmarks,
  getFolders,
  removeBookmark,
} from '@molecule/api-resource-bookmark'

const router = Router()

const createBookmarkBodySchema = z.object({
  resourceType: z.string().min(1).default('link'),
  resourceId: z.string().min(1),
  folder: z.string().min(1).max(80).nullable().optional(),
})

const listQuerySchema = z.object({
  folder: z.string().optional(),
  resourceType: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

function requireSession(res: Response): string | null {
  const userId = getSession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

/**
 * Hydrate a list of bookmarks with their underlying link rows so the Saved
 * page can render `LinkPostCard` items directly.
 */
async function hydrateLinks(
  bookmarks: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  if (bookmarks.length === 0) return []
  const linkIds = bookmarks
    .filter((b) => b.resourceType === 'link')
    .map((b) => String(b.resourceId))
  if (linkIds.length === 0) return bookmarks
  const links = await findMany<Record<string, unknown>>('links', {
    where: [{ field: 'id', operator: 'in', value: linkIds }],
    limit: linkIds.length,
  })
  const linkById = new Map<string, Record<string, unknown>>()
  for (const link of links) linkById.set(String(link.id ?? ''), link)
  return bookmarks.map((b) => {
    if (b.resourceType !== 'link') return b
    const link = linkById.get(String(b.resourceId))
    if (!link) return b
    // Merge link fields onto bookmark so `LinkPostCard.normalizePosts` can
    // pick them up; preserve the bookmark `id` as `bookmark_id` for delete.
    return {
      ...link,
      bookmark_id: b.id,
      saved: true,
      folder: b.folder ?? null,
    }
  })
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const { folder, resourceType, limit, offset } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const result = await getBookmarks(userId, {
      folder: folder || undefined,
      resourceType: resourceType || undefined,
      limit,
      offset,
    })
    const data = await hydrateLinks(
      (result.data ?? []) as unknown as Array<Record<string, unknown>>,
    )
    res.json({ data, total: result.total, limit: result.limit, offset: result.offset })
  } catch (error) {
    logger.error('bookmarks.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/folders', async (_req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const folders = await getFolders(userId)
    res.json({ data: folders })
  } catch (error) {
    logger.error('bookmarks.getFolders', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Returns folder summaries — the shape the Saved page expects:
 * `[{ slug, name, count }]`. Re-derives counts directly from the DB so the
 * Saved page renders accurate "Reading queue (24)" pills without an
 * extra round-trip per folder.
 */
router.get('/collections', async (_req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const all = await findMany<Record<string, unknown>>('bookmarks', {
      where: [{ field: 'userId', operator: '=', value: userId }],
    })
    const counts = new Map<string, number>()
    for (const b of all) {
      const folder = (b.folder as string | null | undefined) ?? null
      if (!folder) continue
      counts.set(folder, (counts.get(folder) ?? 0) + 1)
    }
    const data = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([folder, count]) => ({ slug: folder, name: folder, count }))
    res.json({ data })
  } catch (error) {
    logger.error('bookmarks.getCollections', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/check/:resourceType/:resourceId', async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const where: WhereCondition[] = [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: String(req.params.resourceType) },
      { field: 'resourceId', operator: '=', value: String(req.params.resourceId) },
    ]
    const matches = await findMany('bookmarks', { where, limit: 1 })
    res.json({ bookmarked: matches.length > 0 })
  } catch (error) {
    logger.error('bookmarks.check', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createBookmarkBodySchema), async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const { resourceType, resourceId, folder } = req.body as z.infer<
      typeof createBookmarkBodySchema
    >
    // Refuse phantom bookmarks: the resource must exist before we save it.
    if (resourceType === 'link') {
      const link = await findById('links', resourceId)
      if (!link) {
        res.status(404).json({
          error: t('links.notFound', {}, { defaultValue: 'Link not found' }),
        })
        return
      }
    }
    const bookmark = await addBookmark(userId, resourceType, resourceId, folder ?? undefined)
    res.status(201).json(bookmark)
  } catch (error) {
    logger.error('bookmarks.create', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * Toggle endpoint — POST /bookmarks/toggle returns whether the bookmark is
 * now active. Frontend uses this to keep Save buttons in sync without
 * juggling separate POST/DELETE calls.
 */
router.post(
  '/toggle',
  validateBody(createBookmarkBodySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireSession(res)
      if (!userId) return
      const { resourceType, resourceId, folder } = req.body as z.infer<
        typeof createBookmarkBodySchema
      >
      const existing = await findMany<Record<string, unknown>>('bookmarks', {
        where: [
          { field: 'userId', operator: '=', value: userId },
          { field: 'resourceType', operator: '=', value: resourceType },
          { field: 'resourceId', operator: '=', value: resourceId },
        ],
        limit: 1,
      })
      if (existing[0]) {
        await removeBookmark(userId, resourceType, resourceId)
        res.json({ saved: false })
        return
      }
      const bookmark = await addBookmark(userId, resourceType, resourceId, folder ?? undefined)
      res.status(201).json({ saved: true, bookmark })
    } catch (error) {
      logger.error('bookmarks.toggle', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:resourceType/:resourceId', async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    await removeBookmark(userId, String(req.params.resourceType), String(req.params.resourceId))
    res.status(204).end()
  } catch (error) {
    logger.error('bookmarks.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
