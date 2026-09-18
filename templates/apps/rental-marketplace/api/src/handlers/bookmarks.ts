/**
 * `/api/bookmarks` (and alias `/api/wishlist`) — saved listings.
 *
 * GET /                — auth; lists bookmarks owned by current user
 * POST /               — auth; toggle-create (idempotent on (user, listing))
 * DELETE /:id          — auth + ownership; remove a bookmark
 *
 * Bookmarks live in the canonical `@molecule/api-resource-bookmark`
 * table (`bookmarks`) with `userId`/`resourceType`/`resourceId` keys.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { decorateBookmarks } from './_decorate.js'

const router = Router()

const listQuery = z.object({
  collection: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

const createSchema = z.object({
  listing_id: z.string().min(1),
  collection: z.string().optional(),
})

router.get('/', validateQuery(listQuery), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { collection, page, limit } = req.query as unknown as z.infer<typeof listQuery>
    const where: { field: string; operator: string; value: unknown }[] = [
      { field: 'userId', operator: '=', value: userId },
      { field: 'resourceType', operator: '=', value: 'listing' },
    ]
    if (collection) where.push({ field: 'folder', operator: '=', value: collection })

    const rows = await findMany<Record<string, unknown>>('bookmarks', {
      where: where as never,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const data = await decorateBookmarks(rows)
    res.json({ data })
  } catch (err) {
    console.error('[bookmarks.list]', err)
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
      { field: 'resourceType', operator: '=', value: 'listing' },
      { field: 'resourceId', operator: '=', value: body.listing_id },
    ])
    if (existing) {
      return res.status(200).json(existing)
    }
    const result = await create('bookmarks', {
      userId,
      resourceType: 'listing',
      resourceId: body.listing_id,
      folder: body.collection ?? 'Wishlist',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[bookmarks.create]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = String(req.params.id)
    // Try by primary key first.
    const all = await findMany<Record<string, unknown>>('bookmarks', {
      where: [{ field: 'userId', operator: '=', value: userId }],
      limit: 500,
    })
    const owned = all.find((b) => String(b.id) === id || String(b.resourceId) === id)
    if (!owned) {
      return res
        .status(404)
        .json({ error: t('bookmark.notFound', {}, { defaultValue: 'Bookmark not found' }) })
    }
    await deleteById('bookmarks', String(owned.id))
    res.status(204).send()
  } catch (err) {
    console.error('[bookmarks.delete]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
