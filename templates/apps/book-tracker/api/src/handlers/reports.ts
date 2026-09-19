/**
 * Reports handler — dashboard aggregates.
 *
 * Two endpoints feed the frontend (all reads owner-scoped via the JWT
 * session, aggregation done in JS over DataStore reads):
 *   - GET /api/reports/today    — Dashboard "today" hero data (currently
 *                                 reading, minutes/pages today, challenge
 *                                 snapshot)
 *   - GET /api/reports/overview — totals, recent activity, 12-week reading
 *                                 trend, by-shelf counts
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { count, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  type BookRow,
  computeChallengeProgress,
  formatLocalDate,
  parseGenres,
  type SessionRow,
  type UserBookRow,
} from './_reading.js'

const router = Router()

function pickMotivational(readingCount: number, finishedThisYear: number, goal: number): string {
  if (readingCount === 0 && finishedThisYear === 0) return 'Add a book and start page one today.'
  if (readingCount > 0) return 'A few pages a day keeps the to-read pile honest.'
  if (goal > 0 && finishedThisYear >= goal) return 'Challenge complete. Set the bar higher.'
  if (finishedThisYear > 0) return 'One more chapter and the shelf grows.'
  return 'The next book is already waiting on your shelf.'
}

router.get('/today', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const mine = await findMany<UserBookRow>('user_books', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'shelf', operator: '=', value: 'reading' },
    ],
    limit: 100,
  })

  const books = mine.length
    ? await findMany<BookRow>('books', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        limit: 500,
      })
    : []
  const byId = new Map(books.map((b) => [b.id, b]))

  const currently_reading = mine
    .map((r) => {
      const book = byId.get(r.book_id)
      if (!book) return null
      const pageCount = Number(book.page_count)
      const current = Number(r.current_page)
      return {
        user_book_id: r.id,
        book_id: book.id,
        title: book.title,
        author: book.author,
        cover_style: book.cover_style,
        page_count: pageCount,
        current_page: current,
        percent: pageCount > 0 ? Math.min(100, Math.round((current / pageCount) * 100)) : 0,
        started_at: r.started_at,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const todayStr = formatLocalDate(new Date())
  const sessionsToday = await findMany<SessionRow>('reading_sessions', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '=', value: todayStr },
    ],
    limit: 100,
  })
  const minutes_today = sessionsToday.reduce((sum, s) => sum + Number(s.minutes), 0)
  const pages_today = sessionsToday.reduce((sum, s) => sum + Number(s.pages_read), 0)

  const year = new Date().getFullYear()
  const challenge = await findOne<{ goal_books: number }>('reading_challenges', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'year', operator: '=', value: year },
  ])
  const booksThisYear = await count('user_books', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'shelf', operator: '=', value: 'read' },
    { field: 'finished_at', operator: '>=', value: `${year}-01-01` },
    { field: 'finished_at', operator: '<=', value: `${year}-12-31` },
  ])
  const challenge_snapshot = computeChallengeProgress(
    year,
    challenge?.goal_books ?? 0,
    Number(booksThisYear),
  )

  res.json({
    date: todayStr,
    currently_reading,
    minutes_today,
    pages_today,
    challenge: challenge_snapshot,
    motivational_message: pickMotivational(
      currently_reading.length,
      Number(booksThisYear),
      challenge?.goal_books ?? 0,
    ),
  })
})

router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const mine = await findMany<UserBookRow>('user_books', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }] satisfies OrderBy[],
    limit: 500,
  })
  const books = await findMany<BookRow>('books', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 500,
  })
  const byId = new Map(books.map((b) => [b.id, b]))

  const shelves = { want_to_read: 0, reading: 0, read: 0, dnf: 0 } as Record<string, number>
  for (const r of mine) shelves[r.shelf] = (shelves[r.shelf] ?? 0) + 1

  const finished = mine.filter((r) => r.finished_at)
  const rated = finished.filter((r) => r.rating != null)
  const avg_rating =
    rated.length === 0
      ? 0
      : Math.round((rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length) * 10) / 10

  const totalPages = finished.reduce((sum, r) => {
    const book = byId.get(r.book_id)
    return sum + (book ? Number(book.page_count) : 0)
  }, 0)

  // 12-week reading trend: pages read per week bucket.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 7 * 12 + 1)
  const sessions = mine.length
    ? await findMany<SessionRow>('reading_sessions', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'date', operator: '>=', value: formatLocalDate(start) },
          { field: 'date', operator: '<=', value: formatLocalDate(today) },
        ],
        limit: 5000,
      })
    : []
  const weekly_pages: Array<{ week: string; pages: number }> = []
  for (let i = 0; i < 12; i++) {
    const bucketStart = new Date(start)
    bucketStart.setDate(bucketStart.getDate() + i * 7)
    const bucketEnd = new Date(bucketStart)
    bucketEnd.setDate(bucketEnd.getDate() + 6)
    const weekKey = formatLocalDate(bucketStart)
    const inBucket = sessions.filter((s) => {
      const d = formatLocalDate(s.date)
      return d >= formatLocalDate(bucketStart) && d <= formatLocalDate(bucketEnd)
    })
    weekly_pages.push({
      week: weekKey,
      pages: inBucket.reduce((sum, s) => sum + Number(s.pages_read), 0),
    })
  }

  // Recent activity — the 8 most recently touched shelf rows, annotated
  // with the book + a short label the dashboard renders verbatim.
  const recent = mine.slice(0, 8).map((r) => {
    const book = byId.get(r.book_id)
    return {
      user_book_id: r.id,
      book_id: r.book_id,
      title: book?.title ?? '',
      author: book?.author ?? '',
      shelf: r.shelf,
      rating: r.rating,
      finished_at: r.finished_at,
      updated_at: r.updated_at,
    }
  })

  const year = new Date().getFullYear()
  const finished_this_year = finished.filter(
    (r) => r.finished_at && formatLocalDate(r.finished_at) >= `${year}-01-01`,
  ).length

  // By-genre breakdown over finished books.
  const genreMap = new Map<string, number>()
  for (const r of finished) {
    const book = byId.get(r.book_id)
    for (const g of book ? parseGenres(book.genres) : []) {
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1)
    }
  }
  const by_genre = Array.from(genreMap.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)

  res.json({
    total_books: books.length,
    shelved_books: mine.length,
    by_shelf: shelves,
    finished_books: finished.length,
    finished_this_year,
    pages_read: totalPages,
    avg_rating,
    weekly_pages,
    by_genre,
    recent,
  })
})

export default router
