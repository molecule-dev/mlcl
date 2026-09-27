import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { deriveAddress, distanceInBlocks, DUPLICATE_RADIUS, isInsideArea } from '../lib/geo.js'
import { isCityStaff } from '../middleware/require-staff.js'
import type { CivicLimits } from '../tiers.js'

const router = Router()

// Civic issues are community-visible. Every endpoint in this router requires
// an authenticated session — the upstream verifyMiddleware populates
// res.locals.session, but it does NOT short-circuit anonymous requests, so
// each handler must guard explicitly.
//
// Authorization model: an issue's `reporter_id` is the citizen who filed it.
// Anyone authenticated may LIST and VIEW every issue in the city (that is
// the point of Explore) and may CONFIRM someone else's issue once. Only the
// reporter (or city staff) may DELETE an issue. Status workflow transitions
// and official response notes are city-staff-only — residents read those as
// "the city responded", so a resident account must never be able to mint
// them. Cross-owner writes return 404 (not 403) so issue existence isn't
// probeable through write endpoints.

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

function notFound(res: Response): Response {
  return res
    .status(404)
    .json({ error: t('issues.notFound', {}, { defaultValue: 'Issue not found' }) })
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const ISSUE_CATEGORIES = [
  'pothole',
  'streetlight',
  'graffiti',
  'trash',
  'tree',
  'parking',
  'other',
] as const

export const ISSUE_STATUSES = [
  'submitted',
  'acknowledged',
  'in_review',
  'resolved',
  'dismissed',
] as const

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

/** Allowed status workflow transitions (city-staff driven). */
const TRANSITIONS: Record<string, IssueStatus[]> = {
  submitted: ['acknowledged', 'dismissed'],
  acknowledged: ['in_review', 'dismissed'],
  in_review: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
}

const createIssueSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  description: z.string().min(1).max(2000),
  x: z.coerce.number().min(0).max(99.99),
  y: z.coerce.number().min(0).max(99.99),
  photo_url: z.string().max(500).optional(),
})

const commentSchema = z.object({ body: z.string().min(1).max(2000) })

const noteSchema = z.object({ body: z.string().min(1).max(2000) })

const updateIssueSchema = z.object({
  status: z.enum(ISSUE_STATUSES).optional(),
  official_note: z.string().max(2000).optional(),
})

const listIssuesQuery = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  // String, not z.coerce.boolean() — coerce.boolean() treats the STRING
  // "false" as truthy, which would flip MyReports into community mode.
  mine: z.string().optional(),
  near_x: z.coerce.number().optional(),
  near_y: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
})

const duplicatesQuery = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  x: z.coerce.number().min(0).max(99.99),
  y: z.coerce.number().min(0).max(99.99),
})

// ---------------------------------------------------------------------------
// Shared row enrichment
// ---------------------------------------------------------------------------

interface IssueRow {
  id: string
  reporter_id: string
  category: string
  description: string
  status: string
  photo_url: string | null
  x: number
  y: number
  derived_address: string
  official_note: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
}

async function reporterNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return new Map()
  const users = (await findMany('users', {
    where: [{ field: 'id', operator: 'in', value: unique }],
  })) as unknown as UserRow[]
  const m = new Map<string, string>()
  for (const u of users) m.set(u.id, u.name || u.email || '')
  return m
}

async function confirmCounts(issueIds: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(issueIds)].filter(Boolean)
  if (unique.length === 0) return new Map()
  const rows = (await findMany('confirmations', {
    where: [{ field: 'issue_id', operator: 'in', value: unique }],
  })) as unknown as Array<{ issue_id: string }>
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.issue_id, (m.get(r.issue_id) ?? 0) + 1)
  return m
}

async function confirmedByMe(issueIds: string[], userId: string | null): Promise<Set<string>> {
  const unique = [...new Set(issueIds)].filter(Boolean)
  if (unique.length === 0 || !userId) return new Set()
  const rows = (await findMany('confirmations', {
    where: [
      { field: 'issue_id', operator: 'in', value: unique },
      { field: 'user_id', operator: '=', value: userId },
    ],
  })) as unknown as Array<{ issue_id: string }>
  return new Set(rows.map((r) => r.issue_id))
}

/** Fan-out helper: one in-app notification row per recipient. */
async function notify(
  userIds: string[],
  kind: string,
  issueId: string,
  message: string,
): Promise<void> {
  for (const userId of new Set(userIds)) {
    if (!userId) continue
    try {
      await create('notifications', { user_id: userId, kind, issue_id: issueId, message })
    } catch (err) {
      // Forensic only — a failed fan-out must never fail the write that
      // triggered it.
      console.error('issue.notify_fanout', err)
    }
  }
}

// ---------------------------------------------------------------------------
// GET / — List issues (community-wide, or just the caller's with mine=1)
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listIssuesQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const { category, status, mine, near_x, near_y, radius, sort, order, limit, offset } =
      req.query as unknown as z.infer<typeof listIssuesQuery>
    const mineFlag = mine !== undefined && mine !== '0' && mine !== 'false'
    // The community list is PUBLIC — the signed-out landing map reads it.
    // Auth is required only for mine=1 (the caller's own reports).
    if (!userId && mineFlag) return unauthorized(res)

    const where: WhereCondition[] = []
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    // mine=1 scopes to the caller's own reports (the MyReports list).
    if (mineFlag) where.push({ field: 'reporter_id', operator: '=', value: userId })

    let issues = (await findMany('issues', {
      where,
      orderBy: [{ field: sort ?? 'created_at', direction: order ?? 'desc' }],
      limit,
      offset,
    })) as unknown as IssueRow[]

    // Proximity filtering (Explore "nearby") runs in-handler: the grid is
    // tiny and this keeps distance semantics in one place (lib/geo.ts)
    // instead of splitting them between SQL and JS.
    if (near_x !== undefined && near_y !== undefined) {
      const r = radius ?? 15
      const point = { x: near_x, y: near_y }
      issues = issues
        .map((issue) => ({ issue, distance: distanceInBlocks(point, issue) }))
        .filter((e) => e.distance <= r)
        .sort((a, b) => a.distance - b.distance)
        .map((e) => e.issue)
    }

    const ids = issues.map((i) => i.id)
    const [names, counts, mineConfirmed] = await Promise.all([
      reporterNames(issues.map((i) => i.reporter_id)),
      confirmCounts(ids),
      confirmedByMe(ids, userId),
    ])

    res.json(
      issues.map((issue) => ({
        ...issue,
        reporter_name: names.get(issue.reporter_id) ?? '',
        confirmation_count: counts.get(issue.id) ?? 0,
        confirmed_by_me: mineConfirmed.has(issue.id),
        is_mine: issue.reporter_id === userId,
      })),
    )
  } catch (err) {
    console.error('issue.list', err)
    res
      .status(500)
      .json({ error: t('issues.listFailed', {}, { defaultValue: 'Failed to list issues' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /duplicates — likely duplicates for a draft report (category + pin)
// ---------------------------------------------------------------------------

router.get('/duplicates', validateQuery(duplicatesQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { category, x, y } = req.query as unknown as z.infer<typeof duplicatesQuery>

    // Only still-open issues of the same category can be duplicates; a
    // resolved pothole two blocks over is history, not a match.
    const candidates = (await findMany('issues', {
      where: [
        { field: 'category', operator: '=', value: category },
        { field: 'status', operator: 'not_in', value: ['resolved', 'dismissed'] },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })) as unknown as IssueRow[]

    const point = { x, y }
    const matches = candidates
      .map((issue) => ({ issue, distance: distanceInBlocks(point, issue) }))
      .filter((e) => e.distance <= DUPLICATE_RADIUS)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)

    const counts = await confirmCounts(matches.map((m) => m.issue.id))

    res.json(
      matches.map((m) => ({
        ...m.issue,
        distance_blocks: Math.round(m.distance * 10) / 10,
        confirmation_count: counts.get(m.issue.id) ?? 0,
      })),
    )
  } catch (err) {
    console.error('issue.duplicates', err)
    res
      .status(500)
      .json({ error: t('issues.duplicatesFailed', {}, { defaultValue: 'Duplicate check failed' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Issue detail (timeline events + confirmations + reporter name)
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const issue = (await findById('issues', id)) as IssueRow | null
    if (!issue) return notFound(res)

    const events = (await findMany('issue_events', {
      where: [{ field: 'issue_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })) as unknown as Array<{
      id: string
      kind: string
      actor_id: string
      text: string | null
      from_status: string | null
      to_status: string | null
      created_at: string
    }>

    const [names, counts, mineConfirmed] = await Promise.all([
      reporterNames([issue.reporter_id, ...events.map((e) => e.actor_id)]),
      confirmCounts([issue.id]),
      confirmedByMe([issue.id], userId),
    ])

    res.json({
      ...issue,
      reporter_name: names.get(issue.reporter_id) ?? '',
      confirmation_count: counts.get(issue.id) ?? 0,
      confirmed_by_me: mineConfirmed.has(issue.id),
      is_mine: issue.reporter_id === userId,
      // Drives the staff-only workflow panel on the detail page.
      is_staff: await isCityStaff(userId),
      events: events.map((e) => ({ ...e, actor_name: names.get(e.actor_id) ?? '' })),
    })
  } catch (err) {
    console.error('issue.get', err)
    res
      .status(500)
      .json({ error: t('issues.getFailed', {}, { defaultValue: 'Failed to get issue' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Report a new issue
// ---------------------------------------------------------------------------

router.post(
  '/',
  enforceLimit<CivicLimits>({
    limitType: 'maxOpenIssues',
    getLimit: (limits) => limits.maxOpenIssues,
    getCurrent: async (userId) =>
      count('issues', [
        { field: 'reporter_id', operator: '=', value: userId },
        { field: 'status', operator: 'not_in', value: ['resolved', 'dismissed'] },
      ]),
  }) as unknown as RequestHandler,
  validateBody(createIssueSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId
      const { category, description, x, y, photo_url } = req.body

      // The address is DERIVED server-side from the pin — clients cannot
      // spoof it, and it is stable by contract (see lib/geo.ts).
      const derived_address = deriveAddress(x, y)

      const result = await create('issues', {
        reporter_id: userId,
        category,
        description,
        status: 'submitted',
        photo_url: photo_url ?? null,
        x,
        y,
        derived_address,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      const issue = (result.data ?? result) as unknown as IssueRow

      // Timeline starts at submission so every issue renders a full
      // submitted → … → resolved history.
      await create('issue_events', {
        issue_id: issue.id,
        kind: 'status_change',
        actor_id: userId,
        from_status: null,
        to_status: 'submitted',
        text: null,
      })

      // Watch-area fan-out: every OTHER user whose saved area contains this
      // pin gets an in-app notification about the new issue.
      const areas = (await findMany('watch_areas', {
        where: [{ field: 'user_id', operator: '!=', value: userId }],
      })) as unknown as Array<{
        user_id: string
        name: string
        x: number
        y: number
        radius: number
      }>
      const watchers = areas.filter((a) => isInsideArea({ x, y }, a)).map((a) => a.user_id)
      const names = await reporterNames([userId])
      const reporter = names.get(userId) || 'A resident'
      await notify(
        watchers,
        'watch_area_issue',
        issue.id,
        `${reporter} reported a new ${category} issue near ${derived_address}`,
      )

      res.status(201).json(issue)
    } catch (err) {
      console.error('issue.create', err)
      res.status(500).json({
        error: t('issues.createFailed', {}, { defaultValue: 'Failed to report issue' }),
      })
    }
  },
)

// ---------------------------------------------------------------------------
// POST /:id/confirmations — "me too" +1 on someone else's issue
// ---------------------------------------------------------------------------

router.post('/:id/confirmations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const issue = (await findById('issues', id)) as IssueRow | null
    if (!issue) return notFound(res)

    // You cannot confirm your own report — the point of a confirmation is
    // INDEPENDENT corroboration.
    if (issue.reporter_id === userId) {
      return res.status(400).json({
        error: t('issues.ownConfirm', {}, { defaultValue: 'You cannot confirm your own report' }),
      })
    }

    const existing = (await findMany('confirmations', {
      where: [
        { field: 'issue_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })) as unknown as unknown[]
    if (existing.length > 0) {
      return res.status(409).json({
        error: t(
          'issues.alreadyConfirmed',
          {},
          { defaultValue: 'You already confirmed this issue' },
        ),
      })
    }

    await create('confirmations', { issue_id: id, user_id: userId })
    await updateById('issues', id, { updated_at: new Date().toISOString() })

    const names = await reporterNames([userId])
    const confirmer = names.get(userId) || 'A neighbor'
    await notify(
      [issue.reporter_id],
      'confirmation',
      issue.id,
      `${confirmer} confirmed your ${issue.category} report at ${issue.derived_address}`,
    )

    const total = await count('confirmations', [{ field: 'issue_id', operator: '=', value: id }])
    res.status(201).json({ ok: true, confirmation_count: total })
  } catch (err) {
    console.error('issue.confirm', err)
    res.status(500).json({
      error: t('issues.confirmFailed', {}, { defaultValue: 'Failed to confirm issue' }),
    })
  }
})

// ---------------------------------------------------------------------------
// POST /:id/comments — citizen comment on an issue
// ---------------------------------------------------------------------------

router.post('/:id/comments', validateBody(commentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const issue = (await findById('issues', id)) as IssueRow | null
    if (!issue) return notFound(res)

    const result = await create('issue_events', {
      issue_id: id,
      kind: 'comment',
      actor_id: userId,
      text: req.body.body as string,
    })
    await updateById('issues', id, { updated_at: new Date().toISOString() })

    // Keep the reporter informed when someone comments on their report.
    if (issue.reporter_id !== userId) {
      const names = await reporterNames([userId])
      const commenter = names.get(userId) || 'A neighbor'
      await notify(
        [issue.reporter_id],
        'comment',
        issue.id,
        `${commenter} commented on your ${issue.category} report at ${issue.derived_address}`,
      )
    }

    res.status(201).json((result.data ?? result) as unknown)
  } catch (err) {
    console.error('issue.comment', err)
    res.status(500).json({
      error: t('issues.commentFailed', {}, { defaultValue: 'Failed to post comment' }),
    })
  }
})

// ---------------------------------------------------------------------------
// POST /:id/notes — official response note (city staff only)
// ---------------------------------------------------------------------------

router.post('/:id/notes', validateBody(noteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    if (!(await isCityStaff(userId))) {
      return res.status(403).json({
        error: t('auth.forbidden', {}, { defaultValue: 'City staff access required' }),
      })
    }
    const id = req.params.id as string
    const issue = (await findById('issues', id)) as IssueRow | null
    if (!issue) return notFound(res)

    const result = await create('issue_events', {
      issue_id: id,
      kind: 'note',
      actor_id: userId,
      text: req.body.body as string,
    })
    await updateById('issues', id, {
      official_note: req.body.body as string,
      updated_at: new Date().toISOString(),
    })
    await notify(
      [issue.reporter_id],
      'note',
      issue.id,
      `City staff responded to your ${issue.category} report at ${issue.derived_address}`,
    )

    res.status(201).json((result.data ?? result) as unknown)
  } catch (err) {
    console.error('issue.official_note', err)
    res
      .status(500)
      .json({ error: t('issues.noteFailed', {}, { defaultValue: 'Failed to add note' }) })
  }
})

// ---------------------------------------------------------------------------
// PATCH /:id — status workflow transition (city staff only)
// ---------------------------------------------------------------------------

router.patch('/:id', validateBody(updateIssueSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    if (!(await isCityStaff(userId))) {
      return res.status(403).json({
        error: t('auth.forbidden', {}, { defaultValue: 'City staff access required' }),
      })
    }
    const id = req.params.id as string
    const issue = (await findById('issues', id)) as IssueRow | null
    if (!issue) return notFound(res)

    const body = req.body as z.infer<typeof updateIssueSchema>
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.status !== undefined) {
      // The workflow is a one-way ladder: submitted → acknowledged →
      // in_review → resolved/dismissed. Skipping rungs or resurrecting a
      // terminal issue is rejected rather than silently coerced.
      if (body.status === issue.status) {
        return res.status(409).json({
          error: t('issues.sameStatus', {}, { defaultValue: `Issue is already ${body.status}` }),
        })
      }
      if (!(TRANSITIONS[issue.status] ?? []).includes(body.status)) {
        return res.status(422).json({
          error: t(
            'issues.badTransition',
            { from: issue.status, to: body.status },
            { defaultValue: 'Cannot move an issue from {{from}} to {{to}}' },
          ),
        })
      }
      patch.status = body.status
      if (body.status === 'resolved' || body.status === 'dismissed') {
        patch.resolved_at = new Date().toISOString()
      }
      await create('issue_events', {
        issue_id: id,
        kind: 'status_change',
        actor_id: userId,
        from_status: issue.status,
        to_status: body.status,
        text: null,
      })
      await notify(
        [issue.reporter_id],
        'status_change',
        issue.id,
        `Your ${issue.category} report at ${issue.derived_address} is now ${body.status.replace('_', ' ')}`,
      )
    }

    if (
      body.official_note !== undefined &&
      body.official_note !== null &&
      body.official_note !== ''
    ) {
      patch.official_note = body.official_note
      // The official note is also a timeline event so the detail page's
      // history shows WHEN the city responded, not just the latest text.
      await create('issue_events', {
        issue_id: id,
        kind: 'note',
        actor_id: userId,
        text: body.official_note,
      })
      await notify(
        [issue.reporter_id],
        'note',
        issue.id,
        `City staff responded to your ${issue.category} report at ${issue.derived_address}`,
      )
    }

    const result = await updateById('issues', id, patch)
    res.json((result.data ?? result) as unknown)
  } catch (err) {
    console.error('issue.update', err)
    res
      .status(500)
      .json({ error: t('issues.updateFailed', {}, { defaultValue: 'Failed to update issue' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Delete an issue (reporter's own, or city staff)
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const issue = (await findById('issues', id)) as IssueRow | null
    if (!issue) return notFound(res)

    // A resident may withdraw their own mis-filed report; only staff may
    // remove someone else's. 404 for everyone else (no probing).
    if (issue.reporter_id !== userId && !(await isCityStaff(userId))) {
      return notFound(res)
    }

    await deleteById('issues', id)
    res.status(204).send()
  } catch (err) {
    console.error('issue.delete', err)
    res
      .status(500)
      .json({ error: t('issues.deleteFailed', {}, { defaultValue: 'Failed to delete issue' }) })
  }
})

export default router
