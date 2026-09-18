/**
 * Reports handler — aggregates dashboard statistics across the user's
 * projects, segments, team, and memory. Read-only.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

router.get('/dashboard_stats', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const [activeProjects, segmentsAll, teamMembers] = await Promise.all([
      count('translation_projects', where),
      findMany<Record<string, unknown>>('translation_segments', { where, limit: 5000 }),
      count('team_members', where),
    ])
    const wordsTranslated = segmentsAll
      .filter((s) => String(s.status ?? '') !== 'untranslated')
      .reduce(
        (sum, s) =>
          sum +
          String(s.target_text ?? '')
            .split(/\s+/)
            .filter(Boolean).length,
        0,
      )
    const approved = segmentsAll.filter((s) => String(s.status ?? '') === 'approved').length
    const total = segmentsAll.length
    const qualityScore = total > 0 ? Math.round((approved / total) * 100) : 0
    res.json({
      active_projects: activeProjects,
      words_translated_30d: wordsTranslated,
      words_change_30d: 0,
      avg_quality_score: qualityScore,
      team_members: teamMembers,
      ai_confidence: qualityScore > 0 ? Math.min(100, qualityScore + 4) : 0,
      volume_history: [],
    })
  } catch (error) {
    logger.error('reports.dashboardStats', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/billing_usage', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const [activeProjects, segmentsAll, teamMembers] = await Promise.all([
      count('translation_projects', where),
      findMany<Record<string, unknown>>('translation_segments', { where, limit: 5000 }),
      count('team_members', where),
    ])
    const wordsThisMonth = segmentsAll.reduce(
      (sum, s) =>
        sum +
        String(s.target_text ?? '')
          .split(/\s+/)
          .filter(Boolean).length,
      0,
    )
    res.json({
      words: { used: wordsThisMonth, limit: 250_000 },
      projects: { used: activeProjects, limit: 25 },
      seats: { used: teamMembers, limit: 5 },
    })
  } catch (error) {
    logger.error('reports.billingUsage', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/review_queue', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'needs_review' },
    ]
    const segs = await findMany<Record<string, unknown>>('translation_segments', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 50,
    })
    res.json(segs)
  } catch (error) {
    logger.error('reports.reviewQueue', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
