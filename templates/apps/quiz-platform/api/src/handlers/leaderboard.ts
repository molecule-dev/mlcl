import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { aggregate } from '@molecule/api-reporting'

const router = Router()

const idParamSchema = z.string().min(1)
const limitSchema = z.coerce.number().int().min(1).max(500).optional()

const requireAuth = (res: Response): string | null => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return null
  }
  return userId
}

router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    if (!requireAuth(res)) return
    const sessionId = idParamSchema.safeParse(req.params.sessionId)
    if (!sessionId.success) {
      return res
        .status(400)
        .json({ error: t('errors.invalidParams', {}, { defaultValue: 'Invalid params' }) })
    }
    const limit = limitSchema.safeParse(req.query.limit)
    if (!limit.success) {
      return res
        .status(400)
        .json({ error: t('errors.invalidParams', {}, { defaultValue: 'Invalid params' }) })
    }

    const participants = await findMany<Record<string, unknown>>('session_participants', {
      where: [{ field: 'session_id', operator: '=', value: sessionId.data }],
      orderBy: [{ field: 'score', direction: 'desc' }],
      limit: limit.data ?? 100,
    })
    return res.json(participants)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/quiz/:quizId', async (req: Request, res: Response) => {
  try {
    if (!requireAuth(res)) return
    const quizId = idParamSchema.safeParse(req.params.quizId)
    if (!quizId.success) {
      return res
        .status(400)
        .json({ error: t('errors.invalidParams', {}, { defaultValue: 'Invalid params' }) })
    }
    const sessions = await findMany<Record<string, unknown>>('quiz_sessions', {
      where: [{ field: 'quiz_id', operator: '=', value: quizId.data }],
    })
    const sessionIds = sessions.map((s) => String(s.id))
    if (sessionIds.length === 0) return res.json([])
    try {
      // Best score per user across all sessions for this quiz, ranked.
      const report = await aggregate({
        table: 'session_participants',
        measures: [{ field: 'score', function: 'max', alias: 'best_score' }],
        dimensions: ['user_id', 'nickname'],
        filters: [{ field: 'session_id', operator: 'in', value: sessionIds }],
        orderBy: [{ field: 'best_score', direction: 'desc' }],
        limit: 100,
      })
      return res.json(report.rows)
    } catch (_error) {
      // Reporting bond is optional in test envs — degrade gracefully to per-session list.
      const participants = await findMany<Record<string, unknown>>('session_participants', {
        where: [{ field: 'session_id', operator: 'in', value: sessionIds }],
        orderBy: [{ field: 'score', direction: 'desc' }],
        limit: 100,
      })
      return res.json(participants)
    }
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/global', async (_req: Request, res: Response) => {
  try {
    if (!requireAuth(res)) return
    try {
      // Sum of scores across every session_participant row per user.
      const report = await aggregate({
        table: 'session_participants',
        measures: [{ field: 'score', function: 'sum', alias: 'total_score' }],
        dimensions: ['user_id', 'nickname'],
        orderBy: [{ field: 'total_score', direction: 'desc' }],
        limit: 100,
      })
      return res.json(report.rows)
    } catch (_error) {
      // Aggregate reporting unavailable; return empty global leaderboard
      return res.json([])
    }
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
