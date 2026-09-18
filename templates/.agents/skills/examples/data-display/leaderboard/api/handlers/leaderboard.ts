import { Router } from 'express'
import { z } from 'zod'

import { findMany } from '@molecule/api-database'
import { getLeaderboard, recordMetric } from '@molecule/api-leaderboard'

const router = Router()

/**
 * GET /leaderboard — top entries for a metric/window, with display names resolved.
 * `@molecule/api-leaderboard` returns ranked `{ user_id, rank, score }`; we join the
 * users table to show names. Change `window` to 'daily' / 'monthly' / 'all-time' (or
 * read it from the query) as your product needs.
 */
router.get('/leaderboard', async (_req, res) => {
  const entries = await getLeaderboard({ metric: 'xp', window: 'weekly', limit: 20 })
  if (entries.length === 0) {
    res.json([])
    return
  }

  // Resolve user_id -> display name in ONE query (operator 'in') — never a per-row lookup.
  const users = (await findMany('users', {
    where: [{ field: 'id', operator: 'in', value: entries.map((e) => e.user_id) }],
  })) as { id: string; name?: string; email: string }[]
  const nameById = new Map(users.map((u) => [u.id, u.name ?? u.email]))

  res.json(
    entries.map((e) => ({
      userId: e.user_id,
      rank: e.rank,
      score: e.score,
      name: nameById.get(e.user_id) ?? e.user_id,
    })),
  )
})

/**
 * POST /leaderboard/record — award points. Server-authoritative: the subject is the
 * AUTHENTICATED user (never a client-sent id), and this belongs behind the action that
 * actually earns the points (finishing a lesson, a sale) — not an open endpoint anyone
 * can spam to inflate their rank.
 */
const recordSchema = z.object({ metric: z.string().default('xp'), amount: z.number().positive() })
router.post('/leaderboard/record', async (req, res) => {
  const userId = res.locals.session?.userId as string | undefined
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const parsed = recordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid amount' })
    return
  }
  await recordMetric(userId, parsed.data.metric, parsed.data.amount)
  res.status(204).end()
})

export default router
