/**
 * Stats handlers — books/month, pages/month, genre breakdown, rating
 * distribution. All reads are owner-scoped; aggregation happens in JS over
 * DataStore reads (cheap at flagship scale).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { type BookRow, formatLocalDate, parseGenres, type UserBookRow } from './_reading.js'

const router = Router()

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
})

async function loadYearData(
  userId: string,
  year: number,
): Promise<{
  mine: UserBookRow[]
  books: BookRow[]
  byId: Map<string, BookRow>
  finished: UserBookRow[]
}> {
  const mine = await findMany<UserBookRow>('user_books', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1000,
  })
  const books = await findMany<BookRow>('books', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1000,
  })
  const byId = new Map(books.map((b) => [b.id, b]))
  const inYear = mine.filter((r) => {
    if (!r.finished_at) return false
    const d = formatLocalDate(r.finished_at)
    return d >= `${year}-01-01` && d <= `${year}-12-31`
  })
  return { mine, books, byId, finished: inYear }
}

router.get(
  '/monthly',
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
    const { byId, finished } = await loadYearData(userId, year)

    const months = Array.from({ length: 12 }, (_, m) => ({
      month: m + 1,
      label: formatLocalDate(new Date(year, m, 1)).slice(0, 7),
      books: 0,
      pages: 0,
    }))
    for (const r of finished) {
      const m = Number(formatLocalDate(r.finished_at as string).slice(5, 7)) - 1
      months[m].books += 1
      const book = byId.get(r.book_id)
      months[m].pages += book ? Number(book.page_count) : 0
    }
    res.json({ year, months })
  },
)

router.get(
  '/genres',
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
    const { byId, finished } = await loadYearData(userId, year)

    const genreMap = new Map<string, { count: number; ratingSum: number; rated: number }>()
    for (const r of finished) {
      const book = byId.get(r.book_id)
      for (const g of book ? parseGenres(book.genres) : ['other']) {
        const entry = genreMap.get(g) ?? { count: 0, ratingSum: 0, rated: 0 }
        entry.count += 1
        if (r.rating != null) {
          entry.ratingSum += Number(r.rating)
          entry.rated += 1
        }
        genreMap.set(g, entry)
      }
    }
    const by_genre = Array.from(genreMap.entries())
      .map(([genre, v]) => ({
        genre,
        count: v.count,
        avg_rating: v.rated === 0 ? 0 : Math.round((v.ratingSum / v.rated) * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
    res.json({ year, by_genre })
  },
)

router.get(
  '/ratings',
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
    const { finished } = await loadYearData(userId, year)

    const distribution = [1, 2, 3, 4, 5].map((stars) => ({
      stars,
      count: finished.filter((r) => Number(r.rating) === stars).length,
    }))
    const rated = finished.filter((r) => r.rating != null)
    const average =
      rated.length === 0
        ? 0
        : Math.round((rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length) * 10) / 10
    res.json({ year, distribution, average, rated_count: rated.length })
  },
)

export default router
