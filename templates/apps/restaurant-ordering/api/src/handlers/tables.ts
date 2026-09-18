import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { RestaurantOrderingLimits } from '../tiers.js'

const router = Router()

const createTableSchema = z.object({
  table_number: z.coerce.number().int().positive(),
  seats: z.coerce.number().int().positive(),
  section: z.string().optional(),
})

const updateTableSchema = z.object({
  table_number: z.coerce.number().int().positive().optional(),
  seats: z.coerce.number().int().positive().optional(),
  section: z.string().optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
})

// List tables (operator only — ALWAYS scoped to the authenticated owner).
// Tables are multi-tenant (owned by user_id), so an unauthenticated or
// unscoped query would leak every restaurant's tables.
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.status) {
      where.push({ field: 'status', operator: '=', value: String(req.query.status) })
    }
    const tables = await findMany<Record<string, unknown>>('tables', {
      where,
      limit: 200,
      orderBy: [{ field: 'table_number', direction: 'asc' }],
    })
    res.json({ data: tables, total: tables.length })
  } catch (error) {
    logger.error('tables.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get single table with active orders (operator only — owner check)
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const table = await findById<Record<string, unknown>>('tables', req.params.id)
    if (!table) {
      return res
        .status(404)
        .json({ error: t('tables.notFound', {}, { defaultValue: 'Table not found' }) })
    }
    if (table.user_id && table.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const activeOrders = await findMany<Record<string, unknown>>('orders', {
      where: [
        { field: 'table_id', operator: '=', value: req.params.id },
        { field: 'status', operator: 'in', value: ['pending', 'preparing', 'ready'] },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })
    res.json({ ...table, activeOrders })
  } catch (error) {
    logger.error('tables.getTable', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get table by number — operator-scoped lookup. Tables are owned by users
// (multi-tenant), so unscoped queries would return another restaurant's
// table when two operators happen to use the same table number.
router.get('/by-number/:number', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const table = await findOne<Record<string, unknown>>('tables', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'table_number', operator: '=', value: Number(req.params.number) },
    ])
    if (!table) {
      return res
        .status(404)
        .json({ error: t('tables.notFound', {}, { defaultValue: 'Table not found' }) })
    }
    res.json(table)
  } catch (error) {
    logger.error('tables.getByNumber', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create table (operator only)
router.post(
  '/',
  enforceLimit<RestaurantOrderingLimits>({
    limitType: 'maxTables',
    getLimit: (limits) => limits.maxTables,
    getCurrent: async (userId) =>
      count('tables', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as RequestHandler,
  validateBody(createTableSchema) as RequestHandler,
  async (req, res) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      }
      const body = req.body as z.infer<typeof createTableSchema>
      const result = await create<Record<string, unknown>>('tables', {
        user_id: userId,
        table_number: body.table_number,
        seats: body.seats,
        section: body.section || 'main',
        status: 'available',
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('tables.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update table status (operator only — owner check)
router.put('/:id/status', validateBody(updateStatusSchema) as RequestHandler, async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('tables', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('tables.notFound', {}, { defaultValue: 'Table not found' }) })
    }
    if (existing.user_id && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as z.infer<typeof updateStatusSchema>
    const result = await updateById<Record<string, unknown>>('tables', id, { status: body.status })
    res.json(result.data)
  } catch (error) {
    logger.error('tables.updateStatus', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update table (operator only — owner check)
router.put('/:id', validateBody(updateTableSchema) as RequestHandler, async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('tables', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('tables.notFound', {}, { defaultValue: 'Table not found' }) })
    }
    if (existing.user_id && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as z.infer<typeof updateTableSchema>
    const updates: Record<string, unknown> = {}
    if (body.table_number !== undefined) updates.table_number = body.table_number
    if (body.seats !== undefined) updates.seats = body.seats
    if (body.section !== undefined) updates.section = body.section
    if (body.status !== undefined) updates.status = body.status

    const result = await updateById<Record<string, unknown>>('tables', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('tables.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Generate QR code data for table (operator only — owner check).
// The URL must encode the operator's user_id so the guest menu reaches the
// right restaurant — multiple restaurants on the same dev server can both
// have a "table 1", and the guest endpoint requires owner_id to scope the
// menu lookup and order creation.
router.get('/:id/qr', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const table = await findById<Record<string, unknown>>('tables', req.params.id)
    if (!table) {
      return res
        .status(404)
        .json({ error: t('tables.notFound', {}, { defaultValue: 'Table not found' }) })
    }
    if (table.user_id && table.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const ownerId = table.user_id as string
    // Prefer QR_BASE_URL env, then the request's Origin/Referer (handles
    // localhost / LAN / Tailscale / production without redeploy), then
    // fall back to the request's protocol+host. Hardcoding port 5173 broke
    // any non-default Vite port (e.g. multi-app smoke runs on 3100).
    const originHeader = req.get('origin') || req.get('referer')
    const protocol = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol
    const host =
      (req.headers['x-forwarded-host'] as string) ||
      req.get('host') ||
      `localhost:${process.env.PORT || 4000}`
    const baseUrl =
      process.env.QR_BASE_URL ||
      (originHeader ? new URL(originHeader).origin : `${protocol}://${host}`)
    const tableNumber = table.table_number as number
    const qs = new URLSearchParams()
    if (ownerId) qs.set('owner', ownerId)
    qs.set('table', String(tableNumber))
    const qrUrl = `${baseUrl}/menu/guest?${qs.toString()}`
    res.json({
      table_number: tableNumber,
      owner_id: ownerId,
      url: qrUrl,
      label: t(
        'tables.scanToOrder',
        { number: tableNumber },
        { defaultValue: `Scan to order from Table ${tableNumber}` },
      ),
    })
  } catch (error) {
    logger.error('tables.qr', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete table (operator only — owner check by user_id)
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const existing = await findById<Record<string, unknown>>('tables', req.params.id)
    if (!existing) return res.status(204).end()
    if (existing.user_id && existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('tables', req.params.id)
    res.status(204).end()
  } catch (error) {
    logger.error('tables.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
