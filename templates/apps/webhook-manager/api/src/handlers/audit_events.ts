/**
 * webhook-manager — audit events (append-only).
 *
 * Audit events are user-scoped immutable records — every mutation in the
 * app SHOULD be paired with an `audit_events` row capturing actor, action,
 * target, and metadata for compliance review.
 *
 * Reads + create are exposed; updates and deletes are intentionally not.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  action: z.string().min(1).max(120).optional(),
})

const createSchema = z.object({
  action: z.string().min(1).max(120),
  target: z.string().max(255).optional(),
  actor: z.string().max(255).optional(),
  ip_address: z.string().max(60).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const q = req.query as unknown as z.infer<typeof listSchema>
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (q.action) where.push({ field: 'action', operator: '=', value: q.action })
  const orderBy: OrderBy[] = [{ field: 'occurred_at', direction: 'desc' }]
  const events = await findMany('audit_events', {
    where,
    orderBy,
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  })
  res.json(events)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const row = await findById<Record<string, unknown>>('audit_events', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('auditEvents.notFound', {}, { defaultValue: 'Audit event not found' }) })
    return
  }
  res.json(row)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const ip =
    body.ip_address ??
    (req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '')
  const result = await create('audit_events', {
    user_id: userId,
    action: body.action,
    target: body.target ?? null,
    actor: body.actor ?? null,
    actor_type: 'user',
    ip_address: ip,
    metadata: JSON.stringify(body.metadata ?? {}),
    occurred_at: new Date(),
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

export default router
