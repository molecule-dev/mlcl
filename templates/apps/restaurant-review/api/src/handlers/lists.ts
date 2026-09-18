/**
 * Lists handler — user-curated collections of restaurants.
 *
 * Visibility:
 * - `private` lists are only visible to the owner.
 * - `public` lists are visible to everyone (anonymous + other users).
 *
 * Authorization:
 * - GET / — owner only (returns MY lists).
 * - GET /:id — public if `visibility=public`, owner only otherwise.
 * - POST / PUT / DELETE — owner only.
 * - GET /:id/items — same visibility rule as the parent list.
 * - POST/DELETE /:id/items — owner only.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const visibilityEnum = z.enum(['private', 'public'])

const createListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  cover_url: z.string().url().optional(),
  visibility: visibilityEnum.optional().default('private'),
})

const updateListSchema = createListSchema.partial()

const listListsQuery = z.object({
  visibility: visibilityEnum.optional(),
  // `scope=mine` (default, requires auth) returns only lists the current user
  // owns. `scope=public` returns ALL public lists across the catalog and is
  // anonymous-readable — that's what the "trending in the community" rail
  // on /lists consumes when it wants to surface other people's curation.
  scope: z.enum(['mine', 'public']).optional().default('mine'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const addItemSchema = z.object({
  restaurant_id: z.string().min(1),
  position: z.coerce.number().int().min(0).optional().default(0),
  note: z.string().max(2000).optional().default(''),
})

// ---------------------------------------------------------------------------
// GET / — Owner-only: list MY lists.
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listListsQuery), async (req: Request, res: Response) => {
  try {
    const { scope, visibility, page, limit } = req.query as unknown as z.infer<
      typeof listListsQuery
    >

    const where: WhereCondition[] = []
    if (scope === 'mine') {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      where.push({ field: 'owner_id', operator: '=', value: userId })
      if (visibility) where.push({ field: 'visibility', operator: '=', value: visibility })
    } else {
      // public scope is anonymous-readable; force visibility=public so we
      // never accidentally leak a user's private list.
      where.push({ field: 'visibility', operator: '=', value: 'public' })
    }

    const lists = await findMany('lists', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('lists', where)
    res.json({ data: lists, total, page })
  } catch (error) {
    logger.error('lists.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Public when public, owner otherwise.
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const list = await findById<Record<string, unknown>>('lists', id)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    if (list.visibility !== 'public' && list.owner_id !== getUserId(res)) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    res.json(list)
  } catch (error) {
    logger.error('lists.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id/items — Same visibility rule as parent list.
// ---------------------------------------------------------------------------

router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const list = await findById<Record<string, unknown>>('lists', id)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    if (list.visibility !== 'public' && list.owner_id !== getUserId(res)) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    const items = await findMany('list_items', {
      where: [{ field: 'list_id', operator: '=', value: id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ data: items })
  } catch (error) {
    logger.error('lists.getItems', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Owner-only create.
// ---------------------------------------------------------------------------

router.post('/', validateBody(createListSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const data = req.body as z.infer<typeof createListSchema>
    const result = await create('lists', {
      ...data,
      owner_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('lists.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// PUT /:id — Owner-only update.
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updateListSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('lists', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const result = await updateById('lists', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('lists.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Owner-only delete.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('lists', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('lists', id)
    res.status(204).send()
  } catch (error) {
    logger.error('lists.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// POST /:id/items — Owner-only add restaurant to list.
// ---------------------------------------------------------------------------

router.post('/:id/items', validateBody(addItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const listId = req.params.id as string
    const list = await findById<Record<string, unknown>>('lists', listId)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    if (list.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const data = req.body as z.infer<typeof addItemSchema>
    const existing = await findOne('list_items', [
      { field: 'list_id', operator: '=', value: listId },
      { field: 'restaurant_id', operator: '=', value: data.restaurant_id },
    ])
    if (existing) {
      return res.status(200).json(existing)
    }
    const result = await create('list_items', {
      ...data,
      list_id: listId,
      added_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('lists.addItem', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id/items/:itemId — Owner-only remove from list.
// ---------------------------------------------------------------------------

router.delete('/:id/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const listId = req.params.id as string
    const itemId = req.params.itemId as string
    const list = await findById<Record<string, unknown>>('lists', listId)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('list.notFound', {}, { defaultValue: 'List not found' }) })
    }
    if (list.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('list_items', itemId)
    res.status(204).send()
  } catch (error) {
    logger.error('lists.deleteItem', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
