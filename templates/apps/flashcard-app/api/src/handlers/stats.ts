/**
 * Stats / reporting handlers.
 *
 * - All reads scope by the requesting user — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const heatmapQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

const deckIdParamSchema = z.object({ deckId: z.string().min(1) })

router.get('/me', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const totalCards = await count('cards', [{ field: 'user_id', operator: '=', value: userId }])
  const totalDecks = await count('decks', [{ field: 'user_id', operator: '=', value: userId }])
  const totalReviews = await count('review_log', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const profileMatches = await findMany<Record<string, unknown>>('user_profiles', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  const profile = profileMatches[0] ?? null
  res.json({
    totalCards,
    totalDecks,
    totalReviews,
    currentStreak: (profile?.current_streak as number) ?? 0,
    longestStreak: (profile?.longest_streak as number) ?? 0,
    dailyGoal: (profile?.daily_goal as number) ?? 20,
  })
})

router.get(
  '/heatmap',
  validateQuery(heatmapQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { from, to } = req.query as z.infer<typeof heatmapQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (from) where.push({ field: 'reviewed_at', operator: '>=', value: from })
    if (to) where.push({ field: 'reviewed_at', operator: '<=', value: to })
    const orderBy: OrderBy[] = [{ field: 'reviewed_at', direction: 'desc' }]
    const reviews = await findMany<Record<string, unknown>>('review_log', {
      where,
      orderBy,
      limit: 5000,
    })
    res.json(reviews)
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
    const deck = await findById<Record<string, unknown>>('decks', deckId)
    if (!deck || deck.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const reviews = await findMany<Record<string, unknown>>('review_log', {
      where: [
        { field: 'deck_id', operator: '=', value: deckId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'reviewed_at', direction: 'desc' }],
      limit: 1000,
    })
    res.json({
      deck,
      reviews,
      reviewCount: reviews.length,
    })
  },
)

export default router
