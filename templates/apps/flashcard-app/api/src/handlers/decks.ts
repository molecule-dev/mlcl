/**
 * Deck CRUD handlers.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { FlashcardAppLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxDecks = enforceLimit<FlashcardAppLimits>({
  limitType: 'maxDecks',
  getLimit: (limits) => limits.maxDecks,
  getCurrent: async (userId) =>
    count('decks', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

interface CardStatRow {
  deck_id: string
  state: string
  next_review: string | Date
}

interface ReviewStatRow {
  deck_id: string
  quality: number
}

/**
 * Overlay live `due_count` / `new_count` / `retention_rate` values onto
 * stored deck rows. Those columns are time-dependent (cards become due as
 * `next_review` passes) so the stored values go stale the moment a card is
 * reviewed or its review date arrives — recompute from `cards` +
 * `review_log` at read time instead. `card_count` stays maintained by the
 * card create/delete handlers.
 */
const withLiveCounts = async (
  userId: string,
  decks: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> => {
  if (decks.length === 0) return decks
  const cards = await findMany<CardStatRow>('cards', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 5000,
  })
  const reviews = await findMany<ReviewStatRow>('review_log', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 5000,
  })
  const now = Date.now()
  const dueByDeck = new Map<string, number>()
  const newByDeck = new Map<string, number>()
  for (const c of cards) {
    const deckId = String(c.deck_id)
    if (String(c.state) === 'new') newByDeck.set(deckId, (newByDeck.get(deckId) ?? 0) + 1)
    if (new Date(c.next_review as string).getTime() <= now) {
      dueByDeck.set(deckId, (dueByDeck.get(deckId) ?? 0) + 1)
    }
  }
  const reviewsByDeck = new Map<string, { total: number; passing: number }>()
  for (const r of reviews) {
    const deckId = String(r.deck_id)
    const entry = reviewsByDeck.get(deckId) ?? { total: 0, passing: 0 }
    entry.total += 1
    if (Number(r.quality) >= 3) entry.passing += 1
    reviewsByDeck.set(deckId, entry)
  }
  return decks.map((d) => {
    const id = String(d.id)
    const agg = reviewsByDeck.get(id)
    return {
      ...d,
      due_count: dueByDeck.get(id) ?? 0,
      new_count: newByDeck.get(id) ?? 0,
      retention_rate:
        agg && agg.total > 0 ? agg.passing / agg.total : Number(d.retention_rate ?? 0),
    }
  })
}

const categoryEnum = z.enum(['language', 'science', 'professional', 'humanities', 'personal'])

const createDeckSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: categoryEnum.default('personal'),
  is_public: z.boolean().optional(),
})

const updateDeckSchema = createDeckSchema.partial()

const listQuerySchema = z.object({
  search: z.string().optional(),
  category: categoryEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const { search, category, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (search) where.push({ field: 'name', operator: 'ilike', value: search })

    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const decks = await findMany<Record<string, unknown>>('decks', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    res.json(await withLiveCounts(userId, decks))
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const deck = await findById<Record<string, unknown>>('decks', idOf(req))
    if (!deck || deck.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const [withCounts] = await withLiveCounts(userId, [deck])
    res.json(withCounts)
  },
)

router.post(
  '/',
  enforceMaxDecks,
  validateBody(createDeckSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createDeckSchema>
    const result = await create('decks', {
      user_id: userId,
      name: body.name,
      description: body.description ?? '',
      category: body.category,
      is_public: body.is_public ?? false,
      card_count: 0,
      new_count: 0,
      review_count: 0,
      due_count: 0,
      retention_rate: 0,
      total_reviews: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDeckSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('decks', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('decks', id, updates)
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDeckSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('decks', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('decks', id, updates)
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('decks', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    await deleteMany('cards', [
      { field: 'deck_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('review_log', [
      { field: 'deck_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('decks', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
