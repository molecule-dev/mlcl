/**
 * Checkout handler — an example of gating server behavior on a feature flag.
 *
 * The public contract (`POST /checkout`) is identical for every user; behind
 * it, `isEnabled('checkout_v2', user)` from lib/flags.ts routes each request to
 * the old or the new order-creation path. Bucketing is stable per user (see
 * lib/flags.ts), so a given user always takes the same branch — no flicker
 * mid-purchase — and flipping the flag off reverts everyone to v1 within the
 * cache TTL. Every order is owner-scoped: it is stamped with, and only ever
 * created for, the authenticated caller.
 */
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { isEnabled } from '../lib/flags.js'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const checkoutSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
})

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string

  const parsed = checkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }

  const product = (await findById('products', parsed.data.product_id)) as {
    id: string
    price_cents: number
  } | null
  if (!product) {
    return res
      .status(404)
      .json({ error: t('products.notFound', undefined, { defaultValue: 'Product not found' }) })
  }

  // Read the server-side flag for THIS user, then gate the code path.
  const useV2 = await isEnabled('checkout_v2', { id: userId })

  const order = useV2
    ? await createOrderV2(userId, product, parsed.data.quantity)
    : await createOrderV1(userId, product, parsed.data.quantity)

  res.status(201).json({ ...order, checkout_version: useV2 ? 2 : 1 })
})

// Legacy flow: subtotal only, no tax line. Kept live until checkout_v2 is at
// 100% and this branch can be deleted (see the README "don't let flags
// accumulate" anti-pattern).
async function createOrderV1(
  userId: string,
  product: { id: string; price_cents: number },
  quantity: number,
): Promise<{ id: string }> {
  const subtotalCents = product.price_cents * quantity
  const result = await create('orders', {
    user_id: userId,
    product_id: product.id,
    quantity,
    subtotal_cents: subtotalCents,
    total_cents: subtotalCents,
    status: 'pending',
    created_at: new Date().toISOString(),
  })
  return result.data as { id: string }
}

// New flow behind checkout_v2: same owner, same table — only the computation
// differs (adds a tax line), so the two branches stay swappable.
async function createOrderV2(
  userId: string,
  product: { id: string; price_cents: number },
  quantity: number,
): Promise<{ id: string }> {
  const subtotalCents = product.price_cents * quantity
  const taxCents = Math.round(subtotalCents * 0.0875)
  const result = await create('orders', {
    user_id: userId,
    product_id: product.id,
    quantity,
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    total_cents: subtotalCents + taxCents,
    status: 'pending',
    created_at: new Date().toISOString(),
  })
  return result.data as { id: string }
}

export default router
