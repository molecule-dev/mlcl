import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const adjustStockSchema = z.object({
  product_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  quantity_change: z.number().int(),
  reason: z.string().optional(),
  reference: z.string().nullable().optional(),
})

const receiveStockSchema = z.object({
  warehouse_id: z.string().min(1),
  reference: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})

const listStockQuery = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
  low_stock: z.string().optional(),
})

const movementsQuery = z.object({
  product_id: z.string().optional(),
  warehouse_id: z.string().optional(),
  reference: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
})

/**
 * Verifies the given (or implied) warehouse belongs to the requesting user.
 * Returns 401/404 on failure; the caller should `return` immediately on
 * a non-null return value.
 */
async function ensureWarehouseOwned(
  res: Response,
  warehouseId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const userId = getUserId(res)
  if (!userId)
    return {
      ok: false,
      status: 401,
      message: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
    }
  const wh = await findById('warehouses', warehouseId)
  if (!wh || wh.user_id !== userId) {
    return {
      ok: false,
      status: 404,
      message: t('warehouses.notFound', {}, { defaultValue: 'Warehouse not found' }),
    }
  }
  return { ok: true }
}

async function ensureProductOwned(
  res: Response,
  productId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const userId = getUserId(res)
  if (!userId)
    return {
      ok: false,
      status: 401,
      message: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
    }
  const p = await findById('products', productId)
  if (!p || p.user_id !== userId) {
    return {
      ok: false,
      status: 404,
      message: t('products.notFound', {}, { defaultValue: 'Product not found' }),
    }
  }
  return { ok: true }
}

// All stock levels owned by the current user (filtered to products
// owned by the user).
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (products.length === 0) {
      res.json([])
      return
    }
    const productIds = products.map((p) => String(p.id))
    const stock = await findMany('stock_levels', {
      where: [{ field: 'product_id', operator: 'in', value: productIds }],
      limit: 5000,
    })
    res.json(stock)
  } catch (error) {
    console.error('Failed to list stock', error)
    res
      .status(500)
      .json({ error: t('stock.listFailed', {}, { defaultValue: 'Failed to list stock' }) })
  }
})

// Stock summary across all warehouses for a product
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const owned = await ensureProductOwned(res, req.params.productId as string)
    if (!owned.ok) {
      res.status(owned.status).json({ error: owned.message })
      return
    }

    const stockLevels = await findMany('stock_levels', {
      where: [{ field: 'product_id', operator: '=', value: req.params.productId as string }],
    })
    const total = stockLevels.reduce((sum: number, s) => sum + Number(s.quantity ?? 0), 0)
    res.json({
      product_id: req.params.productId,
      total_quantity: total,
      by_warehouse: stockLevels,
    })
  } catch (error) {
    console.error('Failed to get product stock', error)
    res
      .status(500)
      .json({ error: t('stock.getFailed', {}, { defaultValue: 'Failed to get stock' }) })
  }
})

// All stock for a warehouse
router.get(
  '/warehouse/:warehouseId',
  validateQuery(listStockQuery),
  async (req: Request, res: Response) => {
    try {
      const wh = await ensureWarehouseOwned(res, req.params.warehouseId as string)
      if (!wh.ok) {
        res.status(wh.status).json({ error: wh.message })
        return
      }
      const { page, limit, low_stock } = req.query as unknown as z.infer<typeof listStockQuery>

      const where: WhereCondition[] = [
        { field: 'warehouse_id', operator: '=', value: req.params.warehouseId as string },
      ]

      const stockLevels = await findMany('stock_levels', {
        where,
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        orderBy: [{ field: 'quantity', direction: 'asc' }],
      })

      if (low_stock === 'true') {
        const filtered: Array<Record<string, unknown>> = []
        for (const stock of stockLevels) {
          const product = await findById('products', String(stock.product_id))
          if (product && Number(stock.quantity) <= Number(product.low_stock_threshold)) {
            filtered.push({ ...stock, product })
          }
        }
        res.json(filtered)
        return
      }

      res.json(stockLevels)
    } catch (error) {
      console.error('Failed to get warehouse stock', error)
      res
        .status(500)
        .json({ error: t('stock.getFailed', {}, { defaultValue: 'Failed to get stock' }) })
    }
  },
)

// Adjust stock (receive / count / damage / etc.)
router.post('/adjust', validateBody(adjustStockSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as z.infer<typeof adjustStockSchema>
    const wh = await ensureWarehouseOwned(res, body.warehouse_id)
    if (!wh.ok) {
      res.status(wh.status).json({ error: wh.message })
      return
    }
    const product = await ensureProductOwned(res, body.product_id)
    if (!product.ok) {
      res.status(product.status).json({ error: product.message })
      return
    }

    const userId = res.locals.session.userId as string

    const existing = await findOne('stock_levels', [
      { field: 'product_id', operator: '=', value: body.product_id },
      { field: 'warehouse_id', operator: '=', value: body.warehouse_id },
    ])

    let stockLevel: Record<string, unknown>
    if (existing) {
      // Apply the adjustment ATOMICALLY with a guarded conditional UPDATE rather
      // than the read → `existing.quantity + change` → write-absolute pattern,
      // which is a TOCTOU: two concurrent adjustments both read the same
      // quantity, both pass the `newQuantity < 0` guard, and the later write
      // clobbers the earlier one (lost update) — and a concurrent decrement
      // could drive stock negative past the guard. `SET quantity = quantity + $1
      // WHERE quantity + $1 >= 0` is evaluated by the DB against the live row, so
      // it composes correctly and rejects (0 rows) only when it would go
      // negative. The abstract DataStore has no atomic increment, so use raw SQL.
      const adjusted = await query<{ quantity: number }>(
        `UPDATE stock_levels
           SET quantity = quantity + $1, updated_at = now()
         WHERE id = $2 AND quantity + $1 >= 0
         RETURNING *`,
        [Number(body.quantity_change), String(existing.id)],
      )
      if (adjusted.rowCount === 0 || adjusted.rows.length === 0) {
        res.status(400).json({
          error: t(
            'stock.insufficientStock',
            {},
            { defaultValue: 'Insufficient stock for this adjustment' },
          ),
        })
        return
      }
      stockLevel = adjusted.rows[0]
    } else {
      if (Number(body.quantity_change) < 0) {
        res.status(400).json({
          error: t(
            'stock.insufficientStock',
            {},
            { defaultValue: 'Insufficient stock for this adjustment' },
          ),
        })
        return
      }
      const result = await create('stock_levels', {
        product_id: body.product_id,
        warehouse_id: body.warehouse_id,
        quantity: Number(body.quantity_change),
      })
      stockLevel = result.data ?? {}
    }

    await create('stock_movements', {
      product_id: body.product_id,
      warehouse_id: body.warehouse_id,
      quantity_change: Number(body.quantity_change),
      reason: body.reason ?? 'adjustment',
      reference: body.reference ?? null,
      performed_by: userId,
    })

    res.json(stockLevel)
  } catch (error) {
    console.error('Failed to adjust stock', error)
    res
      .status(500)
      .json({ error: t('stock.adjustFailed', {}, { defaultValue: 'Failed to adjust stock' }) })
  }
})

// Stock movement history (read-only). `stock_movements` has no owner column, so
// scope by the caller's products (mirrors reports.ts GET /movements) — the
// product_id IN (owned) filter is always present and non-optional, before any
// client-supplied filter, to close the cross-tenant leak. Client-supplied
// product_id/warehouse_id are validated against ownership (404 on a foreign id)
// rather than trusted, so a foreign id can't probe existence or widen the scope.
router.get('/movements', validateQuery(movementsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { product_id, warehouse_id, reference, page, limit } = req.query as unknown as z.infer<
      typeof movementsQuery
    >

    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const productIds = products.map((p) => String(p.id))
    if (productIds.length === 0) {
      res.json([])
      return
    }

    const where: WhereCondition[] = [{ field: 'product_id', operator: 'in', value: productIds }]
    if (product_id) {
      if (!productIds.includes(product_id)) {
        res
          .status(404)
          .json({ error: t('products.notFound', {}, { defaultValue: 'Product not found' }) })
        return
      }
      where.push({ field: 'product_id', operator: '=', value: product_id })
    }
    if (warehouse_id) {
      const wh = await ensureWarehouseOwned(res, warehouse_id)
      if (!wh.ok) {
        res.status(wh.status).json({ error: wh.message })
        return
      }
      where.push({ field: 'warehouse_id', operator: '=', value: warehouse_id })
    }
    if (reference) where.push({ field: 'reference', operator: '=', value: reference })

    const movements = await findMany('stock_movements', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(movements)
  } catch (error) {
    console.error('Failed to list stock movements', error)
    res
      .status(500)
      .json({ error: t('stock.movementsFailed', {}, { defaultValue: 'Failed to list movements' }) })
  }
})

// Bulk stock receive (e.g., shipment arrival)
router.post('/receive', validateBody(receiveStockSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as z.infer<typeof receiveStockSchema>
    const wh = await ensureWarehouseOwned(res, body.warehouse_id)
    if (!wh.ok) {
      res.status(wh.status).json({ error: wh.message })
      return
    }
    const userId = res.locals.session.userId as string

    // verify every product is owned
    for (const item of body.items) {
      const owned = await ensureProductOwned(res, item.product_id)
      if (!owned.ok) {
        res.status(owned.status).json({ error: owned.message })
        return
      }
    }

    const results: Array<Record<string, unknown>> = []
    for (const item of body.items) {
      const existing = await findOne('stock_levels', [
        { field: 'product_id', operator: '=', value: item.product_id },
        { field: 'warehouse_id', operator: '=', value: body.warehouse_id },
      ])

      let stockLevel: Record<string, unknown>
      if (existing) {
        // EXPRESSION-based atomic add (not a stale-read absolute write) so
        // concurrent receives/adjustments compose instead of clobbering.
        const result = await query<Record<string, unknown>>(
          `UPDATE stock_levels
             SET quantity = quantity + $1, updated_at = now()
           WHERE id = $2
           RETURNING *`,
          [Number(item.quantity), String(existing.id)],
        )
        stockLevel = result.rows[0] ?? {}
      } else {
        const result = await create('stock_levels', {
          product_id: item.product_id,
          warehouse_id: body.warehouse_id,
          quantity: Number(item.quantity),
        })
        stockLevel = result.data ?? {}
      }

      await create('stock_movements', {
        product_id: item.product_id,
        warehouse_id: body.warehouse_id,
        quantity_change: Number(item.quantity),
        reason: 'receive',
        reference: body.reference ?? null,
        performed_by: userId,
      })

      results.push(stockLevel)
    }

    res.status(201).json(results)
  } catch (error) {
    console.error('Failed to receive stock', error)
    res
      .status(500)
      .json({ error: t('stock.receiveFailed', {}, { defaultValue: 'Failed to receive stock' }) })
  }
})

// Suppress unused-import warnings on `count` (kept for parity with helpdesk)
void count
export default router
