/**
 * Yearly reading challenge — set the book-count goal, read the pace snapshot.
 *
 * A user has at most one challenge row per year (UNIQUE user_id, year).
 * Progress counts finished books (shelf 'read') with a finished_at inside
 * the challenge year, so un-finishing a book immediately reflects.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { computeChallengeProgress } from './_reading.js'

const router = Router()

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
})

const upsertSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  goal_books: z.number().int().min(1).max(365),
})

router.get(
  '/',
  validateQuery(yearQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const year = (req.query as z.infer<typeof yearQuerySchema>).year ?? new Date().getFullYear()
    const challenge = await findOne<{ id: string; goal_books: number }>('reading_challenges', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'year', operator: '=', value: year },
    ])
    // Books finished in the challenge year.
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    const booksRead = await count('user_books', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'shelf', operator: '=', value: 'read' },
      { field: 'finished_at', operator: '>=', value: start },
      { field: 'finished_at', operator: '<=', value: end },
    ])
    res.json(computeChallengeProgress(year, challenge?.goal_books ?? 0, Number(booksRead)))
  },
)

router.put('/', validateBody(upsertSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const { year, goal_books } = req.body as z.infer<typeof upsertSchema>
  const existing = await findOne<{ id: string; goal_books: number }>('reading_challenges', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'year', operator: '=', value: year },
  ])
  if (existing) {
    await updateById('reading_challenges', existing.id, {
      goal_books,
      updated_at: new Date(),
    })
  } else {
    await create('reading_challenges', {
      user_id: userId,
      year,
      goal_books,
      created_at: new Date(),
      updated_at: new Date(),
    })
  }
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  const booksRead = await count('user_books', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'shelf', operator: '=', value: 'read' },
    { field: 'finished_at', operator: '>=', value: start },
    { field: 'finished_at', operator: '<=', value: end },
  ])
  res.json(computeChallengeProgress(year, goal_books, Number(booksRead)))
})

export default router
