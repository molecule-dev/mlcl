/**
 * Reviews feed — the user's written reviews, newest first.
 *
 * Joins user_books (rating/review set) with their books in JS over two
 * owner-scoped reads; no raw SQL.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { type BookRow, parseGenres, type UserBookRow } from './_reading.js'

const router = Router()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
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
    const { limit } = req.query as z.infer<typeof listQuerySchema>

    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const mine = await findMany<UserBookRow>('user_books', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy,
      limit: 500,
    })
    const reviewed = mine.filter((r) => (r.review ?? '').length > 0)
    if (reviewed.length === 0) {
      res.json([])
      return
    }

    const books = await findMany<BookRow>('books', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 500,
    })
    const byId = new Map(books.map((b) => [b.id, b]))

    res.json(
      reviewed
        .map((r) => {
          const book = byId.get(r.book_id)
          if (!book) return null
          return {
            id: r.id,
            book_id: book.id,
            title: book.title,
            author: book.author,
            cover_style: book.cover_style,
            genres: parseGenres(book.genres),
            page_count: Number(book.page_count),
            rating: r.rating,
            review: r.review,
            shelf: r.shelf,
            started_at: r.started_at,
            finished_at: r.finished_at,
            updated_at: r.updated_at,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .slice(0, limit ?? 50),
    )
  },
)

export default router
