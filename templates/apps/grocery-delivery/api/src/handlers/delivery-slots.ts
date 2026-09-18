/**
 * Delivery slots handler — public list/detail, admin-only create/update.
 *
 * Delivery slots are GLOBAL, cross-tenant rows (their fee/capacity/status apply
 * to every customer of the service), so the create/batch/update *writes* are
 * gated by `requireAdmin` — a valid session is NOT sufficient. Only the
 * designated store operator (`role === 'admin'` or an `ADMIN_EMAILS` allow-list
 * email) may mutate them; ordinary shoppers get 403. The batch range is bounded
 * to prevent unbounded inserts. Reads (list/detail) remain open.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

// Upper bound on rows a single batch create may insert (slots = days * windows).
// Prevents an unbounded-insert DoS via a very wide start..end range.
const MAX_BATCH_SLOTS = 366

const router = Router()

const listQuerySchema = z.object({
  date: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

const createSlotSchema = z.object({
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  capacity: z.number().int().positive(),
  region: z.string().optional(),
  fee_override: z.number().nullable().optional(),
})

// Exported for unit testing of the range bound (P2H-4 unbounded-insert guard).
export const batchCreateSchema = z
  .object({
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    windows: z.array(z.object({ start: z.string().min(1), end: z.string().min(1) })).nonempty(),
    capacity: z.number().int().positive(),
    region: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const start = new Date(val.start_date)
    const end = new Date(val.end_date)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid start_date or end_date.' })
      return
    }
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_date must be on or after start_date.',
      })
      return
    }
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
    if (days * val.windows.length > MAX_BATCH_SLOTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Batch would create too many slots (max ${MAX_BATCH_SLOTS}).`,
      })
    }
  })

const updateSlotSchema = z.object({
  capacity: z.number().int().nonnegative().optional(),
  remaining_capacity: z.number().int().nonnegative().optional(),
  fee_override: z.number().nullable().optional(),
  status: z.enum(['active', 'closed']).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    // Public list of upcoming, available slots — no IDOR risk because there is
    // no user-owned data on the row, so the session is not consulted at all.
    const { date, region, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: { field: string; operator: '=' | '>' | '>='; value: unknown }[] = [
      { field: 'status', operator: '=', value: 'active' },
      { field: 'remaining_capacity', operator: '>', value: 0 },
    ]
    if (date) where.push({ field: 'date', operator: '=', value: date })
    if (region) where.push({ field: 'region', operator: '=', value: region })

    const slots = await findMany<{
      id: string
      date: string
      start_time: string
      end_time: string
      capacity: number
      remaining_capacity: number
      fee_override: number | null
      region: string | null
    }>('delivery_slots', {
      where,
      orderBy: [{ field: 'start_time', direction: 'asc' }],
      limit,
    })
    const data = slots.map((s) => {
      const start = new Date(s.start_time)
      const end = new Date(s.end_time)
      const day = start.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const fmtTime = (d: Date): string =>
        d
          .toLocaleTimeString('en-US', { hour: 'numeric', minute: undefined, hour12: true })
          .replace(/:00 /, ' ')
      return {
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        label: `${day}, ${fmtTime(start)}\u2013${fmtTime(end)}`,
        fee_cents: s.fee_override ?? null,
        remaining_capacity: s.remaining_capacity,
        capacity: s.capacity,
        region: s.region,
      }
    })
    // Standard list envelope only. This also returned `owner: _userId`, which no
    // consumer reads — and a non-pagination key beside `data` is precisely what
    // unwrapList must refuse to peel (it cannot tell metadata from a resource
    // field), so the frontend saw zero slots, the cart rendered "No delivery
    // slots are currently available", and checkout could not proceed.
    res.json({ data })
  } catch (error) {
    logger.error('deliverySlots.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const slot = await findById('delivery_slots', getParamId(req))
    if (!slot) {
      res.status(404).json({
        error: t('delivery.slotNotFound', undefined, { defaultValue: 'Delivery slot not found' }),
      })
      return
    }
    res.json(slot)
  } catch (error) {
    logger.error('deliverySlots.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(createSlotSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof createSlotSchema>
      const result = await create('delivery_slots', {
        date: body.date,
        start_time: body.start_time,
        end_time: body.end_time,
        capacity: body.capacity,
        remaining_capacity: body.capacity,
        region: body.region ?? null,
        fee_override: body.fee_override != null ? Math.round(body.fee_override * 100) : null,
        status: 'active',
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('deliverySlots.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/batch',
  requireAdmin,
  validateBody(batchCreateSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as z.infer<typeof batchCreateSchema>
      const startDate = new Date(body.start_date)
      const endDate = new Date(body.end_date)
      const created: unknown[] = []

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        for (const w of body.windows) {
          const result = await create('delivery_slots', {
            date: dateStr,
            start_time: `${dateStr}T${w.start}:00.000Z`,
            end_time: `${dateStr}T${w.end}:00.000Z`,
            capacity: body.capacity,
            remaining_capacity: body.capacity,
            region: body.region ?? null,
            fee_override: null,
            status: 'active',
          })
          created.push(result.data)
        }
      }
      res.status(201).json({ created: created.length, slots: created })
    } catch (error) {
      logger.error('deliverySlots.batchCreate', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  requireAdmin,
  validateBody(updateSlotSchema),
  async (req: Request, res: Response) => {
    try {
      const existing = await findById('delivery_slots', getParamId(req))
      if (!existing) {
        res.status(404).json({
          error: t('delivery.slotNotFound', undefined, { defaultValue: 'Delivery slot not found' }),
        })
        return
      }
      const body = req.body as z.infer<typeof updateSlotSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.capacity !== undefined) updates.capacity = body.capacity
      if (body.remaining_capacity !== undefined)
        updates.remaining_capacity = body.remaining_capacity
      if (body.fee_override !== undefined) {
        updates.fee_override =
          body.fee_override != null ? Math.round(body.fee_override * 100) : null
      }
      if (body.status !== undefined) updates.status = body.status

      const result = await updateById('delivery_slots', getParamId(req), updates)
      res.json(result.data)
    } catch (error) {
      logger.error('deliverySlots.update', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
