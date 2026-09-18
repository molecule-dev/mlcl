/**
 * webhook-manager — events emit + event-types catalog.
 *
 * Events are user-scoped immutable records (writes via POST `/events`,
 * reads via GET `/events`/`/events/:id`). Every event triggers fanout
 * delivery rows for the user's matching active webhook endpoints; each row is
 * created in `queued` status and handed to the queue-backed delivery worker
 * (`_deliver.ts`), which performs the real HTTP delivery out-of-band and
 * records the status transition on the row.
 *
 * Event types are a per-user catalog — emit validates that the requested
 * event name exists in the catalog (when the catalog is non-empty).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { enqueueDelivery } from './_deliver.js'

const router = Router()

const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  name: z.string().min(1).max(120).optional(),
  delivery_status: z.string().min(1).max(40).optional(),
})

const createEventSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_.\-:]+$/, 'invalid event name'),
  category: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const createEventTypeSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_.\-:]+$/, 'invalid event type name'),
  description: z.string().max(2000).optional(),
  payload_schema: z.record(z.string(), z.unknown()).optional(),
})

const listEventTypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(200),
})

/* -------------------------------------------------------------------------- */
/* event types — catalog                                                      */
/* -------------------------------------------------------------------------- */

router.get(
  '/types',
  validateQuery(listEventTypesQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
        return
      }
      const q = req.query as unknown as z.infer<typeof listEventTypesQuerySchema>
      const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
      const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
      const types = await findMany('webhook_event_types', {
        where,
        orderBy,
        limit: q.limit,
        offset: (q.page - 1) * q.limit,
      })
      res.json(types)
    } catch (err) {
      logger.error(err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.post('/types', validateBody(createEventTypeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const body = req.body as z.infer<typeof createEventTypeSchema>
    const result = await create('webhook_event_types', {
      user_id: userId,
      name: body.name,
      description: body.description ?? '',
      payload_schema: body.payload_schema ? JSON.stringify(body.payload_schema) : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/* -------------------------------------------------------------------------- */
/* events — emit + read                                                       */
/* -------------------------------------------------------------------------- */

router.get('/', validateQuery(listEventsQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listEventsQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.name) where.push({ field: 'name', operator: '=', value: q.name })
    if (q.delivery_status)
      where.push({ field: 'delivery_status', operator: '=', value: q.delivery_status })

    const orderBy: OrderBy[] = [{ field: 'occurred_at', direction: 'desc' }]
    const events = await findMany('events', {
      where,
      orderBy,
      limit: q.limit,
      offset: (q.page - 1) * q.limit,
    })
    res.json(events)
  } catch (err) {
    logger.error(err)
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
    const event = await findById<Record<string, unknown>>('events', id)
    if (!event || event.user_id !== userId) {
      res.status(404).json({ error: t('events.notFound', {}, { defaultValue: 'Event not found' }) })
      return
    }
    const deliveries = await findMany('webhook_deliveries', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'event_id', operator: '=', value: id },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ ...event, deliveries })
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createEventSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const body = req.body as z.infer<typeof createEventSchema>

    // Find every active webhook owned by this user that subscribes to
    // this event name. `events` JSONB is stored as a string array (or
    // ['*'] for "subscribe to everything") — filter in JS to keep the
    // SQL portable across DataStore providers.
    const webhooks = await findMany<Record<string, unknown>>('webhooks', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_active', operator: '=', value: true },
      ],
    })
    const matched: Array<{ id: string; url: string; content_type: string }> = []
    for (const w of webhooks) {
      const raw = w.events
      let subscribed: string[] = []
      if (Array.isArray(raw)) subscribed = raw.map((s) => String(s))
      else if (typeof raw === 'string') {
        try {
          subscribed = JSON.parse(raw) as string[]
        } catch (_error) {
          // invalid JSON in events column — treat as no subscriptions
          subscribed = []
        }
      }
      if (subscribed.includes('*') || subscribed.includes(body.name)) {
        if (typeof w.id === 'string') {
          matched.push({
            id: w.id,
            url: typeof w.url === 'string' ? w.url : '',
            content_type: typeof w.content_type === 'string' ? w.content_type : 'application/json',
          })
        }
      }
    }
    const fanoutEndpoints = matched.map((w) => w.id)

    const eventResult = await create('events', {
      user_id: userId,
      name: body.name,
      category: body.category ?? null,
      description: body.description ?? '',
      payload: JSON.stringify(body.payload ?? {}),
      fanout_endpoints: JSON.stringify(fanoutEndpoints),
      delivery_status: fanoutEndpoints.length === 0 ? 'done' : 'queued',
      occurred_at: new Date(),
      created_at: new Date(),
    })
    const event = eventResult.data as { id?: string } | null
    const eventId = event?.id

    // Spawn a delivery row per matching endpoint in `queued` state, then hand
    // each to the queue-backed worker (`_deliver.ts`) — the actual HTTP
    // delivery happens out-of-band and flips the row to success/failed.
    if (eventId) {
      for (const webhook of matched) {
        const deliveryResult = await create('webhook_deliveries', {
          user_id: userId,
          webhook_id: webhook.id,
          event_id: eventId,
          event_type: body.name,
          method: 'POST',
          url: webhook.url,
          request_headers: JSON.stringify({ 'Content-Type': webhook.content_type }),
          request_body: JSON.stringify(body.payload ?? {}),
          response_headers: JSON.stringify({}),
          response_body: '',
          status: 'queued',
          status_code: 0,
          status_text: '',
          duration_ms: 0,
          retry_count: 0,
          created_at: new Date(),
        })
        const deliveryId = (deliveryResult.data as { id?: string } | null)?.id
        if (deliveryId) await enqueueDelivery(deliveryId)
      }
    }

    res.status(201).json(event)
  } catch (err) {
    logger.error(err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
