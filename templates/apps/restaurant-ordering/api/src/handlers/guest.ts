import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { create, findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

/**
 * Public guest endpoints — used by QR-code menu/cart flow. The owner
 * (restaurant operator) is identified by `owner_id` in the body so a
 * scanning guest can submit an order without authenticating; the order
 * is filed under that operator's `user_id`.
 *
 * The operator's owner_id comes from the QR URL the operator generates
 * (`/menu/guest?owner=<userId>&table=<n>`). If a `table_number` is
 * supplied the matching table row is looked up and seated.
 *
 * SECURITY: this endpoint is intentionally unauthenticated (public QR flow),
 * so every write is scoped to the supplied `owner_id` — a client-supplied
 * `table_id` is re-resolved against that owner before it is trusted, and menu
 * items are filtered by owner above. Because it is public it is a spam/abuse
 * surface: front it with a rate limiter / CAPTCHA (e.g. per-IP throttling on
 * `POST /guest/orders`) before exposing it to the open internet.
 */
const guestOrderSchema = z.object({
  owner_id: z.string().min(1),
  table_id: z.string().nullable().optional(),
  table_number: z.coerce.number().int().positive().nullable().optional(),
  customer_name: z.string().max(120).optional(),
  customer_email: z.string().email().optional(),
  tip_pct: z.number().min(0).max(100).optional(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().min(1),
        quantity: z.number().int().positive().max(100),
        special_instructions: z.string().max(500).optional(),
      }),
    )
    .min(1),
})

router.post('/orders', validateBody(guestOrderSchema) as RequestHandler, async (req, res) => {
  try {
    const body = req.body as z.infer<typeof guestOrderSchema>
    let subtotal = 0
    const orderItems: Array<{
      menu_item_id: string
      name: string
      quantity: number
      unit_price: number
      special_instructions: string
    }> = []

    for (const item of body.items) {
      const menuItem = await findById<Record<string, unknown>>('menu_items', item.menu_item_id)
      if (!menuItem) continue
      // Owner check: only allow items belonging to the same operator.
      if (menuItem.user_id && menuItem.user_id !== body.owner_id) continue
      // Skip sold-out items: `available === false` means the operator marked it unavailable, so
      // it must not be priced into or filed as part of the order (the menu already hides these,
      // but a public POST can name any id, including one that just went unavailable).
      if (menuItem.available === false) continue
      const price = Number(menuItem.price) || 0
      subtotal += price * item.quantity
      orderItems.push({
        menu_item_id: item.menu_item_id,
        name: String(menuItem.name),
        quantity: item.quantity,
        unit_price: price,
        special_instructions: item.special_instructions ?? '',
      })
    }

    if (orderItems.length === 0) {
      res
        .status(400)
        .json({ error: t('guest.noItems', {}, { defaultValue: 'No valid menu items in order.' }) })
      return
    }

    let tableId = body.table_id ?? null
    let tableNumber = body.table_number ?? null
    if (!tableId && tableNumber != null) {
      const table = await findOne<Record<string, unknown>>('tables', [
        { field: 'user_id', operator: '=', value: body.owner_id },
        { field: 'table_number', operator: '=', value: tableNumber },
      ])
      if (table) tableId = table.id as string
    }
    if (tableId) {
      // Re-resolve the client-supplied table_id against the operator (like the
      // table_number path above) so a guest cannot reference — or flip the
      // status of — another restaurant's table. Foreign ids are ignored.
      const table = await findOne<Record<string, unknown>>('tables', [
        { field: 'user_id', operator: '=', value: body.owner_id },
        { field: 'id', operator: '=', value: tableId },
      ])
      if (table) {
        tableNumber = (table.table_number as number) ?? tableNumber
        try {
          await updateById('tables', tableId, { status: 'occupied' })
        } catch (err) {
          logger.warn('[guest/orders] failed to mark table occupied', err)
        }
      } else {
        tableId = null
      }
    }

    const taxRate = parseFloat(process.env.RESTAURANT_TAX_RATE || '0')
    const tax = Math.round(subtotal * taxRate * 100) / 100
    // Honor the guest's chosen tip percentage (GuestCart shows it in the total
    // but it was never sent/stored, so every guest tip was silently dropped).
    const tip = Math.round(subtotal * ((body.tip_pct ?? 0) / 100) * 100) / 100
    const total = subtotal + tax + tip

    let customerId: string | null = null
    if (body.customer_email) {
      const existing = await findOne<Record<string, unknown>>('customers', [
        { field: 'user_id', operator: '=', value: body.owner_id },
        { field: 'email', operator: '=', value: body.customer_email },
      ])
      if (existing) {
        customerId = existing.id as string
      } else {
        const created = await create<Record<string, unknown>>('customers', {
          user_id: body.owner_id,
          name: body.customer_name ?? body.customer_email,
          email: body.customer_email,
        })
        customerId = (created.data?.id as string) ?? null
      }
    } else if (body.customer_name) {
      const created = await create<Record<string, unknown>>('customers', {
        user_id: body.owner_id,
        name: body.customer_name,
      })
      customerId = (created.data?.id as string) ?? null
    }

    const orderResult = await create<Record<string, unknown>>('orders', {
      user_id: body.owner_id,
      table_id: tableId,
      customer_id: customerId,
      table_number: tableNumber,
      status: 'pending',
      subtotal,
      tax,
      tip,
      total,
      currency: process.env.RESTAURANT_CURRENCY || 'USD',
    })
    const orderId = orderResult.data?.id as string

    for (const item of orderItems) {
      await create('order_items', {
        order_id: orderId,
        ...item,
        status: 'pending',
      })
    }

    broadcast('kitchen', 'new_order', {
      orderId,
      tableNumber,
      itemCount: orderItems.length,
      items: orderItems.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        special_instructions: i.special_instructions,
      })),
      createdAt: new Date().toISOString(),
    })

    res.status(201).json({ id: orderId, total, items: orderItems })
  } catch (err) {
    logger.error('[guest/orders] failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
