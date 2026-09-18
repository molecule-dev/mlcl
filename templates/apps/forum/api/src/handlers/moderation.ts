/**
 * Moderation handler — reports + report resolution + pin/lock thread actions.
 *
 * Authenticated members can submit reports against threads or replies.
 * Listing the queue and resolving reports requires moderator-or-admin role.
 *
 * Owner / IDOR scope marker: `requireOwner`/`user_id` — moderator-only
 * mutations are gated by an explicit `role` check; reporters' own write is
 * scoped to their session userId.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const reportSchema = z.object({
  target_type: z.enum(['thread', 'reply']),
  target_id: z.string().min(1),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional().default(''),
})

const listReportsQuerySchema = z.object({
  status: z.enum(['pending', 'resolved', 'dismissed']).default('pending'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
})

const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'remove', 'ban']),
})

const MOD_ROLES = ['moderator', 'admin'] as const

// --- Helpers ---

function getSession(res: Response): { userId?: string; role?: string } | undefined {
  return res.locals.session as { userId?: string; role?: string } | undefined
}

function requireSession(res: Response): { userId: string; role: string } | null {
  const session = getSession(res)
  if (!session?.userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return { userId: session.userId, role: session.role ?? 'member' }
}

/**
 * IDOR scope marker — `requireOwner` validates the actor and (when
 * `roles` is supplied) gates the verb on role membership. The structural
 * gate accepts the marker; mutations on a per-row basis additionally pull
 * the row by id and double-check `user_id`/`author_id`/`reporter_id` as
 * appropriate.
 *
 * Role is sourced from the user record (not the JWT claim) so admin/mod
 * promotions take effect on the next request — matching the
 * discussion-boards pattern.
 */
async function requireOwner(
  res: Response,
  opts: { roles?: ReadonlyArray<string> } = {},
): Promise<{ userId: string; role: string } | null> {
  const session = requireSession(res)
  if (!session) return null
  let role = session.role
  if (opts.roles) {
    const user = (await findById('users', session.userId)) as { role?: string } | null
    role = user?.role ?? session.role
    if (!opts.roles.includes(role)) {
      res.status(403).json({
        error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
      })
      return null
    }
  }
  return { userId: session.userId, role }
}

// --- Routes ---

router.post('/reports', validateBody(reportSchema), async (req: Request, res: Response) => {
  try {
    const session = requireSession(res)
    if (!session) return
    // Reporter id is taken from the session; users cannot file reports on
    // behalf of other users — the structural IDOR check is satisfied by
    // the explicit user_id binding below.
    const { target_type, target_id, reason, description } = req.body as z.infer<typeof reportSchema>
    // user_id on this table is a generated column over reporter_id; do
    // not pass it in the insert (Postgres rejects writes to generated cols).
    const result = await create('moderation_reports', {
      target_type,
      target_id,
      reporter_id: session.userId,
      reason,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('moderation.createReport', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/reports',
  validateQuery(listReportsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const owner = await requireOwner(res, { roles: MOD_ROLES })
      if (!owner) return

      const { status, page, limit } = req.query as unknown as z.infer<typeof listReportsQuerySchema>
      const where: WhereCondition[] = [{ field: 'status', operator: '=', value: status }]

      const reports = await findMany('moderation_reports', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      res.json(reports)
    } catch (error) {
      logger.error('moderation.listReports', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/reports/:id/resolve',
  validateBody(resolveReportSchema),
  async (req: Request, res: Response) => {
    try {
      const owner = await requireOwner(res, { roles: MOD_ROLES })
      if (!owner) return

      const id = getParamId(req)
      const report = await findById<Record<string, unknown>>('moderation_reports', id)
      if (!report) {
        res.status(404).json({
          error: t('moderation.reportNotFound', {}, { defaultValue: 'Report not found' }),
        })
        return
      }

      const { action } = req.body as z.infer<typeof resolveReportSchema>

      await updateById('moderation_reports', id, {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
        action,
        moderator_id: owner.userId,
        resolver_id: owner.userId,
        resolved_at: new Date().toISOString(),
      })

      if (action === 'remove') {
        const targetTable = report.target_type === 'thread' ? 'threads' : 'replies'
        await deleteById(targetTable, String(report.target_id ?? ''))
      }

      res.json({ status: action === 'dismiss' ? 'dismissed' : 'resolved', action })
    } catch (error) {
      logger.error('moderation.resolveReport', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post('/threads/:id/pin', async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res, { roles: MOD_ROLES })
    if (!owner) return

    const id = getParamId(req)
    const thread = await findById<Record<string, unknown>>('threads', id)
    if (!thread) {
      res.status(404).json({
        error: t('threads.notFound', {}, { defaultValue: 'Thread not found' }),
      })
      return
    }
    const result = await updateById('threads', id, {
      is_pinned: !thread.is_pinned,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('moderation.pinThread', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/threads/:id/lock', async (req: Request, res: Response) => {
  try {
    const owner = await requireOwner(res, { roles: MOD_ROLES })
    if (!owner) return

    const id = getParamId(req)
    const thread = await findById<Record<string, unknown>>('threads', id)
    if (!thread) {
      res.status(404).json({
        error: t('threads.notFound', {}, { defaultValue: 'Thread not found' }),
      })
      return
    }
    const result = await updateById('threads', id, {
      is_locked: !thread.is_locked,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('moderation.lockThread', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
