import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorization } from '@molecule/api-resource-user'

import { asyncHandler } from '../lib/asyncHandler.js'
import {
  findPublishedSurveyBySlug,
  requireSurveyChildOwnership,
  requireSurveyOwnership,
} from '../lib/authz.js'

const router = Router()

// Postgres `numeric` columns come back as strings via the pg driver. The
// frontend (Analytics, ResponseDetail) treats `score` as a number, so we
// normalize here before sending. Returns the input unchanged if it's not a
// recognizable response row.
function coerceScore<T>(row: T): T {
  if (!row || typeof row !== 'object') return row
  const r = row as Record<string, unknown>
  if (r.score == null) return row
  if (typeof r.score === 'number') return row
  const n = Number(r.score)
  if (Number.isFinite(n)) {
    return { ...r, score: n } as T
  }
  return row
}

function coerceScores<T>(rows: T[]): T[] {
  return rows.map((row) => coerceScore(row))
}

const submitResponseSchema = z.object({
  survey_id: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  respondent_email: z.string().email().nullable().optional(),
  answers: z.record(z.string(), z.unknown()),
  score: z.number().nullable().optional(),
})

router.use(authorization.verifyMiddleware())

// Public submission — anonymous respondents POST to /api/responses with
// either survey_id (when the survey is published) or slug.
router.post(
  '/',
  validateBody(submitResponseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { survey_id, slug, respondent_email, answers, score } = req.body

    let survey: {
      id: string
      status?: string
      response_count?: number
      owner_id?: string
      title?: string
    } | null = null
    if (slug) {
      const found = await findPublishedSurveyBySlug<{
        id: unknown
        status?: unknown
        response_count?: unknown
        owner_id?: unknown
        title?: unknown
      }>(String(slug))
      if (found) {
        survey = {
          id: String(found.id),
          status: String(found.status ?? 'draft'),
          response_count: Number(found.response_count ?? 0),
          owner_id: found.owner_id ? String(found.owner_id) : undefined,
          title: found.title ? String(found.title) : undefined,
        }
      }
    } else if (survey_id) {
      const row = await findById<{
        id: unknown
        status?: unknown
        response_count?: unknown
        owner_id?: unknown
        title?: unknown
      }>('surveys', String(survey_id))
      if (row) {
        survey = {
          id: String(row.id),
          status: String(row.status ?? 'draft'),
          response_count: Number(row.response_count ?? 0),
          owner_id: row.owner_id ? String(row.owner_id) : undefined,
          title: row.title ? String(row.title) : undefined,
        }
      }
    }

    if (!survey) {
      res
        .status(404)
        .json({ error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }) })
      return
    }
    if (survey.status === 'closed' || survey.status === 'archived') {
      res.status(410).json({ error: t('survey.closed', {}, { defaultValue: 'Survey is closed' }) })
      return
    }
    if (survey.status !== 'published') {
      // Draft surveys: only owner-authenticated submissions allowed (preview mode).
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        res
          .status(404)
          .json({ error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }) })
        return
      }
      const owns = await requireSurveyOwnership(survey.id, userId)
      if (!owns.ok) {
        res
          .status(404)
          .json({ error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }) })
        return
      }
    }

    // Validate required questions are present in `answers`. Without this
    // the public form's client-side `Required` UI would be the only barrier;
    // any direct API call could omit them. Surveys with zero questions skip
    // the check (e.g. preview probes).
    const questions = await findMany<{ id: unknown; required: unknown }>('survey_questions', {
      where: [{ field: 'survey_id', operator: '=', value: survey.id }],
    })
    const missing: string[] = []
    for (const q of questions) {
      const required = q.required === true || q.required === 't' || q.required === 1
      if (!required) continue
      const qid = String(q.id)
      const v = (answers as Record<string, unknown>)[qid]
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
        missing.push(qid)
      }
    }
    if (missing.length > 0) {
      res.status(400).json({
        error: t(
          'response.requiredAnswersMissing',
          {},
          { defaultValue: 'Please answer all required questions.' },
        ),
        errorKey: 'response.requiredAnswersMissing',
        missing,
      })
      return
    }

    const respondentId = res.locals.session?.userId as string | undefined

    const result = await create('survey_responses', {
      survey_id: survey.id,
      respondent_id: respondentId ?? null,
      respondent_email: respondent_email ?? null,
      answers: JSON.stringify(answers ?? {}),
      status: 'completed',
      score: typeof score === 'number' ? score : null,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    // Maintain the surveys.response_count denormalization so list / detail
    // endpoints don't need a separate count query. Best-effort: failure here
    // is logged, never blocks the response.
    await updateById('surveys', survey.id, {
      response_count: (survey.response_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })

    // Notify the survey owner so the Notifications page reflects activity.
    // Best-effort: never block the public submission if this fails.
    if (survey.owner_id) {
      try {
        const created = result.data as { id?: unknown } | null | undefined
        await create('survey_notifications', {
          user_id: survey.owner_id,
          kind: 'response_received',
          payload: JSON.stringify({
            survey_id: survey.id,
            survey_title: survey.title ?? null,
            response_id: created?.id ? String(created.id) : null,
            respondent_email: respondent_email ?? null,
            score: typeof score === 'number' ? score : null,
          }),
          created_at: new Date().toISOString(),
        })
      } catch (_error) {
        // notification failure is non-fatal — response was already created successfully
      }
    }

    res.status(201).json(coerceScore(result.data))
  }),
)

// List responses — caller must own the parent survey.
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const surveyId = req.query.survey_id ? String(req.query.survey_id) : null
    if (!surveyId) {
      res.status(400).json({
        error: t('response.surveyIdRequired', {}, { defaultValue: 'survey_id is required' }),
      })
      return
    }
    const check = await requireSurveyOwnership(surveyId, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'survey_id', operator: '=', value: surveyId }]
    if (req.query.status) {
      where.push({ field: 'status', operator: '=', value: String(req.query.status) })
    }
    const items = await findMany('survey_responses', {
      where,
      orderBy: [{ field: 'submitted_at', direction: 'desc' }],
    })
    res.json(coerceScores(items as unknown[]))
  }),
)

// Get single response — caller must own the parent survey.
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyChildOwnership(
      'survey_responses',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('response.notFound', {}, { defaultValue: 'Response not found' }),
      })
      return
    }
    res.json(coerceScore(check.row))
  }),
)

// Aggregate analytics — caller must own the parent survey. Returns counts
// and per-question NPS distribution where applicable.
router.get(
  '/analytics/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const surveyId = req.query.survey_id ? String(req.query.survey_id) : null
    if (!surveyId) {
      res.status(400).json({
        error: t('response.surveyIdRequired', {}, { defaultValue: 'survey_id is required' }),
      })
      return
    }
    const check = await requireSurveyOwnership(surveyId, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const total = await count('survey_responses', [
      { field: 'survey_id', operator: '=', value: surveyId },
    ])
    const completed = await count('survey_responses', [
      { field: 'survey_id', operator: '=', value: surveyId },
      { field: 'status', operator: '=', value: 'completed' },
    ])

    // NPS distribution: bucket scores 0–10 across responses that carry a
    // numeric score column (set when a respondent answered an NPS question).
    const scored = (await findMany('survey_responses', {
      where: [{ field: 'survey_id', operator: '=', value: surveyId }],
      orderBy: [{ field: 'submitted_at', direction: 'desc' }],
    })) as Array<{ score?: unknown }>

    const npsBuckets: Record<number, number> = {}
    for (let i = 0; i <= 10; i += 1) npsBuckets[i] = 0
    let promoters = 0
    let passives = 0
    let detractors = 0
    let scoredCount = 0
    for (const row of scored) {
      const v = Number(row.score)
      if (!Number.isFinite(v)) continue
      const rounded = Math.round(v)
      if (rounded < 0 || rounded > 10) continue
      npsBuckets[rounded] += 1
      scoredCount += 1
      if (rounded >= 9) promoters += 1
      else if (rounded >= 7) passives += 1
      else detractors += 1
    }
    const nps =
      scoredCount === 0 ? null : Math.round(((promoters - detractors) / scoredCount) * 100)
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100)

    res.json({
      survey_id: surveyId,
      total_responses: total,
      completed_responses: completed,
      completion_rate: completionRate,
      nps,
      nps_distribution: npsBuckets,
      promoters,
      passives,
      detractors,
    })
  }),
)

// CSV export of responses — owner-only.
router.get(
  '/export/csv',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const surveyId = req.query.survey_id ? String(req.query.survey_id) : null
    if (!surveyId) {
      res.status(400).json({
        error: t('response.surveyIdRequired', {}, { defaultValue: 'survey_id is required' }),
      })
      return
    }
    const check = await requireSurveyOwnership(surveyId, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('survey.notFound', {}, { defaultValue: 'Survey not found' }),
      })
      return
    }
    const items = coerceScores(
      (await findMany('survey_responses', {
        where: [{ field: 'survey_id', operator: '=', value: surveyId }],
        orderBy: [{ field: 'submitted_at', direction: 'desc' }],
      })) as Array<Record<string, unknown>>,
    )

    const answerKeys = new Set<string>()
    for (const row of items) {
      const a = (row as { answers?: Record<string, unknown> }).answers ?? {}
      for (const k of Object.keys(a)) answerKeys.add(k)
    }
    const headers = ['id', 'status', 'score', 'submitted_at', ...answerKeys]
    // CSV cell formatter: `Date`/object → ISO/JSON string; primitive → string.
    // Wrap in quotes only when the cell contains a comma, double-quote, or
    // newline; doubled inner quotes per RFC 4180.
    const escape = (v: unknown): string => {
      if (v == null) return ''
      let s: string
      if (typeof v === 'string') s = v
      else if (typeof v === 'number' || typeof v === 'boolean') s = String(v)
      else if (v instanceof Date) s = v.toISOString()
      else s = JSON.stringify(v)
      // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
      // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. A respondent's
      // free-text answer flows into the OWNER's spreadsheet (cross-actor), so prefix a single
      // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
      // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
      if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines: string[] = [headers.join(',')]
    for (const row of items) {
      const answers = (row as { answers?: Record<string, unknown> }).answers ?? {}
      const fields = [
        escape(row.id),
        escape(row.status),
        escape(row.score),
        escape(row.submitted_at),
        ...Array.from(answerKeys).map((k) => escape((answers as Record<string, unknown>)[k])),
      ]
      lines.push(fields.join(','))
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="responses-${surveyId}.csv"`)
    res.send(lines.join('\n') + '\n')
  }),
)

// Delete a single response — owner of parent survey only.
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const check = await requireSurveyChildOwnership(
      'survey_responses',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res.status(check.status).json({
        error: t('response.notFound', {}, { defaultValue: 'Response not found' }),
      })
      return
    }
    await deleteById('survey_responses', req.params.id as string)
    // Keep surveys.response_count in sync — the submit path increments it, so recount after
    // delete (otherwise the stored count drifts upward as responses are removed).
    const surveyId = String((check.row as { survey_id?: unknown }).survey_id)
    const remaining = await count('survey_responses', [
      { field: 'survey_id', operator: '=', value: surveyId },
    ])
    await updateById('surveys', surveyId, { response_count: remaining })
    res.status(204).end()
  }),
)

export default router
