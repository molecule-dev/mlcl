/**
 * Book CRUD + shelf/progress/review handlers — the core of the tracker.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * Shelf lifecycle (the signature flow):
 *   POST /            → create book (optionally shelved straight away)
 *   POST /:id/shelve  → want_to_read | reading | read | dnf
 *   POST /:id/progress→ set current page (logs a reading session; auto-finishes)
 *   POST /:id/finish  → mark read (+ optional rating/review)
 *   PATCH /:id/review → rate/review a shelved book
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteMany,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { BookTrackerLimits } from '../tiers.js'
import { type BookRow, formatLocalDate, parseGenres, type UserBookRow } from './_reading.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxBooks = enforceLimit<BookTrackerLimits>({
  limitType: 'maxBooks',
  getLimit: (limits) => limits.maxBooks,
  getCurrent: async (userId) =>
    count('books', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const shelfEnum = z.enum(['want_to_read', 'reading', 'read', 'dnf'])

const createBookSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(300),
  page_count: z.number().int().min(1).max(20_000).optional(),
  genres: z.array(z.string().min(1).max(64)).max(10).optional(),
  cover_style: z.string().max(32).optional(),
  description: z.string().max(4000).nullable().optional(),
  shelf: shelfEnum.optional(),
})

const updateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  author: z.string().min(1).max(300).optional(),
  page_count: z.number().int().min(1).max(20_000).optional(),
  genres: z.array(z.string().min(1).max(64)).max(10).optional(),
  cover_style: z.string().max(32).optional(),
  description: z.string().max(4000).nullable().optional(),
})

const listQuerySchema = z.object({
  shelf: shelfEnum.optional(),
  q: z.string().max(200).optional(),
  genre: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

/** Load the requesting user's shelf row for a book (null when unshelved). */
async function getMyUserBook(userId: string, bookId: string): Promise<UserBookRow | null> {
  return findOne<UserBookRow>('user_books', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'book_id', operator: '=', value: bookId },
  ])
}

/** Load an owned book or null (wrong owner counts as not found — no IDOR). */
async function getOwnedBook(userId: string, bookId: string): Promise<BookRow | null> {
  const book = await findById<BookRow>('books', bookId)
  if (!book || book.user_id !== userId) return null
  return book
}

/** A book serialized with the user's shelf state merged under `my`. */
export interface MergedBook extends Omit<BookRow, 'genres'> {
  genres: string[]
  my: {
    id: string
    shelf: string
    current_page: number
    started_at: string | null
    finished_at: string | null
    rating: number | null
    review: string | null
    percent: number
  } | null
}

/** Serialize book + shelf row into the merged shape the frontend consumes. */
function merged(book: BookRow, my: UserBookRow | null): MergedBook {
  const page_count = Number(book.page_count)
  const current_page = my ? Number(my.current_page) : 0
  const percent = page_count > 0 ? Math.min(100, Math.round((current_page / page_count) * 100)) : 0
  return {
    ...book,
    genres: parseGenres(book.genres),
    my: my
      ? {
          id: my.id,
          shelf: my.shelf,
          current_page,
          started_at: my.started_at,
          finished_at: my.finished_at,
          rating: my.rating,
          review: my.review,
          percent,
        }
      : null,
  }
}

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
    const { shelf, q, genre, limit, offset } = req.query as z.infer<typeof listQuerySchema>

    // Books the user owns, newest first — filtering happens in JS (cheap at
    // flagship scale) so search/shelf/genre compose without raw SQL.
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const books = await findMany<BookRow>('books', { where, orderBy, limit: 500 })

    const myRows = await findMany<UserBookRow>('user_books', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const myByBook = new Map(myRows.map((r) => [r.book_id, r]))

    const needle = (q ?? '').trim().toLowerCase()
    const rows = books
      .map((b) => merged(b, myByBook.get(b.id) ?? null))
      .filter((b) => {
        if (shelf && b.my?.shelf !== shelf) return false
        if (genre && !b.genres.includes(genre)) return false
        if (needle) {
          const hay = `${b.title} ${b.author}`.toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })

    res.json(rows.slice(offset ?? 0, (offset ?? 0) + (limit ?? 100)))
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
    const book = await getOwnedBook(userId, idOf(req))
    if (!book) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const my = await getMyUserBook(userId, book.id)
    res.json(merged(book, my))
  },
)

router.post(
  '/',
  enforceMaxBooks,
  validateBody(createBookSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createBookSchema>
    const result = await create('books', {
      user_id: userId,
      title: body.title,
      author: body.author,
      page_count: body.page_count ?? 250,
      // Stringify so pg writes a JSON value rather than coercing the JS
      // array into a Postgres array literal (the column is JSONB).
      genres: JSON.stringify(body.genres ?? []),
      cover_style: body.cover_style ?? 'teal',
      description: body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const bookId = (result.data as { id: string } | null)?.id
    let my: UserBookRow | null = null
    if (bookId && body.shelf) {
      const today = formatLocalDate(new Date())
      const shelfRow = await create('user_books', {
        user_id: userId,
        book_id: bookId,
        shelf: body.shelf,
        current_page: body.shelf === 'read' ? (body.page_count ?? 250) : 0,
        started_at: body.shelf === 'reading' || body.shelf === 'read' ? today : null,
        finished_at: body.shelf === 'read' ? today : null,
        rating: null,
        review: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      my = (shelfRow.data as UserBookRow | null) ?? null
    }
    const book = bookId ? await findById<BookRow>('books', bookId) : null
    res.status(201).json(book ? merged(book, my) : result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateBookSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await getOwnedBook(userId, id)
    if (!existing) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.genres !== undefined) {
      // JSONB column — pg would otherwise serialize a JS array as a
      // postgres array literal and fail with "invalid input syntax for type json".
      incoming.genres = JSON.stringify(incoming.genres)
    }
    const result = await updateById('books', id, { ...incoming, updated_at: new Date() })
    const my = await getMyUserBook(userId, id)
    const book = (result.data as BookRow | null) ?? (await findById<BookRow>('books', id))
    res.json(book ? merged(book, my) : result.data)
  },
)

/** Move a book to a shelf (upserts the user_books row). */
router.post(
  '/:id/shelve',
  validateParams(idParamSchema),
  validateBody(z.object({ shelf: shelfEnum })),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const book = await getOwnedBook(userId, id)
    if (!book) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const { shelf } = req.body as { shelf: z.infer<typeof shelfEnum> }
    const today = formatLocalDate(new Date())
    const existing = await getMyUserBook(userId, id)

    const updates: Record<string, unknown> = { shelf, updated_at: new Date() }
    if (shelf === 'reading') {
      if (!existing?.started_at) updates.started_at = today
      updates.finished_at = null
    } else if (shelf === 'read') {
      updates.current_page = Number(book.page_count)
      if (!existing?.started_at) updates.started_at = today
      updates.finished_at = existing?.finished_at ?? today
    } else {
      // want_to_read / dnf reset reading state but keep rating/review.
      updates.current_page = 0
      updates.started_at = null
      updates.finished_at = null
    }

    if (existing) {
      await updateById('user_books', existing.id, updates)
    } else {
      await create('user_books', {
        user_id: userId,
        book_id: id,
        created_at: new Date(),
        ...updates,
      })
    }
    const my = await getMyUserBook(userId, id)
    res.json(merged(book, my))
  },
)

/**
 * Update reading progress. Sets the current page, logs a reading session for
 * the delta (plus optional minutes), and auto-finishes the book when the
 * page count is reached. Returns the merged book + the session row.
 */
router.post(
  '/:id/progress',
  validateParams(idParamSchema),
  validateBody(
    z.object({
      current_page: z.number().int().min(0).max(20_000),
      minutes: z.number().int().min(0).max(1440).optional(),
      note: z.string().max(2000).optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const book = await getOwnedBook(userId, id)
    if (!book) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const body = req.body as { current_page: number; minutes?: number; note?: string }
    const pageCount = Number(book.page_count)
    const targetPage = Math.min(body.current_page, pageCount)
    const today = formatLocalDate(new Date())

    // Ensure a shelf row exists — logging progress implies reading. The row
    // is re-read after creation so `my` below is always the persisted state.
    let my = await getMyUserBook(userId, id)
    if (!my) {
      await create('user_books', {
        user_id: userId,
        book_id: id,
        shelf: 'reading',
        current_page: 0,
        started_at: today,
        finished_at: null,
        rating: null,
        review: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      my = await getMyUserBook(userId, id)
    }

    const previousPage = my ? Number(my.current_page) : 0
    const pagesRead = Math.max(0, targetPage - previousPage)
    const finished = targetPage >= pageCount

    const updates: Record<string, unknown> = {
      current_page: targetPage,
      updated_at: new Date(),
    }
    if (my?.shelf !== 'read') {
      updates.shelf = finished ? 'read' : 'reading'
      if (!my?.started_at) updates.started_at = today
      if (finished) updates.finished_at = today
    }
    if (my) await updateById('user_books', my.id, updates)

    const session =
      pagesRead > 0 || (body.minutes ?? 0) > 0
        ? await create('reading_sessions', {
            user_book_id: my?.id,
            user_id: userId,
            date: today,
            minutes: body.minutes ?? 0,
            pages_read: pagesRead,
            note: body.note ?? null,
            created_at: new Date(),
            updated_at: new Date(),
          })
        : null

    const refreshedBook = await findById<BookRow>('books', id)
    const refreshedMy = await getMyUserBook(userId, id)
    res.json({
      book: refreshedBook ? merged(refreshedBook, refreshedMy) : null,
      session: (session?.data as Record<string, unknown> | null) ?? null,
    })
  },
)

/** Mark a book finished (with optional rating/review) or un-finish it. */
router.post(
  '/:id/finish',
  validateParams(idParamSchema),
  validateBody(
    z.object({
      rating: z.number().int().min(1).max(5).optional(),
      review: z.string().max(10_000).optional(),
      finished: z.boolean().optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const book = await getOwnedBook(userId, id)
    if (!book) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const body = req.body as { rating?: number; review?: string; finished?: boolean }
    const finishing = body.finished !== false
    const today = formatLocalDate(new Date())

    const my = await getMyUserBook(userId, id)
    if (!my) {
      // No shelf row yet — create one in the target state; the response
      // below re-reads it fresh.
      await create('user_books', {
        user_id: userId,
        book_id: id,
        shelf: finishing ? 'read' : 'reading',
        current_page: finishing ? Number(book.page_count) : 0,
        started_at: today,
        finished_at: finishing ? today : null,
        rating: body.rating ?? null,
        review: body.review ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
    } else {
      const updates: Record<string, unknown> = {
        shelf: finishing ? 'read' : 'reading',
        updated_at: new Date(),
      }
      if (finishing) {
        updates.current_page = Number(book.page_count)
        if (!my.started_at) updates.started_at = today
        updates.finished_at = my.finished_at ?? today
      } else {
        updates.finished_at = null
      }
      if (body.rating !== undefined) updates.rating = body.rating
      if (body.review !== undefined) updates.review = body.review
      await updateById('user_books', my.id, updates)
    }
    const refreshedMy = await getMyUserBook(userId, id)
    res.json(merged(book, refreshedMy))
  },
)

/** Rate/review a shelved book without changing its shelf. */
router.patch(
  '/:id/review',
  validateParams(idParamSchema),
  validateBody(
    z.object({
      rating: z.number().int().min(1).max(5).nullable().optional(),
      review: z.string().max(10_000).nullable().optional(),
    }),
  ),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const book = await getOwnedBook(userId, id)
    if (!book) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const body = req.body as { rating?: number | null; review?: string | null }
    const existing = await getMyUserBook(userId, id)
    if (!existing) {
      res.status(409).json({
        error: t('books.reviewNotShelved', undefined, {
          defaultValue: 'Shelve the book before rating or reviewing it.',
        }),
      })
      return
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.rating !== undefined) updates.rating = body.rating
    if (body.review !== undefined) updates.review = body.review
    await updateById('user_books', existing.id, updates)
    const refreshedMy = await getMyUserBook(userId, id)
    res.json(merged(book, refreshedMy))
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
    const existing = await getOwnedBook(userId, id)
    if (!existing) {
      res.status(404).json({
        error: t('books.notFound', undefined, { defaultValue: 'Book not found.' }),
      })
      return
    }
    const my = await getMyUserBook(userId, id)
    if (my) {
      await deleteMany('reading_sessions', [{ field: 'user_book_id', operator: '=', value: my.id }])
      await deleteMany('user_books', [
        { field: 'id', operator: '=', value: my.id },
        { field: 'user_id', operator: '=', value: userId },
      ])
    }
    await deleteMany('books', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
