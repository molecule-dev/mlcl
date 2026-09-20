import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership, requireParentOwnership } from '../lib/authz.js'
import type { ConstructionManagementLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { asMap, shapeRfi } from './_shape.js'

const router = Router()

export const RFI_STATUSES = ['open', 'answered', 'closed'] as const
type RfiStatus = (typeof RFI_STATUSES)[number]

/** Which status transitions the workflow allows. */
const ALLOWED_TRANSITIONS: Record<RfiStatus, RfiStatus[]> = {
  open: ['closed'],
  answered: ['closed'],
  closed: [],
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const createRfiSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  question: z.string().min(1).max(8000),
  originator: z.string().min(1).max(200),
  drawings_ref: z.string().max(200).optional(),
  due_date: z.string().regex(DATE_RE).optional().nullable(),
})

const updateRfiSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  question: z.string().min(1).max(8000).optional(),
  originator: z.string().min(1).max(200).optional(),
  drawings_ref: z.string().max(200).optional(),
  due_date: z.string().regex(DATE_RE).optional().nullable(),
})

const responseAddSchema = z.object({
  body: z.string().min(1).max(8000),
  is_final: z.boolean().optional(),
})

const statusSchema = z.object({
  status: z.enum(RFI_STATUSES),
})

/** Project rows for the owner, as an id→row lookup map. */
async function projectLookup(userId: string): Promise<Map<string, Record<string, unknown>>> {
  const rows = await findMany('projects', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
  })
  return asMap(rows as Array<Record<string, unknown>>, 'id')
}

/** Response rows for many RFIs at once, grouped by rfi_id. */
async function responsesByRfi(
  rfiIds: readonly string[],
): Promise<Map<string, Array<Record<string, unknown>>>> {
  const grouped = new Map<string, Array<Record<string, unknown>>>()
  if (rfiIds.length === 0) return grouped
  const rows = await findMany('rfi_responses', {
    where: [{ field: 'rfi_id', operator: 'in', value: [...rfiIds] }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  for (const r of rows as Array<Record<string, unknown>>) {
    const rfiId = typeof r.rfi_id === 'string' ? r.rfi_id : ''
    const bucket = grouped.get(rfiId)
    if (bucket) bucket.push(r)
    else grouped.set(rfiId, [r])
  }
  return grouped
}

router.use(authorizers.auth())

// List RFIs — owner-scoped, optional project/status filters. Seeds demo data
// on first authenticated call. Response threads are NOT included in the list
// (the detail view owns them).
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { project_id, status } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (project_id && typeof project_id === 'string') {
      where.push({ field: 'project_id', operator: '=', value: project_id })
    }
    if (status && RFI_STATUSES.includes(String(status) as RfiStatus)) {
      where.push({ field: 'status', operator: '=', value: String(status) })
    }

    const rows = await findMany('rfis', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    const projectById = await projectLookup(userId)
    res.json(rows.map((r) => shapeRfi(r as Record<string, unknown>, projectById)))
  } catch (err) {
    logger.error('[rfis] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get RFI detail with the threaded Q&A — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('rfis', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('rfis.notFound', {}, { defaultValue: 'RFI not found' }) })
      return
    }
    const projectById = await projectLookup(userId)
    const responses = await responsesByRfi([req.params.id as string])
    res.json(
      shapeRfi(
        check.row as Record<string, unknown>,
        projectById,
        responses.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[rfis] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Raise an RFI — entitlement-gated. `number` is sequential per project and
// assigned server-side; clients never send it.
router.post(
  '/',
  enforceLimit<ConstructionManagementLimits>({
    limitType: 'maxRfis',
    getLimit: (limits) => limits.maxRfis,
    getCurrent: async (userId) =>
      count('rfis', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createRfiSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createRfiSchema>
      const projectCheck = await requireOwnership('projects', body.project_id, userId)
      if (!projectCheck.ok) {
        res.status(projectCheck.status).json({
          error: t('projects.notFound', {}, { defaultValue: 'Project not found' }),
        })
        return
      }
      const siblings = await findMany('rfis', {
        where: [{ field: 'project_id', operator: '=', value: body.project_id }],
      })
      const nextNumber =
        siblings.reduce(
          (max, r) => Math.max(max, Number((r as Record<string, unknown>).number ?? 0)),
          0,
        ) + 1

      const now = new Date().toISOString()
      const result = await create('rfis', {
        owner_id: userId,
        project_id: body.project_id,
        number: nextNumber,
        title: body.title,
        question: body.question,
        originator: body.originator,
        drawings_ref: body.drawings_ref ?? '',
        due_date: body.due_date ?? null,
        status: 'open',
        created_at: now,
        updated_at: now,
      })
      const projectById = await projectLookup(userId)
      res.status(201).json(shapeRfi(result.data as Record<string, unknown>, projectById))
    } catch (err) {
      logger.error('[rfis] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update RFI fields — owner-only. Status changes go through /status.
router.put('/:id', validateBody(updateRfiSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('rfis', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('rfis.notFound', {}, { defaultValue: 'RFI not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateRfiSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of ['title', 'question', 'originator', 'drawings_ref', 'due_date'] as const) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    const result = await updateById('rfis', req.params.id as string, updates)
    const projectById = await projectLookup(userId)
    const responses = await responsesByRfi([req.params.id as string])
    res.json(
      shapeRfi(
        result.data as Record<string, unknown>,
        projectById,
        responses.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[rfis] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Answer an RFI / add a clarification to the thread. Author = the calling
// user's display name. A response flagged is_final ALSO flips the RFI to
// `answered` — the final answer is the decision of record.
router.post(
  '/:id/responses',
  validateBody(responseAddSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const check = await requireOwnership('rfis', req.params.id as string, userId)
      if (!check.ok) {
        res
          .status(check.status)
          .json({ error: t('rfis.notFound', {}, { defaultValue: 'RFI not found' }) })
        return
      }
      const body = req.body as z.infer<typeof responseAddSchema>
      const me = (await findMany('users', {
        where: [{ field: 'id', operator: '=', value: userId }],
      })) as Array<Record<string, unknown>>
      const author =
        typeof me[0]?.name === 'string' && me[0].name ? (me[0].name as string) : 'Field'

      const now = new Date().toISOString()
      const result = await create('rfi_responses', {
        rfi_id: req.params.id as string,
        author,
        body: body.body,
        is_final: Boolean(body.is_final),
        created_at: now,
      })
      if (body.is_final) {
        await updateById('rfis', req.params.id as string, {
          status: 'answered',
          updated_at: now,
        })
      }
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('[rfis] response add failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Remove a response from the thread.
router.delete('/:id/responses/:responseId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireParentOwnership(
      'rfi_responses',
      req.params.responseId as string,
      'rfis',
      'rfi_id',
      userId,
    )
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('rfis.responseNotFound', {}, { defaultValue: 'Response not found' }) })
      return
    }
    await deleteById('rfi_responses', req.params.responseId as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[rfis] response delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Status transition — closing is the only manual move (answered comes from a
// final response).
router.post('/:id/status', validateBody(statusSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('rfis', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('rfis.notFound', {}, { defaultValue: 'RFI not found' }) })
      return
    }
    const row = check.row as Record<string, unknown>
    const current = String(row.status ?? 'open') as RfiStatus
    const next = (req.body as z.infer<typeof statusSchema>).status
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      res.status(409).json({
        error: t(
          'rfis.invalidTransition',
          { from: current, to: next },
          { defaultValue: 'Cannot move a {{from}} RFI to {{to}}' },
        ),
      })
      return
    }
    const result = await updateById('rfis', req.params.id as string, {
      status: next,
      updated_at: new Date().toISOString(),
    })
    const projectById = await projectLookup(userId)
    const responses = await responsesByRfi([req.params.id as string])
    res.json(
      shapeRfi(
        result.data as Record<string, unknown>,
        projectById,
        responses.get(req.params.id as string) ?? [],
      ),
    )
  } catch (err) {
    logger.error('[rfis] status failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete RFI — owner-only (responses go with it).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('rfis', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('rfis.notFound', {}, { defaultValue: 'RFI not found' }) })
      return
    }
    const responses = await responsesByRfi([req.params.id as string])
    for (const r of responses.get(req.params.id as string) ?? []) {
      if (typeof r.id === 'string') await deleteById('rfi_responses', r.id)
    }
    await deleteById('rfis', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[rfis] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
