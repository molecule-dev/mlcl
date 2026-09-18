/**
 * Webhook-events handler — read-only audit/forensic log of inbound webhooks.
 *
 * Routes:
 *   GET    /webhook-events           list owner's events (filterable)
 *   GET    /webhook-events/:id       single event
 *
 * Owner-scoped (G6 — IDOR-safe). Inbound webhooks themselves are written
 * by the unauthenticated `webhooks.ts` handler with HMAC verification —
 * this read handler only exposes them to the owning user.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireOwnership } from '@molecule/api-bonds-default-express'
import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  repository_id: z.string().uuid().optional(),
  event_type: z.string().max(64).optional(),
  signature_valid: z
    .union([z.boolean(), z.enum(['true', 'false', '0', '1'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined
      if (typeof v === 'boolean') return v
      return v === 'true' || v === '1'
    }),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { repository_id, event_type, signature_valid, page, limit } =
      req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (repository_id) where.push({ field: 'repository_id', operator: '=', value: repository_id })
    if (event_type) where.push({ field: 'event_type', operator: '=', value: event_type })
    if (signature_valid !== undefined) {
      where.push({ field: 'signature_valid', operator: '=', value: signature_valid })
    }
    const items = await findMany('webhook_events', {
      where,
      orderBy: [{ field: 'received_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (err) {
    logger.error('webhook_events.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('webhook_events', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('webhookEvents.notFound', {}, { defaultValue: 'Webhook event not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('webhook_events.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
