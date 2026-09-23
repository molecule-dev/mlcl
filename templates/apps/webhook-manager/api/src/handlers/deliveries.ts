/**
 * webhook-manager — webhook deliveries (read + replay).
 *
 * Deliveries are append-only — handlers never expose mutation; they list,
 * read by id, and create a "replay" delivery row that reuses the source
 * payload + endpoint. A replay row starts `queued` and is handed to the
 * queue-backed delivery worker (`_deliver.ts`), which performs the real HTTP
 * delivery out-of-band and records the status transition.
 *
 * All reads/writes are scoped by user_id (no IDOR).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

import { enqueueDelivery } from './_deliver.js'

const router = Router()

const DELIVERY_STATUSES = ['queued', 'delivering', 'success', 'failed'] as const

const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  webhook_id: z.string().uuid().optional(),
  status: z.enum(DELIVERY_STATUSES).optional(),
  event_type: z.string().min(1).max(120).optional(),
})

router.get('/', validateQuery(listDeliveriesQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listDeliveriesQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.webhook_id) where.push({ field: 'webhook_id', operator: '=', value: q.webhook_id })
    if (q.status) where.push({ field: 'status', operator: '=', value: q.status })
    if (q.event_type) where.push({ field: 'event_type', operator: '=', value: q.event_type })

    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const deliveries = await findMany('webhook_deliveries', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(deliveries)
  } catch (err) {
    logger.error({ err }, 'deliveries.list')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const delivery = await findById<Record<string, unknown>>('webhook_deliveries', id)
    if (!delivery || delivery.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('deliveries.notFound', {}, { defaultValue: 'Delivery not found' }) })
      return
    }
    res.json(delivery)
  } catch (err) {
    logger.error({ err }, 'deliveries.get')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/replay', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const id = getParamId(req)
    const delivery = await findById<Record<string, unknown>>('webhook_deliveries', id)
    if (!delivery || delivery.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('deliveries.notFound', {}, { defaultValue: 'Delivery not found' }) })
      return
    }
    const replay = await create('webhook_deliveries', {
      user_id: userId,
      webhook_id: delivery.webhook_id,
      event_id: delivery.event_id,
      event_type: delivery.event_type,
      method: delivery.method ?? 'POST',
      url: delivery.url,
      request_headers:
        typeof delivery.request_headers === 'string'
          ? delivery.request_headers
          : JSON.stringify(delivery.request_headers ?? {}),
      request_body: delivery.request_body,
      response_headers: JSON.stringify({}),
      response_body: '',
      status: 'queued',
      status_code: 0,
      status_text: '',
      duration_ms: 0,
      retry_count: 0,
      created_at: new Date(),
    })
    const replayId = (replay.data as { id?: string } | null)?.id
    if (replayId) await enqueueDelivery(replayId)
    res.status(201).json(replay.data)
  } catch (err) {
    logger.error({ err }, 'deliveries.replay')
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
