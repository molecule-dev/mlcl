import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const createInventorySchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  bin: z.string().optional(),
  onHand: z.number().int().nonnegative().default(0),
  reorderPoint: z.number().int().nonnegative().default(10),
  price: z.number().int().nonnegative().default(0),
  description: z.string().optional(),
})

const updateInventorySchema = z.object({
  name: z.string().min(1).optional(),
  bin: z.string().optional(),
  onHand: z.number().int().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  price: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
})

const adjustSchema = z.object({
  delta: z.number().int(),
  reason: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const rows = await findMany('products', {
      where: [{ field: 'userId', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 500,
    })
    res.json(rows)
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/stats', async (_req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const result = await query<{ total: number; units: number; low: number; oos: number }>(
      'SELECT COUNT(*)::int AS total, SUM("onHand")::int AS units, COUNT(*) FILTER (WHERE "onHand" <= "reorderPoint")::int AS low, COUNT(*) FILTER (WHERE "onHand" = 0)::int AS oos FROM products WHERE "userId" = $1',
      [userId],
    )
    const row = result.rows[0] ?? { total: 0, units: 0, low: 0, oos: 0 }
    res.json({
      total: Number(row.total ?? 0),
      units: Number(row.units ?? 0),
      lowStock: Number(row.low ?? 0),
      outOfStock: Number(row.oos ?? 0),
    })
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('products', id)
    if (!row) {
      return res
        .status(404)
        .json({ error: t('inventory.notFound', {}, { defaultValue: 'Item not found' }) })
    }
    if (row.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const movements = await findMany('inventory_movements', {
      where: [{ field: 'productId', operator: '=', value: id }],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 25,
    })
    res.json({ ...row, movements })
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = createInventorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const data = parsed.data
    const slug = `${data.sku.toLowerCase()}-${userId.slice(0, 8)}-${Date.now().toString(36)}`
    const result = await create('products', {
      userId,
      name: data.name,
      slug,
      description: data.description ?? null,
      price: data.price,
      sku: data.sku,
      bin: data.bin ?? null,
      onHand: data.onHand,
      reorderPoint: data.reorderPoint,
      inventory: data.onHand,
      status: 'active',
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('products', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('inventory.notFound', {}, { defaultValue: 'Item not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateInventorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const updates: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updates[k] = v
    }
    if (typeof parsed.data.onHand === 'number') updates.inventory = parsed.data.onHand
    const result = await updateById('products', id, updates)
    res.json(result.data)
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/adjust', async (req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('products', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('inventory.notFound', {}, { defaultValue: 'Item not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = adjustSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    // Apply the adjustment ATOMICALLY with a guarded conditional UPDATE rather
    // than the read (`existing.onHand`) → compute → write-absolute pattern,
    // which is a TOCTOU lost-update: two concurrent adjustments both read the
    // same on-hand count and the later write clobbers the earlier delta, and the
    // `Math.max(0, …)` silently hid oversell on a negative delta. Evaluating
    // `"onHand" + $delta` in the DB against the live row composes correctly and
    // rejects (0 rows) only when it would drive stock negative.
    const result = await query<Record<string, unknown>>(
      `UPDATE products
         SET "onHand" = "onHand" + $1, inventory = "onHand" + $1, "updatedAt" = now()
       WHERE id = $2 AND "userId" = $3 AND "onHand" + $1 >= 0
       RETURNING *`,
      [parsed.data.delta, id, userId],
    )
    if (result.rowCount === 0 || result.rows.length === 0) {
      return res.status(400).json({
        error: t(
          'inventory.insufficientStock',
          {},
          { defaultValue: 'Insufficient stock for this adjustment' },
        ),
      })
    }
    await create('inventory_movements', {
      productId: id,
      type: parsed.data.delta >= 0 ? 'in' : 'out',
      quantity: Math.abs(parsed.data.delta),
      reason: parsed.data.reason ?? 'manual_adjust',
    })
    res.json(result.rows[0])
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<unknown> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('products', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('inventory.notFound', {}, { defaultValue: 'Item not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('products', id)
    res.status(204).end()
  } catch (err) {
    console.error('inventory 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
