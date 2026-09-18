import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface DocCitationRow {
  id: string
  title: string
  citation_count: string
  avg_relevance: string | null
}

interface QueryRow {
  id: string
  question: string
  count: string
  avg_relevance: string | null
}

interface TotalsRow {
  questions_today: string
  questions_yesterday: string
  avg_confidence: string | null
  avg_response_ms: string | null
  total_30d: string
  unanswered_count: string
}

/**
 * `/api/reports/analytics` aggregates the persisted Q&A history into the
 * shape the Analytics page needs. Everything is computed from
 * `qa_entries` (the table that powers /qa/history) so the analytics page
 * always matches what the user sees in /history. We do NOT fall back to
 * demo data: an empty knowledge base shows zeros, which is the truthful
 * reading.
 */
router.get('/analytics', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const totalsResult = await query<TotalsRow>(
    `SELECT
       (SELECT COUNT(*)::text FROM qa_entries
         WHERE user_id = $1 AND created_at::date = CURRENT_DATE)
         AS questions_today,
       (SELECT COUNT(*)::text FROM qa_entries
         WHERE user_id = $1 AND created_at::date = CURRENT_DATE - INTERVAL '1 day')
         AS questions_yesterday,
       (SELECT AVG(confidence)::text FROM qa_entries
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day')
         AS avg_confidence,
       (SELECT AVG(response_ms)::text FROM qa_entries
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day'
           AND response_ms IS NOT NULL)
         AS avg_response_ms,
       (SELECT COUNT(*)::text FROM qa_entries
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day')
         AS total_30d,
       (SELECT COUNT(*)::text FROM qa_entries
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day'
           AND confidence < 0.5)
         AS unanswered_count`,
    [userId],
  )
  const totals = totalsResult.rows[0] ?? {
    questions_today: '0',
    questions_yesterday: '0',
    avg_confidence: null,
    avg_response_ms: null,
    total_30d: '0',
    unanswered_count: '0',
  }

  const historyResult = await query<{ date: string; count: string }>(
    `SELECT to_char(d, 'YYYY-MM-DD') AS date,
            COALESCE(COUNT(qa_entries.id), 0)::text AS count
       FROM generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, '1 day') d
       LEFT JOIN qa_entries
         ON qa_entries.user_id = $1
        AND qa_entries.created_at::date = d::date
       GROUP BY d
       ORDER BY d`,
    [userId],
  )

  const topDocsResult = await query<DocCitationRow>(
    `WITH cite AS (
        SELECT (cit->>'document_id') AS document_id,
               (cit->>'relevance')::numeric AS relevance
          FROM qa_entries qe,
               jsonb_array_elements(qe.citations_json) cit
         WHERE qe.user_id = $1
           AND qe.created_at >= NOW() - INTERVAL '30 day'
       )
     SELECT d.id,
            d.title,
            COUNT(cite.document_id)::text AS citation_count,
            AVG(cite.relevance)::text AS avg_relevance
       FROM cite
       JOIN documents d ON d.id::text = cite.document_id AND d.user_id = $1
       GROUP BY d.id, d.title
       ORDER BY COUNT(cite.document_id) DESC
       LIMIT 5`,
    [userId],
  )

  const topQueriesResult = await query<QueryRow>(
    `SELECT MIN(id::text) AS id,
            question,
            COUNT(*)::text AS count,
            AVG(confidence)::text AS avg_relevance
       FROM qa_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day'
       GROUP BY question
       ORDER BY COUNT(*) DESC
       LIMIT 5`,
    [userId],
  )

  const askersResult = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id)::text AS count
       FROM qa_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day'`,
    [userId],
  )

  const today = Number(totals.questions_today)
  const yesterday = Number(totals.questions_yesterday)
  const avgConfidence = totals.avg_confidence ? Number(totals.avg_confidence) : 0
  const total30d = Number(totals.total_30d)

  res.json({
    questions_today: today,
    questions_change_pct:
      yesterday > 0 ? Number((((today - yesterday) / yesterday) * 100).toFixed(1)) : 0,
    avg_relevance_pct: Number((avgConfidence * 100).toFixed(1)),
    history_7d: historyResult.rows.map((r) => ({ date: r.date, count: Number(r.count) })),
    total_queries_30d: total30d,
    unique_askers_30d: Math.max(1, Number(askersResult.rows[0]?.count ?? '1')),
    unanswered_count: Number(totals.unanswered_count),
    avg_response_ms: totals.avg_response_ms ? Math.round(Number(totals.avg_response_ms)) : 0,
    top_docs: topDocsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      citation_count: Number(row.citation_count),
      avg_relevance: row.avg_relevance ? Number(row.avg_relevance) : 0,
    })),
    top_queries: topQueriesResult.rows.map((row) => ({
      id: row.id,
      question: row.question,
      count: Number(row.count),
      avg_relevance: row.avg_relevance ? Number((Number(row.avg_relevance) * 100).toFixed(1)) : 0,
    })),
  })
})

export default router
