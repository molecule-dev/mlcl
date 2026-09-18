import type { Response } from 'express'
import { Router } from 'express'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const requireSession = (res: Response): string | null => {
  const userId = res.locals.session?.userId as string | undefined
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return userId
}

/**
 * Aggregate KPI stats for the admin dashboard. Authenticated; any logged-in user
 * can hit it for now (no admin-role gating in this template). Returns:
 *  - orders: total order count
 *  - revenue: sum of order totals (cents)
 *  - newCustomers: distinct user_ids that placed an order in the last 30 days
 *  - products: total product count
 *  - pending: count of orders not yet shipped/delivered/cancelled
 *  - completed: count of orders in 'delivered' status
 */
router.get('/stats', async (_req, res) => {
  try {
    if (!requireSession(res)) return

    const orders = await findMany<Record<string, unknown>>('orders', { limit: 5000 })
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0)
    const pending = orders.filter((o) => {
      const status = String(o.status ?? '')
      return status === 'confirmed' || status === 'processing' || status === 'pending'
    }).length
    const completed = orders.filter((o) => String(o.status ?? '') === 'delivered').length

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recent = orders.filter((o) => {
      const created = o.created_at ? new Date(o.created_at as string) : null
      return created instanceof Date && !Number.isNaN(created.valueOf()) && created >= thirtyDaysAgo
    })
    const newCustomers = new Set(recent.map((o) => o.user_id)).size

    const totalProducts = await count('products', [])

    res.json({
      orders: totalOrders,
      revenue: totalRevenue,
      newCustomers,
      products: totalProducts,
      pending,
      completed,
    })
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * List ALL orders (admin view, no user_id filter). Hydrates `customer_name`
 * from the user's email so the table can show something other than the raw
 * UUID. Supports `status`, `q` (id substring), and pagination.
 */
router.get('/orders', async (req, res) => {
  try {
    if (!requireSession(res)) return

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const { status, q } = req.query

    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const [orders, total] = await Promise.all([
      findMany<Record<string, unknown>>('orders', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('orders', where),
    ])

    let filtered = orders
    if (q) {
      const needle = String(q).toLowerCase()
      filtered = orders.filter((o) =>
        String(o.id ?? '')
          .toLowerCase()
          .includes(needle),
      )
    }

    const userIds = Array.from(new Set(filtered.map((o) => o.user_id).filter(Boolean))) as string[]
    const userMap = new Map<string, string>()
    for (const id of userIds) {
      const u = await findById<Record<string, unknown>>('users', id)
      if (u) {
        const email = String(u.email ?? '')
        const name = String((u as { name?: unknown }).name ?? '') || email.split('@')[0] || email
        userMap.set(id, name)
      }
    }

    const data = filtered.map((o) => ({
      ...o,
      customer_name: userMap.get(String(o.user_id)) ?? '',
    }))

    res.json({ data, total, page, limit })
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Hydrate one order with its line items and customer name. Used by the admin
 * order detail / cancel modal.
 */
router.get('/orders/:id', async (req, res) => {
  try {
    if (!requireSession(res)) return
    const id = String(req.params.id)
    const order = await findById<Record<string, unknown>>('orders', id)
    if (!order) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    const items = await findMany<Record<string, unknown>>('order_items', {
      where: [{ field: 'order_id', operator: '=', value: id }],
    })
    const userObj = order.user_id
      ? await findById<Record<string, unknown>>('users', order.user_id as string)
      : null
    const customerName = userObj
      ? String((userObj as { name?: unknown }).name ?? '') || String(userObj.email ?? '')
      : ''
    res.json({ ...order, items, customer_name: customerName })
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Allow admins to update an order's status. Mirrors `PUT /orders/:id/status`
 * but doesn't require the order to belong to the caller.
 */
router.put('/orders/:id/status', async (req, res) => {
  try {
    if (!requireSession(res)) return
    const valid = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
    const status = String((req.body ?? {}).status ?? '')
    if (!valid.includes(status)) {
      return res
        .status(400)
        .json({ error: t('order.invalidStatus', {}, { defaultValue: 'Invalid status' }) })
    }
    const result = await updateById<Record<string, unknown>>('orders', String(req.params.id), {
      status,
      updated_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
    }
    res.json(result.data)
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * List unique customers (any user with at least one order, plus the admin
 * themselves). Used by the dashboard KPI grid for "New Customers" and any
 * future admin customer list.
 */
router.get('/customers', async (req, res) => {
  try {
    if (!requireSession(res)) return
    const orders = await findMany<Record<string, unknown>>('orders', { limit: 5000 })
    const ids = Array.from(new Set(orders.map((o) => o.user_id).filter(Boolean))) as string[]
    const customers: Record<string, unknown>[] = []
    for (const id of ids) {
      const u = await findById<Record<string, unknown>>('users', id)
      if (u) customers.push({ id: u.id, email: u.email, name: (u as { name?: unknown }).name })
    }

    const days = Number(req.query.daysSince) || 30
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    const recent = orders.filter((o) => {
      const created = o.created_at ? new Date(o.created_at as string).getTime() : 0
      return created >= since
    })
    const newCustomerIds = new Set(recent.map((o) => o.user_id))

    res.json({ data: customers, total: customers.length, newCustomers: newCustomerIds.size })
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * List products with low stock (default threshold 10 units). Used by the
 * "Low Stock Alerts" card on the admin dashboard.
 */
router.get('/low-stock', async (req, res) => {
  try {
    if (!requireSession(res)) return
    const threshold = Number(req.query.threshold) || 10
    const products = await findMany<Record<string, unknown>>('products', { limit: 1000 })
    const out: Record<string, unknown>[] = []
    for (const p of products) {
      const stock = await findOne<Record<string, unknown>>('inventory', [
        { field: 'product_id', operator: '=', value: p.id as string },
      ])
      const available = Number(stock?.available ?? 0)
      if (available <= threshold) {
        out.push({
          id: p.id,
          name: p.name,
          stock: available,
          severity: available === 0 ? 'critical' : available <= 5 ? 'critical' : 'low',
        })
      }
    }
    out.sort((a, b) => Number(a.stock) - Number(b.stock))
    res.json({ data: out, total: out.length, threshold })
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Restock a product by adding a fixed number of units (default 25) to its
 * inventory. Returns the updated inventory row.
 */
router.post('/products/:id/restock', async (req, res) => {
  try {
    if (!requireSession(res)) return
    const productId = String(req.params.id)
    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }
    const qty = Number((req.body ?? {}).quantity) || 25

    const stock = await findOne<Record<string, unknown>>('inventory', [
      { field: 'product_id', operator: '=', value: productId },
    ])
    if (!stock) {
      const result = await create<Record<string, unknown>>('inventory', {
        product_id: productId,
        available: qty,
        reserved: 0,
        reason: 'restock',
        updated_at: new Date().toISOString(),
      })
      return res.json(result.data)
    }
    const result = await updateById<Record<string, unknown>>('inventory', stock.id as string, {
      available: Number(stock.available ?? 0) + qty,
      reason: 'restock',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Stream a CSV of orders. Used by the admin "Download Report" button.
 */
/**
 * Default admin store-wide settings shape. Used both as the seed when a
 * fresh user has nothing stored yet AND as the contract the
 * AdminSettingsPage relies on for `store / shipping / payment / tax /
 * notifications` keys.
 */
const DEFAULT_ADMIN_SETTINGS = {
  store: {
    storeName: 'Bazaar',
    storeUrl: 'bazaar.com',
    storeDescription: 'Curating the finest digital experiences for the modern world.',
    logoUrl: '',
  },
  shipping: {
    freeShippingThreshold: 75,
    standardRate: 5.99,
    expressRate: 14.99,
    estimatedDelivery: '3-5 days',
  },
  payment: {
    stripeEnabled: true,
    paypalEnabled: true,
    applePayEnabled: false,
  },
  tax: { automaticTax: true, taxRate: 8.25, taxRegion: 'US' },
  notifications: {
    orderConfirmation: true,
    shippingUpdates: true,
    marketingEmails: false,
    reviewRequests: true,
  },
} as const

interface UserOauthData {
  adminSettings?: Partial<typeof DEFAULT_ADMIN_SETTINGS>
  [key: string]: unknown
}

const readOauthData = (user: Record<string, unknown> | null): UserOauthData => {
  const raw = user?.oauthData ?? user?.oauth_data
  if (raw && typeof raw === 'object') return raw as UserOauthData
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object') return parsed as UserOauthData
    } catch (_error) {
      // Malformed JSON in oauthData — fall through to empty default
    }
  }
  return {}
}

/**
 * Read the store-wide admin settings persisted under the signed-in
 * (admin) user's oauthData.adminSettings. Returns DEFAULT_ADMIN_SETTINGS
 * when nothing has been saved yet so the UI always has a hydrated
 * baseline.
 */
router.get('/', async (_req, res) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const user = await findById<Record<string, unknown>>('users', userId)
    const oauthData = readOauthData(user)
    const settings = { ...DEFAULT_ADMIN_SETTINGS, ...(oauthData.adminSettings ?? {}) }
    res.json(settings)
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Persist the admin settings payload onto the signed-in user's
 * oauthData.adminSettings JSON column. Returns the merged settings so
 * the client can rehydrate from the response.
 */
router.put('/', async (req, res) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const body = (req.body ?? {}) as Partial<typeof DEFAULT_ADMIN_SETTINGS>
    const user = await findById<Record<string, unknown>>('users', userId)
    const oauthData = readOauthData(user)
    const merged = { ...DEFAULT_ADMIN_SETTINGS, ...(oauthData.adminSettings ?? {}), ...body }
    const nextOauthData = { ...oauthData, adminSettings: merged }
    await updateById('users', userId, { oauthData: JSON.stringify(nextOauthData) })
    res.json(merged)
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/reports/orders.csv', async (_req, res) => {
  try {
    if (!requireSession(res)) return

    const orders = await findMany<Record<string, unknown>>('orders', {
      limit: 5000,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const header = ['id', 'user_id', 'status', 'subtotal', 'tax', 'total', 'currency', 'created_at']
    const rows = orders.map((o) =>
      header
        .map((field) => {
          const v = o[field]
          if (v === null || v === undefined) return ''
          let s = String(v).replace(/"/g, '""')
          // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
          // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
          // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
          // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
          if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
          return /[",\n]/.test(s) ? `"${s}"` : s
        })
        .join(','),
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"')
    res.send([header.join(','), ...rows].join('\n'))
  } catch (_error) {
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
