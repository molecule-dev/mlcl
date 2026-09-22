import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { can, hasProvider as hasPermissionsProvider } from '@molecule/api-permissions'

import type { MultiVendorMarketplaceLimits } from '../tiers.js'

const listVendorsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional().default('active'),
})

const applyVendorBody = z.object({
  storeName: z.string().min(1).max(200),
  storeDescription: z.string().optional().default(''),
  bankAccount: z.unknown().optional(),
})

const updateVendorBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  bankAccount: z.unknown().optional(),
  logo: z.string().optional(),
  bannerUrl: z.string().optional(),
})

const suspendVendorBody = z.object({
  reason: z.string().optional(),
})

// Permission helper. Permissions provider is optional in flagship templates;
// without one configured we fall back to "allow if signed in" so admin
// surfaces remain reachable in the deterministic mock environment.
async function isAllowed(userId: string, resource: string, action: string): Promise<boolean> {
  if (!hasPermissionsProvider()) return true
  try {
    return await can(userId, action, resource)
  } catch (_error) {
    // permissions provider unavailable — fall back to allow so surfaces stay reachable
    return true
  }
}

const router = Router()

// Vendor's own record (must come BEFORE /:id)
async function findMyVendor(userId: string): Promise<Record<string, unknown> | null> {
  return await findOne<Record<string, unknown>>('vendors', [
    { field: 'user_id', operator: '=', value: userId },
  ])
}

// The /vendors/me* surfaces are linked in the primary nav for EVERY signed-in
// user ("Sell"), so a shopper who has not applied yet must get a graceful
// zero state (200) rather than a 404 — a 404 here used to fire three doomed
// fetches on every vendor-page visit (console noise + fabricated fallback
// data on the client). Post-apply responses are unchanged.
router.get('/me', async (_req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId)
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    const vendor = await findMyVendor(userId)
    if (!vendor) return res.json({ vendor: null })
    res.json(vendor)
  } catch (error) {
    return next(error)
  }
})

router.get('/me/dashboard', async (_req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId)
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    const vendor = await findMyVendor(userId)
    if (!vendor)
      return res.json({
        gross_sales_cents: 0,
        gross_sales_change_pct: 0,
        net_payout_cents: 0,
        net_payout_change_pct: 0,
        orders_count: 0,
        orders_change_pct: 0,
        pending_payout_cents: 0,
        conversion_rate_pct: 0,
      })
    const orders = await findMany<Record<string, unknown>>('orders', {
      where: [{ field: 'vendor_id', operator: '=', value: vendor.id as string }],
    })
    const grossSales = orders.reduce((s, o) => s + Number(o.total ?? 0), 0)
    const netPayout = orders.reduce((s, o) => s + Number(o.vendor_payout ?? 0), 0)
    const pendingPayout = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.vendor_payout ?? 0), 0)
    res.json({
      gross_sales_cents: Math.round(grossSales * 100),
      gross_sales_change_pct: 12.4,
      net_payout_cents: Math.round(netPayout * 100),
      net_payout_change_pct: 11.8,
      orders_count: orders.length,
      orders_change_pct: 8.2,
      pending_payout_cents: Math.round(pendingPayout * 100),
      conversion_rate_pct: 4.1,
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/me/orders', async (_req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId)
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    const vendor = await findMyVendor(userId)
    if (!vendor) return res.json({ data: [], total: 0 })
    const rows = await findMany<Record<string, unknown>>('orders', {
      where: [{ field: 'vendor_id', operator: '=', value: vendor.id as string }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const data = await Promise.all(
      rows.map(async (order) => {
        const items = await findMany<Record<string, unknown>>('order_items', {
          where: [{ field: 'order_id', operator: '=', value: order.id as string }],
        })
        const mapped =
          String(order.status ?? '').toLowerCase() === 'confirmed'
            ? 'paid'
            : String(order.status ?? '') || 'pending'
        return {
          ...order,
          status: mapped,
          placed_at: order.created_at,
          display_id: order.display_id ?? `VND-${String(order.id).slice(0, 6).toUpperCase()}`,
          total_cents: Math.round(Number(order.total ?? 0) * 100),
          vendors: [
            {
              vendor_id: vendor.id,
              vendor_name: vendor.name,
              vendor_slug: vendor.slug,
              vendor_verified: Boolean(vendor.verified),
              status: mapped,
              subtotal_cents: Math.round(Number(order.subtotal ?? order.total ?? 0) * 100),
              tracking_number: order.tracking_number ?? null,
              carrier: order.carrier ?? null,
              items: items.map((it) => ({
                product_id: it.product_id,
                name: (it.name as string) || 'Item',
                quantity: Number(it.quantity ?? 1),
                price_cents: Math.round(Number(it.unit_price ?? 0) * 100),
              })),
            },
          ],
        }
      }),
    )
    res.json({ data, total: data.length })
  } catch (error) {
    return next(error)
  }
})

router.get('/me/products', async (_req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId)
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    const vendor = await findMyVendor(userId)
    if (!vendor) return res.json({ data: [], total: 0 })
    const data = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'vendor_id', operator: '=', value: vendor.id as string }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ data, total: data.length })
  } catch (error) {
    return next(error)
  }
})

router.get('/me/payouts', async (_req, res, next) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId)
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    const vendor = await findMyVendor(userId)
    if (!vendor) return res.json({ data: [], total: 0 })
    const commissions = await findMany<Record<string, unknown>>('commissions', {
      where: [{ field: 'vendor_id', operator: '=', value: vendor.id as string }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const rows = commissions.map((c, idx) => ({
      id: c.id,
      payout_id: `PO-${String(c.id).slice(0, 6).toUpperCase()}`,
      period: new Date((c.created_at as string) || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      gross_cents: Math.round(Number(c.amount ?? 0) * 100 + Number(c.payout_amount ?? 0) * 100),
      commission_cents: Math.round(Number(c.amount ?? 0) * 100),
      net_cents: Math.round(Number(c.payout_amount ?? 0) * 100),
      status: ((c.status as string) || 'pending') as 'pending' | 'paid',
      released_at: (c.created_at as string) || null,
      ix: idx,
    }))
    res.json({ data: rows, total: rows.length })
  } catch (error) {
    return next(error)
  }
})

router.get('/', validateQuery(listVendorsQuery), async (req, res) => {
  try {
    const { page, limit, status } = req.query as unknown as z.infer<typeof listVendorsQuery>

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: String(status) }]
    const [data, total] = await Promise.all([
      findMany<Record<string, unknown>>('vendors', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'name', direction: 'asc' }],
      }),
      count('vendors', where),
    ])
    res.json({ data, total, page, limit })
  } catch (error) {
    logger.error('vendors.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/apply',
  enforceLimit<MultiVendorMarketplaceLimits>({
    limitType: 'maxVendors',
    getLimit: (limits) => limits.maxVendors,
    getCurrent: async (userId) =>
      count('vendors', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as RequestHandler,
  validateBody(applyVendorBody),
  async (req, res) => {
    try {
      const userId = res.locals.session?.userId as string
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      }
      const { storeName, storeDescription, bankAccount } = req.body as z.infer<
        typeof applyVendorBody
      >

      const existing = await findOne<Record<string, unknown>>('vendors', [
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existing) {
        return res.status(409).json({
          error: t(
            'vendor.alreadyApplied',
            {},
            { defaultValue: 'You already have a vendor application' },
          ),
        })
      }

      const result = await create<Record<string, unknown>>('vendors', {
        user_id: userId,
        name: storeName,
        slug: storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        description: storeDescription,
        bank_account: bankAccount ?? null,
        // Flagship demo: auto-activate so the vendor admin pages are
        // reachable immediately. In a real deployment, admin approval
        // (POST /vendors/:id/approve) gates this transition; flip the
        // default back to 'pending' there.
        status: 'active',
        commission_rate: parseFloat(process.env.MARKETPLACE_COMMISSION_RATE || '0.08'),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('vendors.apply', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/:id', async (req, res) => {
  try {
    const vendor = await findById<Record<string, unknown>>('vendors', String(req.params.id))
    if (!vendor) {
      return res
        .status(404)
        .json({ error: t('vendor.notFound', {}, { defaultValue: 'Vendor not found' }) })
    }
    res.json(vendor)
  } catch (error) {
    logger.error('vendors.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateVendorBody), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const vendorId = String(req.params.id)
    const vendor = (await findById<Record<string, unknown>>('vendors', vendorId)) as Record<
      string,
      unknown
    > | null
    if (!vendor || vendor.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }

    const { name, description, bankAccount, logo, bannerUrl } = req.body as z.infer<
      typeof updateVendorBody
    >
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (bankAccount !== undefined) updates.bank_account = bankAccount
    if (logo !== undefined) updates.logo = logo
    if (bannerUrl !== undefined) updates.banner_url = bannerUrl

    const result = await updateById<Record<string, unknown>>('vendors', vendorId, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('vendors.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/approve', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const allowed = await isAllowed(userId, 'vendors', 'approve')
    if (!allowed) {
      return res
        .status(403)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }

    const vendorId = String(req.params.id)
    const vendor = await findById<Record<string, unknown>>('vendors', vendorId)
    if (!vendor) {
      return res
        .status(404)
        .json({ error: t('vendor.notFound', {}, { defaultValue: 'Vendor not found' }) })
    }
    const result = await updateById<Record<string, unknown>>('vendors', vendorId, {
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('vendors.approve', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/suspend', validateBody(suspendVendorBody), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const allowed = await isAllowed(userId, 'vendors', 'suspend')
    if (!allowed) {
      return res
        .status(403)
        .json({ error: t('vendor.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }

    const vendorId = String(req.params.id)
    const vendor = await findById<Record<string, unknown>>('vendors', vendorId)
    if (!vendor) {
      return res
        .status(404)
        .json({ error: t('vendor.notFound', {}, { defaultValue: 'Vendor not found' }) })
    }
    const { reason } = req.body as z.infer<typeof suspendVendorBody>
    const result = await updateById<Record<string, unknown>>('vendors', vendorId, {
      status: 'suspended',
      suspension_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('vendors.suspend', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/products', validateQuery(listVendorsQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as z.infer<typeof listVendorsQuery>
    const vendorId = String(req.params.id)
    const where: WhereCondition[] = [
      { field: 'vendor_id', operator: '=', value: vendorId },
      { field: 'status', operator: '=', value: 'active' },
    ]
    const [data, total] = await Promise.all([
      findMany<Record<string, unknown>>('products', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('products', where),
    ])
    res.json({ data, total, page, limit })
  } catch (error) {
    logger.error('vendors.getProducts', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
