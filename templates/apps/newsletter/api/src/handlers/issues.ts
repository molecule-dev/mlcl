import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { NewsletterLimits } from '../tiers.js'
import {
  deliverIssueToSubscribers,
  publishIssue,
  recordClick,
  recordOpen,
  refreshIssueStats,
} from './_deliver.js'
import { promoteDueScheduledIssues } from './_scheduled.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const mineQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createIssueSchema = z.object({
  subject: z.string().min(1).max(500),
  preview_text: z.string().max(500).optional().default(''),
  body_md: z.string().optional().default(''),
  // Allow the editor to publish in one shot by passing status='published'.
  // When provided the handler fans out delivery so `publish_at` + sends rows
  // exist in the same request.
  status: z.enum(['draft', 'published']).optional(),
})

const updateIssueSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  preview_text: z.string().max(500).optional(),
  body_md: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
})

const scheduleSchema = z.object({
  publish_at: z.string().min(1),
})

// --- Routes ---

// Public archive: list published issues with pagination (newest first).
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledIssues()
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'published' }]
    const issues = await findMany('issues', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'publish_at', direction: 'desc' }],
    })
    const total = await count('issues', where)
    res.json({ data: issues, total, page, limit })
  } catch (err) {
    console.error('[issues.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get current user's issues (must be before /:id to avoid matching).
// Includes drafts and scheduled — the creator's view of "my issues".
router.get('/mine/all', validateQuery(mineQuerySchema), async (req: Request, res: Response) => {
  try {
    await promoteDueScheduledIssues()
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    // Lazily give a freshly signed-up creator a few demo issues so the
    // dashboard/issues surfaces render real data. Idempotent per author.
    await seedDemoForUser(userId)
    const { status, page, limit } = req.query as unknown as z.infer<typeof mineQuerySchema>
    const where: WhereCondition[] = [{ field: 'author_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const issues = await findMany('issues', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(issues)
  } catch (error) {
    logger.error('issues.mine failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get issue by ID (public reading of a published issue). Visibility-scoped
// like the donor's post route: a non-published issue is only visible to its
// author. Anyone else — anonymous or a different authenticated user — gets a
// 404 (not 403) so the existence of a draft/scheduled issue id can't be probed.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const issue = await findById<Record<string, unknown>>('issues', getParamId(req))
    if (!issue || (issue.status !== 'published' && issue.author_id !== userId)) {
      res.status(404).json({ error: t('issues.notFound', {}, { defaultValue: 'Issue not found' }) })
      return
    }
    res.json(issue)
  } catch (error) {
    logger.error('issues.getById failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create draft issue (or publish + deliver in one shot when status='published').
router.post(
  '/',
  // enforceLimit returns @molecule/api-entitlements' structural RequestHandler
  // whose Request type intentionally has no shared properties with express.Request.
  // Cast through unknown to satisfy express's RequestHandler overload — the
  // runtime contract (req, res, next) is identical.
  enforceLimit<NewsletterLimits>({
    limitType: 'maxIssues',
    getLimit: (limits) => limits.maxIssues,
    // Issues are owned by author_id; user_id is a generated alias on the row
    // for cross-resource limit checks but counting by author_id is the
    // authoritative read path used everywhere else.
    getCurrent: async (userId) =>
      count('issues', [{ field: 'author_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createIssueSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body
      const subject = body.subject as string
      const requestedStatus = body.status === 'published' ? 'published' : 'draft'
      const now = new Date().toISOString()

      const result = await create('issues', {
        subject,
        preview_text: (body.preview_text ?? '') as string,
        body_md: (body.body_md ?? '') as string,
        status: requestedStatus,
        publish_at: requestedStatus === 'published' ? now : null,
        scheduled_at: null,
        author_id: userId,
        created_at: now,
        updated_at: now,
      })
      const created = result.data as Record<string, unknown> | null
      // One-shot publish delivers: sends rows for every subscribed subscriber.
      if (created && created.status === 'published' && created.id) {
        await deliverQuietly(String(created.id))
      }
      res.status(201).json(result.data)
    } catch (err) {
      // Surface server-side errors during dev so test failures are diagnosable.
      // In production this still returns a generic error to the client.
      console.error('[issues.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

async function deliverQuietly(issueId: string): Promise<void> {
  try {
    await deliverIssueToSubscribers(issueId)
  } catch (error) {
    logger.warn('delivery fan-out failed after publish', { issueId, error })
  }
}

async function loadOwnedIssue(
  req: Request,
  res: Response,
): Promise<Record<string, unknown> | null> {
  const id = getParamId(req)
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return null
  }
  const issue = await findById<Record<string, unknown>>('issues', id)
  if (!issue) {
    res.status(404).json({ error: t('issues.notFound', {}, { defaultValue: 'Issue not found' }) })
    return null
  }
  if (issue.author_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return null
  }
  return issue
}

// Update issue — author-only. Subject/preview/body edits only; status
// transitions go through the dedicated publish/unpublish/schedule routes so
// delivery bookkeeping stays in one place.
router.put('/:id', validateBody(updateIssueSchema), async (req: Request, res: Response) => {
  try {
    const issue = await loadOwnedIssue(req, res)
    if (!issue) return

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date().toISOString() }
    delete updates.status
    const result = await updateById('issues', getParamId(req), updates)
    res.json(result.data)
  } catch (err) {
    console.error('[issues.update]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Publish now — flips status, stamps publish_at, and delivers to every
// subscribed subscriber (the sends-table fan-out; see _deliver.ts).
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const issue = await loadOwnedIssue(req, res)
    if (!issue) return

    const published = await publishIssue(getParamId(req), new Date().toISOString())
    res.json(published)
  } catch (err) {
    console.error('[issues.publish]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Schedule for future delivery. The lazy promoter (_scheduled.ts) flips and
// delivers it on the first read after scheduled_at passes.
router.post('/:id/schedule', validateBody(scheduleSchema), async (req: Request, res: Response) => {
  try {
    const issue = await loadOwnedIssue(req, res)
    if (!issue) return

    const result = await updateById('issues', getParamId(req), {
      status: 'scheduled',
      scheduled_at: req.body.publish_at,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[issues.schedule]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Back to draft. Delivery history (sends/stats) is kept — it is a truthful
// record of what was already delivered, exactly like a real ESP would keep it.
router.post('/:id/unpublish', async (req: Request, res: Response) => {
  try {
    const issue = await loadOwnedIssue(req, res)
    if (!issue) return

    const result = await updateById('issues', getParamId(req), {
      status: 'draft',
      publish_at: null,
      scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[issues.unpublish]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Per-issue stats: delivered/opened/clicked aggregates plus an opens-over-time
// histogram derived from sends.opened_at (the delivery log is the source of
// truth; issue_stats is a cached rollup refreshed by the track endpoints).
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const issueId = getParamId(req)
    const issue = await findById<Record<string, unknown>>('issues', issueId)
    if (!issue) {
      res.status(404).json({ error: t('issues.notFound', {}, { defaultValue: 'Issue not found' }) })
      return
    }
    // Keep the rollup fresh even if a track event raced a stats write.
    await refreshIssueStats(issueId)
    const statsRows = (await findMany<Record<string, unknown>>('issue_stats', {
      where: [{ field: 'issue_id', operator: '=', value: issueId }],
      limit: 1,
    })) as Record<string, unknown>[]
    const stats = statsRows[0] ?? { delivered: 0, opened: 0, clicked: 0 }

    const sends = (await findMany<{ opened_at?: string | null }>('sends', {
      where: [{ field: 'issue_id', operator: '=', value: issueId }],
      limit: 100_000,
    })) as { opened_at?: string | null }[]

    // Opens over time: 30 daily buckets ending today (UTC), so the chart
    // trends from the actual open timestamps rather than a mock series.
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const buckets = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - (29 - i))
      buckets.set(d.toISOString().slice(0, 10), 0)
    }
    for (const send of sends) {
      if (!send.opened_at) continue
      const key = new Date(send.opened_at).toISOString().slice(0, 10)
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    const opensOverTime = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))

    const delivered = Number(stats.delivered ?? 0)
    const opened = Number(stats.opened ?? 0)
    const clicked = Number(stats.clicked ?? 0)
    res.json({
      issue_id: issueId,
      subject: issue.subject,
      status: issue.status,
      publish_at: issue.publish_at,
      delivered,
      opened,
      clicked,
      open_rate: delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0,
      click_rate: delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0,
      opens_over_time: opensOverTime,
    })
  } catch (err) {
    console.error('[issues.stats]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// --- Demo open/click tracking (public, tokened) ---
//
// The public issue page carries ?t=<subscriber token> in the URL when a
// "subscriber" opens their copy. The page pings these endpoints; they stamp
// sends.opened_at / clicked_at (first time only) and refresh the aggregate.
// This is the documented DEMO mechanism standing in for a real ESP's tracking
// pixel / redirect wrapper — see _deliver.ts for the integration point.

router.get('/:id/open/:token', async (req: Request, res: Response) => {
  try {
    const subscriber = await findByToken(String(req.params.token))
    if (subscriber) await recordOpen(getParamId(req), subscriber.id)
    res.status(204).end()
  } catch (_error) {
    // Tracking must never surface an error to the page that pinged it.
    res.status(204).end()
  }
})

router.get('/:id/click/:token', async (req: Request, res: Response) => {
  try {
    const subscriber = await findByToken(String(req.params.token))
    if (subscriber) await recordClick(getParamId(req), subscriber.id)
    res.status(204).end()
  } catch (_error) {
    res.status(204).end()
  }
})

async function findByToken(token: string): Promise<{ id: string } | null> {
  if (!token) return null
  const rows = (await findMany<{ id: string }>('subscribers', {
    where: [{ field: 'token', operator: '=', value: token }],
    limit: 1,
  })) as { id: string }[]
  return rows[0] ?? null
}

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const issue = await loadOwnedIssue(req, res)
    if (!issue) return

    await deleteById('issues', getParamId(req))
    res.status(204).end()
  } catch (err) {
    console.error('[issues.delete]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
