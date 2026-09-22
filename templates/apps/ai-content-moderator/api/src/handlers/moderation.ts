/**
 * Flagged-content + ai_reviews handlers.
 *
 * Routes:
 *   GET    /moderation                       list owner's items (mounted under /moderation)
 *   GET    /moderation/:id                   single item including ai_reviews + audit_log
 *   POST   /moderation                       submit content for moderation
 *   POST   /moderation/:id/approve           record approve decision
 *   POST   /moderation/:id/reject            record reject decision (with reason)
 *   POST   /moderation/:id/decide            record human decision (approve/reject/escalate)
 *   POST   /moderation/:id/reopen            re-open a decided item back into the queue
 *   POST   /moderation/:id/ai-review         run an AI pre-classification review
 *   POST   /moderation/:id/assign            assign to a moderator
 *   GET    /moderation/:id/reviews           list ai_reviews + audit_log entries
 *   GET    /moderation/stats/summary         status counts (queue size)
 *   GET    /moderation/stats/recent          recent items (latest first, capped)
 *   GET    /moderation/stats/volume          decisions per day for last N days
 *
 * All rows scoped by `owner_id` to prevent IDOR (G6).
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { type ChatEvent, getProviderByName, hasProvider, requireProvider } from '@molecule/api-ai'
import { requireOwnership } from '@molecule/api-bonds-default-express'
import { count, create, findMany, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { evaluateRegexRules, type ModerationRule } from '../lib/rules.js'

// pg serializes JS objects/arrays as Postgres array literals or via toString();
// JSONB columns need a real JSON string. Wrap every value bound to a JSONB column
// (metadata, before_json, after_json) with this helper.
const jsonb = (value: unknown): string | null => (value == null ? null : JSON.stringify(value))

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['queued', 'in_review', 'decided', 'escalated']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const submitSchema = z.object({
  source: z.enum(['api', 'webhook', 'manual']).optional().default('manual'),
  content_type: z.enum(['text', 'image', 'video']),
  content_ref: z.string().max(2048).optional(),
  content_preview: z.string().max(8000).optional(),
  language: z.string().max(8).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const decideSchema = z.object({
  decision: z.enum(['approve', 'reject', 'escalate']),
  notes: z.string().max(2000).optional(),
})

const assignSchema = z.object({
  assigned_to: z.string().uuid(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const items = await findMany('flagged_content', {
      where,
      orderBy: [{ field: 'submitted_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (error) {
    logger.error('moderation.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const [queued, inReview, decided, escalated, total] = await Promise.all([
      count('flagged_content', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'queued' },
      ]),
      count('flagged_content', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'in_review' },
      ]),
      count('flagged_content', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'decided' },
      ]),
      count('flagged_content', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'escalated' },
      ]),
      count('flagged_content', [{ field: 'owner_id', operator: '=', value: userId }]),
    ])
    const [approved, rejected] = await Promise.all([
      count('flagged_content', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'decision', operator: '=', value: 'approve' },
      ]),
      count('flagged_content', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'decision', operator: '=', value: 'reject' },
      ]),
    ])
    res.json({
      queued,
      in_review: inReview,
      decided,
      escalated,
      total,
      approved,
      rejected,
    })
  } catch (error) {
    logger.error('moderation.statsSummary', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/stats/recent', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const items = await findMany('flagged_content', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'submitted_at', direction: 'desc' }],
      limit: 10,
    })
    res.json(items)
  } catch (error) {
    logger.error('moderation.statsRecent', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

const volumeQuerySchema = z.object({
  /** Number of trailing days to bucket (default 7 — one bar per day). */
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
})

router.get(
  '/stats/volume',
  validateQuery(volumeQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const { days } = req.query as unknown as z.infer<typeof volumeQuerySchema>
      const items = await findMany('flagged_content', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
        orderBy: [{ field: 'submitted_at', direction: 'desc' }],
        limit: 5000,
      })
      const buckets: Record<string, number> = {}
      const now = new Date()
      const dayLabels: { date: string; label: string }[] = []
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now.getTime() - i * 86_400_000)
        const date = d.toISOString().slice(0, 10)
        // Weekday names read well for a week; longer ranges use month/day.
        const label =
          days <= 7
            ? d.toLocaleDateString(undefined, { weekday: 'short' })
            : d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
        dayLabels.push({ date, label })
        buckets[date] = 0
      }
      for (const row of items as Array<{ submitted_at?: string }>) {
        if (!row.submitted_at) continue
        const date = String(row.submitted_at).slice(0, 10)
        if (date in buckets) buckets[date] += 1
      }
      const max = Math.max(1, ...Object.values(buckets))
      const series = dayLabels.map(({ date, label }) => ({
        date,
        label,
        value: buckets[date],
        height: buckets[date] / max,
      }))
      res.json({ series, max })
    } catch (error) {
      logger.error('moderation.statsVolume', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const [aiReviews, auditEntries] = await Promise.all([
      findMany('ai_reviews', {
        where: [{ field: 'flagged_content_id', operator: '=', value: req.params.id as string }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      }),
      findMany('audit_log', {
        where: [
          { field: 'target_type', operator: '=', value: 'flagged_content' },
          { field: 'target_id', operator: '=', value: req.params.id as string },
        ],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      }),
    ])
    const row = check.row as Record<string, unknown>
    const metadata = (row.metadata as Record<string, unknown> | null) ?? {}
    res.json({
      ...row,
      content_id: row.content_ref ?? row.id,
      content_text: row.content_preview ?? null,
      content_url: null,
      reporter_id: null,
      reason: (metadata.reason as string | undefined) ?? null,
      automated_flagged: (metadata.automated_flagged as boolean | undefined) ?? false,
      automated_reasoning: (metadata.automated_reasoning as string | undefined) ?? null,
      rejection_reason: (metadata.rejection_reason as string | undefined) ?? null,
      review_notes: (metadata.review_notes as string | undefined) ?? null,
      reviewed_by: row.decided_by ?? null,
      reviewed_at: row.decided_at ?? null,
      created_at: row.submitted_at ?? row.createdAt,
      ai_reviews: (aiReviews as Array<Record<string, unknown>>).map((r) => ({
        id: r.id,
        decision: (r.classifier as string | undefined)?.includes('reject')
          ? 'reject'
          : (r.classifier as string | undefined)?.includes('approve')
            ? 'approve'
            : 'escalate',
        confidence: r.confidence,
        categories: [],
        reasoning: r.explanation_md ?? '',
        policy_violations: [],
        recommended_action: 'human-review',
        model: r.model ?? 'unknown',
        created_at: r.createdAt ?? new Date().toISOString(),
      })),
      audit_log: (auditEntries as Array<Record<string, unknown>>).map((entry) => ({
        id: entry.id,
        action: entry.action,
        actor_id: entry.actor_user_id ?? entry.user_id ?? '',
        notes:
          (entry.after_json as Record<string, unknown> | null)?.notes !== undefined
            ? String((entry.after_json as Record<string, unknown>).notes ?? '')
            : '',
        created_at: entry.createdAt,
      })),
    })
  } catch (error) {
    logger.error('moderation.getItem', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const [aiReviews, auditEntries] = await Promise.all([
      findMany('ai_reviews', {
        where: [{ field: 'flagged_content_id', operator: '=', value: req.params.id as string }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      }),
      findMany('audit_log', {
        where: [
          { field: 'target_type', operator: '=', value: 'flagged_content' },
          { field: 'target_id', operator: '=', value: req.params.id as string },
        ],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      }),
    ])
    res.json({ ai_reviews: aiReviews, audit_log: auditEntries })
  } catch (error) {
    logger.error('moderation.getItemReviews', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(submitSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof submitSchema>

    // Apply the owner's enabled regex rules to the content before queuing —
    // a matching rule's action (auto_reject / auto_approve / escalate) auto-
    // decides the item. Previously rules were stored but never evaluated, so
    // every submission queued regardless of the configured rules.
    const rules = await findMany<ModerationRule>('moderation_rules', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'enabled', operator: '=', value: true },
      ],
    })
    const ruleMatch = evaluateRegexRules(body.content_preview ?? '', rules)
    const now = new Date().toISOString()
    const status = ruleMatch
      ? ruleMatch.decision === 'escalate'
        ? 'escalated'
        : 'decided'
      : 'queued'

    const id = randomUUID()
    const inserted = await create('flagged_content', {
      id,
      owner_id: userId,
      user_id: userId,
      source: body.source,
      content_type: body.content_type,
      content_ref: body.content_ref ?? null,
      content_preview: body.content_preview ?? null,
      language: body.language ?? null,
      submitted_at: now,
      status,
      decision: ruleMatch?.decision ?? null,
      decided_by: ruleMatch ? userId : null,
      decided_at: ruleMatch ? now : null,
      metadata: jsonb(body.metadata ?? null),
    })

    await create('audit_log', {
      id: randomUUID(),
      owner_id: userId,
      user_id: userId,
      actor_user_id: userId,
      action: ruleMatch ? `auto_rule:${ruleMatch.decision}` : 'submitted',
      target_type: 'flagged_content',
      target_id: id,
      after_json: jsonb(
        ruleMatch
          ? { status, decision: ruleMatch.decision, matched_rule: ruleMatch.pattern }
          : { status: 'queued' },
      ),
    })

    res.status(201).json(inserted.data ?? { id })
  } catch (error) {
    logger.error('moderation.submit', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/decide', validateBody(decideSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const { decision, notes } = req.body as z.infer<typeof decideSchema>
    const newStatus = decision === 'escalate' ? 'escalated' : 'decided'

    const updated = await updateById('flagged_content', req.params.id as string, {
      status: newStatus,
      decision,
      decided_by: userId,
      decided_at: new Date().toISOString(),
    })

    await create('audit_log', {
      id: randomUUID(),
      owner_id: userId,
      user_id: userId,
      actor_user_id: userId,
      action: `decision:${decision}`,
      target_type: 'flagged_content',
      target_id: req.params.id as string,
      before_json: jsonb({ status: check.row.status ?? null }),
      after_json: jsonb({ status: newStatus, decision, notes: notes ?? null }),
    })

    res.json(updated.data)
  } catch (error) {
    logger.error('moderation.decide', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function recordDecision(
  itemId: string,
  userId: string,
  decision: 'approve' | 'reject' | 'escalate',
  notes: string | undefined,
  reason: string | undefined,
  prevStatus: string | null,
): Promise<unknown> {
  const newStatus = decision === 'escalate' ? 'escalated' : 'decided'
  const updated = await updateById('flagged_content', itemId, {
    status: newStatus,
    decision,
    decided_by: userId,
    decided_at: new Date().toISOString(),
    metadata: jsonb(
      decision === 'reject' && reason
        ? { rejection_reason: reason, review_notes: notes ?? null }
        : { review_notes: notes ?? null },
    ),
  })

  await create('audit_log', {
    id: randomUUID(),
    owner_id: userId,
    user_id: userId,
    actor_user_id: userId,
    action: `decision:${decision}`,
    target_type: 'flagged_content',
    target_id: itemId,
    before_json: jsonb({ status: prevStatus }),
    after_json: jsonb({
      status: newStatus,
      decision,
      reason: reason ?? null,
      notes: notes ?? null,
    }),
  })

  return updated.data
}

const approveSchema = z.object({
  notes: z.string().max(2000).optional(),
})

const rejectSchema = z.object({
  reason: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
})

router.post('/:id/approve', validateBody(approveSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const { notes } = req.body as z.infer<typeof approveSchema>
    const data = await recordDecision(
      req.params.id as string,
      userId,
      'approve',
      notes,
      undefined,
      (check.row.status as string) ?? null,
    )
    res.json(data)
  } catch (error) {
    logger.error('moderation.approve', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/reject', validateBody(rejectSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const { reason, notes } = req.body as z.infer<typeof rejectSchema>
    const data = await recordDecision(
      req.params.id as string,
      userId,
      'reject',
      notes,
      reason,
      (check.row.status as string) ?? null,
    )
    res.json(data)
  } catch (error) {
    logger.error('moderation.reject', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Re-open a decided/escalated item back into the queue — the moderation
// equivalent of an appeal. A wrong approve/reject must be reversible, with
// the reversal recorded in the audit log.
router.post('/:id/reopen', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const updated = await updateById('flagged_content', req.params.id as string, {
      status: 'queued',
      decision: null,
      decided_by: null,
      decided_at: null,
    })

    await create('audit_log', {
      id: randomUUID(),
      owner_id: userId,
      user_id: userId,
      actor_user_id: userId,
      action: 'decision:reopened',
      target_type: 'flagged_content',
      target_id: req.params.id as string,
      before_json: jsonb({
        status: check.row.status ?? null,
        decision: check.row.decision ?? null,
      }),
      after_json: jsonb({ status: 'queued' }),
    })

    res.json(updated.data)
  } catch (error) {
    logger.error('moderation.reopen', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// AI moderation: ask the bonded provider for a JSON verdict on the flagged
// content_preview. Persist the real verdict + classifier + token usage on the
// `ai_reviews` row so subsequent reads (and the GET /:id projection) reflect
// what the model actually said. If no provider is bonded or the call fails,
// surface the error to the user instead of silently returning a fake verdict.
const AI_MODERATION_SYSTEM = [
  'You are a content-moderation classifier.',
  'Given a piece of user-submitted text, decide whether it should be APPROVED, REJECTED, or ESCALATED for human review.',
  'Reply with a single JSON object on one line, no prose, no markdown fences.',
  'Schema:',
  '{"decision":"approve|reject|escalate","confidence":0..1,"categories":["sexual","violence","hate","harassment","self-harm","spam","other"],"policy_violations":["..."],"reasoning":"one short sentence"}',
  'Approve obviously benign content. Reject content that clearly violates safety policies (sexual content involving minors, explicit threats, slurs targeting protected groups, doxing). Escalate ambiguous, borderline, or context-dependent cases.',
].join('\n')

interface AiVerdictJson {
  decision: 'approve' | 'reject' | 'escalate'
  confidence: number
  categories?: string[]
  policy_violations?: string[]
  reasoning?: string
}

function parseVerdict(raw: string): AiVerdictJson | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/i)
  const candidate = (fenced ? fenced[1] : raw).trim()
  // The model sometimes wraps prose around the JSON; pull the first {...} block.
  const blockMatch = candidate.match(/\{[\s\S]*\}/)
  if (!blockMatch) return null
  try {
    const parsed = JSON.parse(blockMatch[0]) as Record<string, unknown>
    const decision = String(parsed.decision ?? '').toLowerCase()
    if (decision !== 'approve' && decision !== 'reject' && decision !== 'escalate') return null
    const confidence = Number(parsed.confidence)
    return {
      decision: decision as AiVerdictJson['decision'],
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
      categories: Array.isArray(parsed.categories)
        ? (parsed.categories as unknown[]).map(String).slice(0, 8)
        : [],
      policy_violations: Array.isArray(parsed.policy_violations)
        ? (parsed.policy_violations as unknown[]).map(String).slice(0, 8)
        : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    }
  } catch (_error) {
    // raw is not valid JSON — caller will surface a bad-verdict error to the client
    return null
  }
}

router.post('/:id/ai-review', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireOwnership('flagged_content', req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
    })
    return
  }

  if (!hasProvider('anthropic') && !hasProvider()) {
    res.status(503).json({
      error: t(
        'moderation.aiUnavailable',
        {},
        {
          defaultValue:
            'No AI provider is configured for this deployment. Bond an AI provider to enable AI review.',
        },
      ),
    })
    return
  }

  const row = check.row as Record<string, unknown>
  const text = String(row.content_preview ?? '').trim()
  if (!text) {
    res.status(422).json({
      error: t(
        'moderation.aiNoContent',
        {},
        { defaultValue: 'This item has no content_preview text to classify.' },
      ),
    })
    return
  }

  const provider = getProviderByName('anthropic') ?? requireProvider()
  let raw = ''
  let modelError: string | undefined
  let inputTokens = 0
  let outputTokens = 0
  try {
    for await (const event of provider.chat({
      system: AI_MODERATION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Classify the following content:\n\n<content>\n${text}\n</content>`,
        },
      ],
      maxTokens: 400,
      // NOTE: no explicit `temperature` — several current Anthropic models
      // reject it with a 400 ("temperature is deprecated for this model"),
      // which surfaced as a 502 on every AI review. The classification
      // prompt + JSON schema keep outputs deterministic enough without it.
    }) as AsyncIterable<ChatEvent>) {
      if (event.type === 'text') raw += event.content
      else if (event.type === 'done') {
        inputTokens = event.usage.inputTokens
        outputTokens = event.usage.outputTokens
      } else if (event.type === 'error') {
        modelError = event.message
        break
      }
    }
  } catch (err) {
    modelError = err instanceof Error ? err.message : String(err)
  }

  if (modelError) {
    res.status(502).json({
      error: t(
        'moderation.aiError',
        { message: modelError },
        { defaultValue: `AI provider error: ${modelError}` },
      ),
    })
    return
  }

  const verdict = parseVerdict(raw)
  if (!verdict) {
    res.status(502).json({
      error: t(
        'moderation.aiBadVerdict',
        {},
        { defaultValue: 'AI provider returned an unparseable verdict.' },
      ),
      raw: raw.slice(0, 500),
    })
    return
  }

  const reviewId = randomUUID()
  const classifier = `safety/${verdict.decision}`
  const explanation = verdict.reasoning || 'AI-generated verdict.'
  await create('ai_reviews', {
    id: reviewId,
    flagged_content_id: req.params.id as string,
    owner_id: userId,
    user_id: userId,
    classifier,
    confidence: verdict.confidence,
    explanation_md: explanation,
    model: provider.name,
    tokens_used: inputTokens + outputTokens,
  })

  // Move the item into in_review so the queue reflects that it's been
  // touched by AI. Don't auto-decide; the AI verdict is advisory until a
  // human acts on it.
  await updateById('flagged_content', req.params.id as string, { status: 'in_review' })

  res.json({
    ai_review: {
      id: reviewId,
      decision: verdict.decision,
      confidence: verdict.confidence,
      categories: verdict.categories ?? [],
      policy_violations: verdict.policy_violations ?? [],
      reasoning: explanation,
      recommended_action: verdict.decision === 'escalate' ? 'human-review' : verdict.decision,
      model: provider.name,
      tokens_used: inputTokens + outputTokens,
      created_at: new Date().toISOString(),
    },
    status: 'in_review',
  })
})

router.post('/:id/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('flagged_content', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('moderation.notFound', {}, { defaultValue: 'Content item not found' }),
      })
      return
    }
    const { assigned_to } = req.body as z.infer<typeof assignSchema>

    const updated = await updateById('flagged_content', req.params.id as string, {
      status: 'in_review',
      assigned_to,
    })

    await create('audit_log', {
      id: randomUUID(),
      owner_id: userId,
      user_id: userId,
      actor_user_id: userId,
      action: 'assigned',
      target_type: 'flagged_content',
      target_id: req.params.id as string,
      after_json: jsonb({ assigned_to }),
    })

    res.json(updated.data)
  } catch (error) {
    logger.error('moderation.assign', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
