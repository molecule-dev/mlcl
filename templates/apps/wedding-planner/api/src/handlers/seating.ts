/**
 * Seating chart — tables with capacity + one seat per guest.
 *
 * GET         /                    tables (with seated guests) + unassigned pool
 * POST        /tables              add a table
 * PUT         /tables/:id          rename / resize a table
 * DELETE      /tables/:id          remove a table (seats release)
 * POST        /assign              { guest_id, table_id } seat a guest
 *                                     (moves them if already seated)
 * DELETE      /unassign/:guestId  return a guest to the pool
 *
 * Capacity is advisory, not enforced: over-capacity is surfaced by the UI
 * (headcount badge turns warning) so the couple can see and resolve it.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { findWeddingForUser } from './_seed.js'

const router = Router()

const createTableSchema = z.object({
  name: z.string().min(1).max(120),
  capacity: z.number().int().min(1).max(30).optional(),
})

const updateTableSchema = createTableSchema.partial()

const assignSchema = z.object({
  guest_id: z.string().uuid(),
  table_id: z.string().uuid(),
})

const guestIdParamSchema = z.object({ guestId: z.string().min(1) })

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const [tables, assignments, guests] = await Promise.all([
      findMany('tables', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
        limit: 60,
      }),
      findMany('table_assignments', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        limit: 1000,
      }),
      findMany<{
        id: string
        name: string
        rsvp_status: string
        group_name: string | null
        side: string
      }>('guests', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: 1000,
      }),
    ])

    const guestById = new Map(guests.map((g) => [String(g.id), g]))
    const seatsByTable = new Map<
      string,
      Array<{
        id: string
        name: string
        rsvp_status: string
        group_name: string | null
        side: string
      }>
    >()
    const seated = new Set<string>()
    for (const a of assignments) {
      const guest = guestById.get(String(a.guest_id))
      if (!guest) continue
      seated.add(String(guest.id))
      const tableId = String(a.table_id)
      const list = seatsByTable.get(tableId) ?? []
      list.push(guest)
      seatsByTable.set(tableId, list)
    }

    const tablesOut = tables.map((table) => {
      const seatedGuests = seatsByTable.get(String(table.id)) ?? []
      return {
        ...table,
        guests: seatedGuests,
        seated_count: seatedGuests.length,
        over_capacity: seatedGuests.length > Number(table.capacity ?? 0),
      }
    })
    // Only attending ("yes"/"maybe" + pending) guests are seatable — declines
    // stay out of the pool entirely.
    const unassigned = guests.filter((g) => !seated.has(String(g.id)) && g.rsvp_status !== 'no')

    res.json({ tables: tablesOut, unassigned })
  } catch (err) {
    logger.error('seating GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/tables', validateBody(createTableSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    const result = await create('tables', {
      user_id: userId,
      wedding_id: String(wedding.id),
      name: req.body.name,
      capacity: req.body.capacity ?? 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('seating POST tables failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/tables/:id',
  validateParams(idParamSchema),
  validateBody(updateTableSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const table = await findById<Record<string, unknown>>('tables', id)
      if (!table || String(table.user_id) !== userId) {
        return res
          .status(404)
          .json({ error: t('seating.tableNotFound', {}, { defaultValue: 'Table not found' }) })
      }
      const result = await updateById('tables', id, {
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('seating PUT tables/:id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/tables/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const table = await findById<Record<string, unknown>>('tables', id)
    if (!table || String(table.user_id) !== userId) {
      return res
        .status(404)
        .json({ error: t('seating.tableNotFound', {}, { defaultValue: 'Table not found' }) })
    }
    // FK ON DELETE CASCADE clears the seats; guests return to the pool.
    await deleteById('tables', id)
    res.status(204).end()
  } catch (err) {
    logger.error('seating DELETE tables/:id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const [guest, table] = await Promise.all([
      findById<Record<string, unknown>>('guests', req.body.guest_id),
      findById<Record<string, unknown>>('tables', req.body.table_id),
    ])
    if (!guest || String(guest.user_id) !== userId) {
      return res
        .status(404)
        .json({ error: t('guests.notFound', {}, { defaultValue: 'Guest not found' }) })
    }
    if (!table || String(table.user_id) !== userId) {
      return res
        .status(404)
        .json({ error: t('seating.tableNotFound', {}, { defaultValue: 'Table not found' }) })
    }
    // UNIQUE(guest_id) makes re-seating an upsert-by-delete: drop any prior
    // seat, then create the new one.
    const existing = await findMany('table_assignments', {
      where: [{ field: 'guest_id', operator: '=', value: req.body.guest_id }],
      limit: 1,
    })
    for (const row of existing) {
      await deleteById('table_assignments', String(row.id))
    }
    const result = await create('table_assignments', {
      user_id: userId,
      wedding_id: String(guest.wedding_id),
      table_id: req.body.table_id,
      guest_id: req.body.guest_id,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('seating POST assign failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete(
  '/unassign/:guestId',
  validateParams(guestIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const guestId = getParamId(req, 'guestId')
      const guest = await findById<Record<string, unknown>>('guests', guestId)
      if (!guest || String(guest.user_id) !== userId) {
        return res
          .status(404)
          .json({ error: t('guests.notFound', {}, { defaultValue: 'Guest not found' }) })
      }
      const assignments = await findMany('table_assignments', {
        where: [{ field: 'guest_id', operator: '=', value: guestId }],
        limit: 5,
      })
      for (const row of assignments) {
        await deleteById('table_assignments', String(row.id))
      }
      res.status(204).end()
    } catch (err) {
      logger.error('seating DELETE unassign failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
