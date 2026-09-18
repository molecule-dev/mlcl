import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  connect,
  count,
  create,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { InventoryManagementLimits } from '../tiers.js'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const listTransfersQuery = z.object({
  status: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
})

const createTransferSchema = z.object({
  from_warehouse_id: z.string().min(1),
  to_warehouse_id: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})

// List transfers (org-scoped via created_by)
router.get('/', validateQuery(listTransfersQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { status, page, limit } = req.query as unknown as z.infer<typeof listTransfersQuery>

    const where: WhereCondition[] = [{ field: 'created_by', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const transfers = await findMany('stock_transfers', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(transfers)
  } catch (error) {
    console.error('Failed to list transfers', error)
    res
      .status(500)
      .json({ error: t('transfers.listFailed', {}, { defaultValue: 'Failed to list transfers' }) })
  }
})

// Get transfer details (org-scoped)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const transfer = await findById('stock_transfers', id)
    if (!transfer || transfer.created_by !== userId) {
      res
        .status(404)
        .json({ error: t('transfers.notFound', {}, { defaultValue: 'Transfer not found' }) })
      return
    }

    const items = await findMany('stock_transfer_items', {
      where: [{ field: 'transfer_id', operator: '=', value: id }],
    })

    res.json({ ...transfer, items })
  } catch (error) {
    console.error('Failed to get transfer', error)
    res
      .status(500)
      .json({ error: t('transfers.getFailed', {}, { defaultValue: 'Failed to get transfer' }) })
  }
})

// Create transfer (entitlement-gated, org-scoped, validates ownership of warehouses)
router.post(
  '/',
  enforceLimit<InventoryManagementLimits>({
    limitType: 'maxTransfers',
    getLimit: (limits) => limits.maxTransfers,
    getCurrent: async (userId) =>
      count('stock_transfers', [{ field: 'created_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTransferSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createTransferSchema>

      if (body.from_warehouse_id === body.to_warehouse_id) {
        res.status(400).json({
          error: t(
            'transfers.sameWarehouse',
            {},
            {
              defaultValue: 'Source and destination warehouses must be different',
            },
          ),
        })
        return
      }

      const fromWh = await findById('warehouses', body.from_warehouse_id)
      const toWh = await findById('warehouses', body.to_warehouse_id)
      if (!fromWh || fromWh.user_id !== userId || !toWh || toWh.user_id !== userId) {
        res.status(404).json({
          error: t(
            'transfers.warehouseNotFound',
            {},
            { defaultValue: 'One or both warehouses not found' },
          ),
        })
        return
      }

      // Validate stock availability per line
      for (const item of body.items) {
        const stock = await findOne('stock_levels', [
          { field: 'product_id', operator: '=', value: item.product_id },
          { field: 'warehouse_id', operator: '=', value: body.from_warehouse_id },
        ])
        if (!stock || Number(stock.quantity) < Number(item.quantity)) {
          res.status(400).json({
            error: t(
              'transfers.insufficientStock',
              { productId: item.product_id },
              {
                defaultValue: 'Insufficient stock for product {{productId}}',
              },
            ),
          })
          return
        }
      }

      const result = await create('stock_transfers', {
        from_warehouse_id: body.from_warehouse_id,
        to_warehouse_id: body.to_warehouse_id,
        status: 'pending',
        notes: body.notes ?? '',
        created_by: userId,
      })
      const transfer = result.data ?? {}

      for (const item of body.items) {
        await create('stock_transfer_items', {
          transfer_id: String(transfer.id),
          product_id: item.product_id,
          quantity: Number(item.quantity),
        })
      }

      res.status(201).json(transfer)
    } catch (error) {
      console.error('Failed to create transfer', error)
      res.status(500).json({
        error: t('transfers.createFailed', {}, { defaultValue: 'Failed to create transfer' }),
      })
    }
  },
)

// Complete transfer (move stock between warehouses, org-scoped)
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const transfer = await findById('stock_transfers', id)
    if (!transfer || transfer.created_by !== userId) {
      res
        .status(404)
        .json({ error: t('transfers.notFound', {}, { defaultValue: 'Transfer not found' }) })
      return
    }

    if (transfer.status !== 'pending' && transfer.status !== 'in_transit') {
      res.status(400).json({
        error: t(
          'transfers.cannotComplete',
          {},
          {
            defaultValue: 'Transfer cannot be completed in current status',
          },
        ),
      })
      return
    }

    const items = await findMany('stock_transfer_items', {
      where: [{ field: 'transfer_id', operator: '=', value: id }],
    })

    // Completing a transfer moves real stock between warehouses across several
    // coupled writes (debit source, credit destination, two movement rows, flip
    // status). These MUST be atomic. The old code read each source
    // `stock_levels.quantity` and wrote `quantity - item.quantity` as an
    // ABSOLUTE value computed from that stale read, with NO sufficiency guard —
    // two concurrent completions (or a single one racing a sale) both read the
    // same quantity and the later write clobbered the earlier debit, and a
    // missing source row silently credited the destination from nothing. We run
    // the whole thing in ONE transaction and debit the source with a single
    // CONDITIONAL UPDATE that affects 0 rows when stock is insufficient, rolling
    // the entire completion back. The abstract DataStore has no atomic decrement
    // or transaction primitive, so we use the database bond's raw connection.
    const conn = await connect()
    let updatedTransfer: Record<string, unknown> | undefined
    try {
      await conn.query('BEGIN')

      for (const item of items) {
        const productId = String(item.product_id)
        const qty = Number(item.quantity)

        const dec = await conn.query<{ quantity: number }>(
          `UPDATE stock_levels
             SET quantity = quantity - $1, updated_at = now()
           WHERE product_id = $2 AND warehouse_id = $3 AND quantity >= $1
           RETURNING quantity`,
          [qty, productId, String(transfer.from_warehouse_id)],
        )
        if (dec.rowCount === 0 || dec.rows.length === 0) {
          await conn.query('ROLLBACK')
          res.status(409).json({
            error: t(
              'transfers.insufficientStock',
              {},
              { defaultValue: 'Insufficient stock at source warehouse' },
            ),
          })
          return
        }

        const inc = await conn.query(
          `UPDATE stock_levels
             SET quantity = quantity + $1, updated_at = now()
           WHERE product_id = $2 AND warehouse_id = $3`,
          [qty, productId, String(transfer.to_warehouse_id)],
        )
        if (inc.rowCount === 0) {
          await conn.query(
            `INSERT INTO stock_levels (product_id, warehouse_id, quantity)
             VALUES ($1, $2, $3)`,
            [productId, String(transfer.to_warehouse_id), qty],
          )
        }

        await conn.query(
          `INSERT INTO stock_movements
             (product_id, warehouse_id, quantity_change, reason, reference, performed_by)
           VALUES ($1, $2, $3, 'transfer_out', $4, $5)`,
          [productId, String(transfer.from_warehouse_id), -qty, `transfer:${id}`, userId],
        )
        await conn.query(
          `INSERT INTO stock_movements
             (product_id, warehouse_id, quantity_change, reason, reference, performed_by)
           VALUES ($1, $2, $3, 'transfer_in', $4, $5)`,
          [productId, String(transfer.to_warehouse_id), qty, `transfer:${id}`, userId],
        )
      }

      const completed = await conn.query<Record<string, unknown>>(
        `UPDATE stock_transfers
           SET status = 'completed', completed_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id],
      )
      updatedTransfer = completed.rows[0]

      await conn.query('COMMIT')
    } catch (err) {
      await conn.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      conn.release()
    }

    res.json(updatedTransfer)
  } catch (error) {
    console.error('Failed to complete transfer', error)
    res.status(500).json({
      error: t('transfers.completeFailed', {}, { defaultValue: 'Failed to complete transfer' }),
    })
  }
})

// Cancel transfer (org-scoped)
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const transfer = await findById('stock_transfers', id)
    if (!transfer || transfer.created_by !== userId) {
      res
        .status(404)
        .json({ error: t('transfers.notFound', {}, { defaultValue: 'Transfer not found' }) })
      return
    }

    if (transfer.status === 'completed') {
      res.status(400).json({
        error: t(
          'transfers.cannotCancel',
          {},
          {
            defaultValue: 'Completed transfers cannot be cancelled',
          },
        ),
      })
      return
    }

    const result = await updateById('stock_transfers', id, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to cancel transfer', error)
    res.status(500).json({
      error: t('transfers.cancelFailed', {}, { defaultValue: 'Failed to cancel transfer' }),
    })
  }
})

export default router
