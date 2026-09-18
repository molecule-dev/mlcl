/**
 * Card CRUD handlers.
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

const enforceMaxCards = enforceLimit<FlashcardAppLimits>({
  limitType: 'maxCards',
  getLimit: (limits) => limits.maxCards,
  getCurrent: async (userId) =>
    count('cards', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const stateEnum = z.enum(['new', 'learning', 'review', 'relearning'])

const createCardSchema = z.object({
  deck_id: z.string().min(1),
  front: z.string().min(1).max(8000),
  back: z.string().min(1).max(8000),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  image_url: z.string().url().nullable().optional(),
})

const updateCardSchema = z.object({
  front: z.string().min(1).max(8000).optional(),
  back: z.string().min(1).max(8000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  image_url: z.string().url().nullable().optional(),
  state: stateEnum.optional(),
})

const listQuerySchema = z.object({
  deck_id: z.string().min(1).optional(),
  state: stateEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const deckIdParamSchema = z.object({ deckId: z.string().min(1) })

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
    const q = req.query as z.infer<typeof listQuerySchema>
    const deckId = q.deck_id
    const stateFilter = q.state
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (deckId) where.push({ field: 'deck_id', operator: '=', value: deckId })
    if (stateFilter) where.push({ field: 'state', operator: '=', value: stateFilter })

    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const cards = await findMany('cards', {
      where,
      orderBy,
      limit: q.limit ?? 200,
      offset: q.offset ?? 0,
    })
    res.json(cards)
  },
)

router.get(
  '/deck/:deckId',
  validateParams(deckIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const deckId = String(req.params.deckId)
    // Ensure user owns the deck before exposing cards.
    const deck = await findById<Record<string, unknown>>('decks', deckId)
    if (!deck || deck.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const where: WhereCondition[] = [
      { field: 'deck_id', operator: '=', value: deckId },
      { field: 'user_id', operator: '=', value: userId },
    ]
    const cards = await findMany('cards', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(cards)
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
    const card = await findById<Record<string, unknown>>('cards', idOf(req))
    if (!card || card.user_id !== userId) {
      res.status(404).json({
        error: t('cards.notFound', undefined, { defaultValue: 'Card not found.' }),
      })
      return
    }
    res.json(card)
  },
)

router.post(
  '/',
  enforceMaxCards,
  validateBody(createCardSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createCardSchema>
    // Ensure deck exists and belongs to the user.
    const deck = await findById<Record<string, unknown>>('decks', body.deck_id)
    if (!deck || deck.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const result = await create('cards', {
      deck_id: body.deck_id,
      user_id: userId,
      front: body.front,
      back: body.back,
      tags: JSON.stringify(body.tags ?? []),
      image_url: body.image_url ?? null,
      state: 'new',
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      next_review: new Date(),
      total_reviews: 0,
      lapses: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    // Bump deck counters.
    await updateById('decks', body.deck_id, {
      card_count: ((deck.card_count as number) ?? 0) + 1,
      new_count: ((deck.new_count as number) ?? 0) + 1,
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCardSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('cards', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('cards.notFound', undefined, { defaultValue: 'Card not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.tags !== undefined) {
      incoming.tags = JSON.stringify(incoming.tags)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('cards', id, updates)
    res.json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCardSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('cards', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('cards.notFound', undefined, { defaultValue: 'Card not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.tags !== undefined) {
      incoming.tags = JSON.stringify(incoming.tags)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('cards', id, updates)
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
    const existing = await findById<Record<string, unknown>>('cards', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('cards.notFound', undefined, { defaultValue: 'Card not found.' }),
      })
      return
    }
    const deckId = existing.deck_id as string
    await deleteMany('review_log', [
      { field: 'card_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('cards', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    // Decrement deck counter (if deck still exists).
    const deck = await findById<Record<string, unknown>>('decks', deckId)
    if (deck && deck.user_id === userId) {
      await updateById('decks', deckId, {
        card_count: Math.max(0, ((deck.card_count as number) ?? 0) - 1),
        updated_at: new Date(),
      })
    }
    res.status(204).end()
  },
)

export default router
