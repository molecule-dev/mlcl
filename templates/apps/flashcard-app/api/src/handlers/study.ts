/**
 * Study (SM-2 spaced repetition) handlers.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * The SM-2 algorithm: quality 0-2 ⇒ reset (relearning, interval=1).
 * quality 3-5 ⇒ advance:
 *   reps=0: interval=1; reps=1: interval=6; reps≥2: interval = round(prev * EF).
 * EF' = max(1.3, EF + 0.1 - (5-q) * (0.08 + (5-q) * 0.02)).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const deckIdParamSchema = z.object({ deckId: z.string().min(1) })

const reviewSchema = z.object({
  card_id: z.string().min(1),
  quality: z.number().int().min(0).max(5),
})

interface CardRow {
  id: string
  user_id: string
  deck_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review: string
  state: string
}

router.get(
  '/deck/:deckId/due',
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
    // Authorize via owner-of-deck check.
    const deck = await findById<Record<string, unknown>>('decks', deckId)
    if (!deck || deck.user_id !== userId) {
      res.status(404).json({
        error: t('decks.notFound', undefined, { defaultValue: 'Deck not found.' }),
      })
      return
    }
    const now = new Date().toISOString()
    const where: WhereCondition[] = [
      { field: 'deck_id', operator: '=', value: deckId },
      { field: 'user_id', operator: '=', value: userId },
      { field: 'next_review', operator: '<=', value: now },
    ]
    const orderBy: OrderBy[] = [{ field: 'next_review', direction: 'asc' }]
    const dueCards = await findMany('cards', { where, orderBy, limit: 200 })
    res.json(dueCards)
  },
)

router.post(
  '/review',
  validateBody(reviewSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof reviewSchema>
    const cardId = body.card_id
    const quality = body.quality
    const card = await findById<CardRow>('cards', cardId)
    if (!card || card.user_id !== userId) {
      res.status(404).json({
        error: t('cards.notFound', undefined, { defaultValue: 'Card not found.' }),
      })
      return
    }

    let easeFactor = Number(card.ease_factor)
    let interval = Number(card.interval_days)
    let repetitions = Number(card.repetitions)
    let state: string

    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1
      } else if (repetitions === 1) {
        interval = 6
      } else {
        interval = Math.max(1, Math.round(interval * easeFactor))
      }
      repetitions += 1
      state = repetitions >= 2 ? 'review' : 'learning'
    } else {
      repetitions = 0
      interval = 1
      state = 'relearning'
    }

    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + interval)
    const now = new Date()

    const updated = await updateById('cards', cardId, {
      ease_factor: easeFactor,
      interval_days: interval,
      repetitions,
      state,
      next_review: nextReview,
      last_reviewed: now,
      total_reviews:
        (((card as unknown as Record<string, unknown>).total_reviews as number) ?? 0) + 1,
      lapses:
        quality < 3
          ? (((card as unknown as Record<string, unknown>).lapses as number) ?? 0) + 1
          : (((card as unknown as Record<string, unknown>).lapses as number) ?? 0),
      updated_at: now,
    })

    await create('review_log', {
      card_id: cardId,
      deck_id: card.deck_id,
      user_id: userId,
      quality,
      ease_factor: easeFactor,
      interval_days: interval,
      state,
      reviewed_at: now,
    })

    // Roll the review up onto the user's study streak. The card's SM-2 fields were updated but the
    // streak on user_profiles was never touched, so the "🔥 N day streak" (and the profile's
    // total_reviews) stayed frozen at 0 no matter how much the user studied. Advance the streak by
    // the calendar-day delta since the last study date: same day keeps it, yesterday extends it,
    // any larger gap resets to 1.
    const [profile] = await findMany<{
      current_streak?: number
      longest_streak?: number
      last_study_date?: string | Date | null
      total_reviews?: number
    }>('user_profiles', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (profile) {
      const fmtDay = (d: Date): string =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const todayStr = fmtDay(now)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = fmtDay(yesterday)
      const last = profile.last_study_date
      const lastStr = last ? (typeof last === 'string' ? last.slice(0, 10) : fmtDay(last)) : null
      const prev = Number(profile.current_streak ?? 0)
      const currentStreak = lastStr === todayStr ? prev : lastStr === yesterdayStr ? prev + 1 : 1
      await updateMany('user_profiles', [{ field: 'user_id', operator: '=', value: userId }], {
        current_streak: currentStreak,
        longest_streak: Math.max(Number(profile.longest_streak ?? 0), currentStreak),
        last_study_date: todayStr,
        total_reviews: Number(profile.total_reviews ?? 0) + 1,
        updated_at: now,
      })
    }

    res.json(updated.data)
  },
)

export default router
