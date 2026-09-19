/**
 * Reading-session history — the per-book log written by POST /books/:id/progress.
 *
 * All reads/writes are owner-scoped via `user_id`; querying another user's
 * user_book yields an empty list (never their rows).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import type { SessionRow } from './_reading.js'

const router = Router()

const listQuerySchema = z.object({
  user_book_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
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
    const { user_book_id, limit } = req.query as unknown as z.infer<typeof listQuerySchema>

    // Ownership: the shelf row must belong to the requester.
    const my = await findOne<{ id: string }>('user_books', [
      { field: 'id', operator: '=', value: user_book_id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!my) {
      res.json([])
      return
    }

    const orderBy: OrderBy[] = [
      { field: 'date', direction: 'desc' },
      { field: 'created_at', direction: 'desc' },
    ]
    const sessions = await findMany<SessionRow>('reading_sessions', {
      where: [{ field: 'user_book_id', operator: '=', value: user_book_id }],
      orderBy,
      limit: limit ?? 50,
    })
    res.json(sessions)
  },
)

export default router
