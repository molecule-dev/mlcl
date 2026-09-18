import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { EventTicketingLimits } from '../tiers.js'

const router = Router()

const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  is_free: z.string().optional(),
  sort_by: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  mine: z.string().optional(),
})

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  venue: z.string().optional(),
  venue_address: z.string().optional(),
  city: z.string().optional(),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  cover_image_key: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
  tickets_total: z.number().int().optional(),
  min_price: z.number().optional(),
  tags: z.array(z.string()).optional(),
})

const updateEventSchema = createEventSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const {
      q,
      category,
      city,
      date_from,
      date_to,
      is_free,
      sort_by = 'start_date',
      page = '1',
      limit = '20',
      mine,
    } = req.query as Record<string, string | undefined>

    const where: WhereCondition[] = []
    // Public listing returns published events; `mine=true` returns the
    // caller's own events regardless of status (organizer dashboard).
    if (mine === 'true') {
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      where.push({ field: 'organizer_user_id', operator: '=', value: userId })
    } else {
      where.push({ field: 'status', operator: '=', value: 'published' })
    }
    // `q` is the free-text search box → match the event title (case-insensitive substring;
    // `ilike` escapes wildcards + wraps %…% so raw user input is injection-safe).
    if (q) where.push({ field: 'title', operator: 'ilike', value: q })
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (city) where.push({ field: 'city', operator: '=', value: city })
    // `is_free=true` → only events with no paid tier (min_price 0).
    if (is_free === 'true') where.push({ field: 'min_price', operator: '=', value: 0 })
    if (date_from) where.push({ field: 'start_date', operator: '>=', value: new Date(date_from) })
    if (date_to) where.push({ field: 'start_date', operator: '<=', value: new Date(date_to) })

    const orderBy: OrderBy[] = [{ field: String(sort_by), direction: 'asc' }]

    const events = await findMany('events', {
      where,
      orderBy,
      limit: Number(limit) || 20,
      offset: (Number(page) - 1) * (Number(limit) || 20),
    })
    res.json(events)
  } catch (err) {
    logger.error('events GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const id = getParamId(req)
    const event = await findById<Record<string, unknown>>('events', id)
    if (!event) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    // Published events are public to any authenticated user. Drafts and
    // cancelled events are visible only to the organizer.
    const isPublished = event.status === 'published'
    const isOwner = event.organizer_user_id === userId || event.user_id === userId
    if (!isPublished && !isOwner) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    res.json(event)
  } catch (err) {
    logger.error('events GET :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier event cap (tiers.ts maxEvents) — defined + shown on Pricing but enforceLimit
// was never called, so any tier could create unlimited events. Events are owned by user_id.
const enforceEventLimit = enforceLimit<EventTicketingLimits>({
  limitType: 'maxEvents',
  getLimit: (limits) => limits.maxEvents,
  getCurrent: async (userId) =>
    count('events', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceEventLimit,
  validateBody(createEventSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }

      const result = await create('events', {
        ...req.body,
        user_id: userId,
        organizer_user_id: userId,
        status: req.body.status ?? 'draft',
        tickets_sold: 0,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('events POST failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateEventSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('events', id)
      if (!existing || (existing.organizer_user_id !== userId && existing.user_id !== userId)) {
        return res
          .status(404)
          .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
      }
      const result = await updateById('events', id, {
        ...req.body,
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('events PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id/publish', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('events', id)
    if (!existing || (existing.organizer_user_id !== userId && existing.user_id !== userId)) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    const result = await updateById('events', id, {
      status: 'published',
      published_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('events PUT :id/publish failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/cancel', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('events', id)
    if (!existing || (existing.organizer_user_id !== userId && existing.user_id !== userId)) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    const result = await updateById('events', id, {
      status: 'cancelled',
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('events PUT :id/cancel failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('events', id)
    if (!existing || (existing.organizer_user_id !== userId && existing.user_id !== userId)) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    await deleteById('events', id)
    res.status(204).end()
  } catch (err) {
    logger.error('events DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/analytics', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const event = await findById<Record<string, unknown>>('events', id)
    if (!event || (event.organizer_user_id !== userId && event.user_id !== userId)) {
      return res
        .status(404)
        .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
    }
    const tickets = await findMany<Record<string, unknown>>('tickets', {
      where: [{ field: 'event_id', operator: '=', value: id }],
    })
    const orders = await findMany<Record<string, unknown>>('orders', {
      where: [{ field: 'event_id', operator: '=', value: id }],
    })
    const ticketsSold = tickets.filter(
      (tix) => tix.status === 'issued' || tix.status === 'checked_in',
    ).length
    const revenue = orders
      .filter((o) => o.status === 'paid')
      .reduce((s, o) => s + (Number(o.total_cents) || 0), 0)
    res.json({
      tickets_sold: ticketsSold,
      revenue,
      orders_count: orders.length,
    })
  } catch (err) {
    logger.error('events GET :id/analytics failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
