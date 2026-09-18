/**
 * Flashcard deck CRUD handlers — list/create/read/update/delete decks
 * and the flashcards within them. Each row is scoped by `user_id`.
 *
 * - DataStore via @molecule/api-database (no raw SQL).
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const createDeckSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  topic_id: z.string().optional(),
})

const updateDeckSchema = createDeckSchema.partial()

const listQuerySchema = z.object({
  topic_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createCardSchema = z.object({
  front_md: z.string().min(1).max(4000),
  back_md: z.string().min(1).max(4000),
  hint: z.string().max(1000).optional(),
  position: z.coerce.number().int().min(0).optional(),
})

const updateCardSchema = createCardSchema.partial()

const reviewCardSchema = z.object({
  rating: z.enum(['again', 'good', 'easy']),
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
    const q = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.topic_id) where.push({ field: 'topic_id', operator: '=', value: q.topic_id })
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const decks = await findMany('flashcard_decks', {
      where,
      orderBy,
      limit: q.limit ?? 100,
      offset: q.offset ?? 0,
    })

    const enriched = await Promise.all(
      (decks as Array<Record<string, unknown>>).map(async (d) => {
        const deckId = d.id as string
        const cards = (await findMany<{ id: string; due_at: string; ease_factor: number }>(
          'flashcards',
          {
            where: [{ field: 'deck_id', operator: '=', value: deckId }],
          },
        )) as Array<{ id: string; due_at: string; ease_factor: number }>
        const now = new Date()
        const dueCount = cards.filter((c) => new Date(c.due_at) <= now).length
        const totalCards = cards.length
        const learnedCards = cards.filter((c) => Number(c.ease_factor ?? 0) >= 2.5).length
        const masteryPct =
          totalCards === 0 ? 0 : Math.min(100, Math.round((learnedCards / totalCards) * 100))
        return {
          ...d,
          card_count: totalCards,
          due_count: dueCount,
          mastery_pct: masteryPct,
        }
      }),
    )

    res.json(enriched)
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
    const deckId = idOf(req)
    const deck = await findById<Record<string, unknown>>('flashcard_decks', deckId)
    if (!deck || deck.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }) })
      return
    }
    const cards = await findMany('flashcards', {
      where: [{ field: 'deck_id', operator: '=', value: deckId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...deck, cards })
  },
)

router.post(
  '/',
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
    const result = await create('flashcard_decks', {
      user_id: userId,
      topic_id: body.topic_id ?? null,
      name: body.name,
      description: body.description ?? '',
      card_count: 0,
      last_reviewed_at: null,
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
    const existing = await findById<Record<string, unknown>>('flashcard_decks', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }) })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('flashcard_decks', id, updates)
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
    const existing = await findById<Record<string, unknown>>('flashcard_decks', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }) })
      return
    }
    await deleteMany('flashcards', [
      { field: 'deck_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('flashcard_decks', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

router.get(
  '/:id/cards',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const deckId = idOf(req)
    const deck = await findById<Record<string, unknown>>('flashcard_decks', deckId)
    if (!deck || deck.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }) })
      return
    }
    const cards = await findMany('flashcards', {
      where: [{ field: 'deck_id', operator: '=', value: deckId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(cards)
  },
)

router.post(
  '/:id/cards',
  validateParams(idParamSchema),
  validateBody(createCardSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const deckId = idOf(req)
    const deck = await findById<Record<string, unknown>>('flashcard_decks', deckId)
    if (!deck || deck.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }) })
      return
    }
    const body = req.body as z.infer<typeof createCardSchema>
    const cardCount = await count('flashcards', [
      { field: 'deck_id', operator: '=', value: deckId },
    ])
    const result = await create('flashcards', {
      deck_id: deckId,
      user_id: userId,
      front_md: body.front_md,
      back_md: body.back_md,
      hint: body.hint ?? null,
      ease_factor: 2.5,
      interval_days: 0,
      due_at: new Date(),
      position: body.position ?? cardCount,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await updateById('flashcard_decks', deckId, {
      card_count: cardCount + 1,
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id/cards/:cardId',
  validateParams(z.object({ id: z.string().min(1), cardId: z.string().min(1) })),
  validateBody(updateCardSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const cardId = String(req.params.cardId)
    const card = await findById<Record<string, unknown>>('flashcards', cardId)
    if (!card || card.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.cardNotFound', undefined, { defaultValue: 'Card not found.' }) })
      return
    }
    const result = await updateById('flashcards', cardId, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

router.delete(
  '/:id/cards/:cardId',
  validateParams(z.object({ id: z.string().min(1), cardId: z.string().min(1) })),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const cardId = String(req.params.cardId)
    const card = await findById<Record<string, unknown>>('flashcards', cardId)
    if (!card || card.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.cardNotFound', undefined, { defaultValue: 'Card not found.' }) })
      return
    }
    await deleteMany('flashcards', [
      { field: 'id', operator: '=', value: cardId },
      { field: 'user_id', operator: '=', value: userId },
    ])
    // Keep the denormalized card_count in sync — the create path recomputes it from a
    // count, so recount after delete (otherwise the stored count drifts upward as cards are
    // removed). The deck-list view recomputes live, but the stored value feeds single-deck
    // reads / dashboards.
    const remaining = await count('flashcards', [
      { field: 'deck_id', operator: '=', value: String(card.deck_id) },
    ])
    await updateById('flashcard_decks', String(card.deck_id), {
      card_count: remaining,
      updated_at: new Date(),
    })
    res.status(204).end()
  },
)

router.post(
  '/:id/cards/:cardId/review',
  validateParams(z.object({ id: z.string().min(1), cardId: z.string().min(1) })),
  validateBody(reviewCardSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const cardId = String(req.params.cardId)
    const card = await findById<Record<string, unknown>>('flashcards', cardId)
    if (!card || card.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('decks.cardNotFound', undefined, { defaultValue: 'Card not found.' }) })
      return
    }
    const { rating } = req.body as z.infer<typeof reviewCardSchema>
    await create('flashcard_reviews', {
      flashcard_id: cardId,
      user_id: userId,
      rating,
      reviewed_at: new Date(),
    })
    // Simple SM-2-like adjustment.
    const ease = Number(card.ease_factor ?? 2.5)
    const interval = Number(card.interval_days ?? 0)
    let nextEase = ease
    let nextInterval: number
    if (rating === 'again') {
      nextInterval = 1
      nextEase = Math.max(1.3, ease - 0.2)
    } else if (rating === 'good') {
      nextInterval = Math.max(1, Math.round(interval * ease)) || 2
    } else {
      // rating === 'easy'
      nextInterval = Math.max(1, Math.round(interval * ease * 1.3)) || 4
      nextEase = ease + 0.15
    }
    const dueAt = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000)
    const updated = await updateById('flashcards', cardId, {
      ease_factor: nextEase,
      interval_days: nextInterval,
      due_at: dueAt,
      updated_at: new Date(),
    })
    await updateById('flashcard_decks', card.deck_id as string, {
      last_reviewed_at: new Date(),
      updated_at: new Date(),
    })
    res.json(updated.data)
  },
)

export default router
