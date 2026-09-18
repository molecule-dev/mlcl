import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
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
import { validateBody } from '@molecule/api-middleware-validation'

import type { InventoryManagementLimits } from '../tiers.js'
import { seedDemoForUserSafe } from './_seed.js'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(100),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
})

const updateWarehouseSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
})

// List warehouses (org-scoped via user_id)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const warehouses = await findMany('warehouses', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(warehouses)
  } catch (error) {
    console.error('Failed to list warehouses', error)
    res.status(500).json({
      error: t('warehouses.listFailed', {}, { defaultValue: 'Failed to list warehouses' }),
    })
  }
})

// Get warehouse with stock summary (org-scoped)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const warehouse = await findById('warehouses', id)
    if (!warehouse || warehouse.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('warehouses.notFound', {}, { defaultValue: 'Warehouse not found' }) })
      return
    }

    const stockLevels = await findMany('stock_levels', {
      where: [{ field: 'warehouse_id', operator: '=', value: id }],
      orderBy: [{ field: 'quantity', direction: 'asc' }],
    })

    const totalItems = stockLevels.reduce((sum: number, s) => sum + Number(s.quantity ?? 0), 0)
    const uniqueProducts = stockLevels.length

    res.json({
      ...warehouse,
      stock_levels: stockLevels,
      total_items: totalItems,
      unique_products: uniqueProducts,
    })
  } catch (error) {
    console.error('Failed to get warehouse', error)
    res
      .status(500)
      .json({ error: t('warehouses.getFailed', {}, { defaultValue: 'Failed to get warehouse' }) })
  }
})

// Create warehouse (entitlement-gated, org-scoped)
router.post(
  '/',
  enforceLimit<InventoryManagementLimits>({
    limitType: 'maxWarehouses',
    getLimit: (limits) => limits.maxWarehouses,
    getCurrent: async (userId) =>
      count('warehouses', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createWarehouseSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createWarehouseSchema>

      // code is globally unique, but within a single org we additionally
      // dedupe on (user_id, code) to give a clearer 409 message.
      const existing = await findOne('warehouses', [
        { field: 'code', operator: '=', value: body.code },
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existing) {
        res.status(409).json({
          error: t(
            'warehouses.codeExists',
            {},
            { defaultValue: 'A warehouse with this code already exists' },
          ),
        })
        return
      }

      const result = await create('warehouses', {
        user_id: userId,
        name: body.name,
        code: body.code,
        address: body.address ?? '',
        city: body.city ?? '',
        country: body.country ?? '',
        capacity: body.capacity ?? null,
        contact_name: body.contact_name ?? '',
        contact_email: body.contact_email ?? '',
        status: 'active',
      })

      res.status(201).json(result.data)
    } catch (error) {
      console.error('Failed to create warehouse', error)
      res.status(500).json({
        error: t('warehouses.createFailed', {}, { defaultValue: 'Failed to create warehouse' }),
      })
    }
  },
)

// Update warehouse (org-scoped)
router.put('/:id', validateBody(updateWarehouseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const existing = await findById('warehouses', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('warehouses.notFound', {}, { defaultValue: 'Warehouse not found' }) })
      return
    }

    const result = await updateById('warehouses', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to update warehouse', error)
    res.status(500).json({
      error: t('warehouses.updateFailed', {}, { defaultValue: 'Failed to update warehouse' }),
    })
  }
})

// Delete warehouse (refuses if stock exists; org-scoped)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const warehouse = await findById('warehouses', id)
    if (!warehouse || warehouse.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('warehouses.notFound', {}, { defaultValue: 'Warehouse not found' }) })
      return
    }

    const stockLevels: WhereCondition[] = [{ field: 'warehouse_id', operator: '=', value: id }]
    const remaining = await count('stock_levels', stockLevels)
    if (remaining > 0) {
      res.status(409).json({
        error: t(
          'warehouses.hasStock',
          {},
          {
            defaultValue: 'Cannot delete warehouse with existing stock. Transfer stock first.',
          },
        ),
      })
      return
    }

    await deleteById('warehouses', id)
    res.status(204).end()
  } catch (error) {
    console.error('Failed to delete warehouse', error)
    res.status(500).json({
      error: t('warehouses.deleteFailed', {}, { defaultValue: 'Failed to delete warehouse' }),
    })
  }
})

export default router
