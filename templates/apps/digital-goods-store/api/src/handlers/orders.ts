/**
 * Orders handler — `/api/orders` and `/api/orders/:id`. The buyer's
 * order history. Each "order" in this storefront is one purchase row
 * (single-product Gumroad-style flow), shaped as `{number, total, items}`
 * for the polished order-history / order-confirm pages.
 */
import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return 0
  return Number(v)
}

async function purchaseToOrder(
  purchase: Record<string, unknown>,
  userId: string,
): Promise<Record<string, unknown>> {
  const product =
    (await findById<Record<string, unknown>>('products', purchase.product_id as string)) ?? {}
  const licenses = await findMany<Record<string, unknown>>('licenses', {
    where: [{ field: 'purchase_id', operator: '=', value: purchase.id }],
    limit: 1,
  })
  const license = licenses[0]
  const amount = toNum(purchase.amount)
  return {
    id: purchase.id,
    number: `T-${String(purchase.id ?? '')
      .slice(0, 8)
      .toUpperCase()}`,
    placed_at: purchase.created_at,
    status:
      purchase.refunded_at != null
        ? 'refunded'
        : purchase.status === 'completed'
          ? 'completed'
          : 'pending',
    total_cents: amount,
    payment_id: purchase.payment_id,
    user_id: userId,
    items: [
      {
        product_id: purchase.product_id,
        product_slug: product.slug ?? '',
        name: product.name ?? '',
        price_cents: amount,
        license_key: license?.license_key ?? null,
        file_type: product.file_type ?? null,
      },
    ],
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const orders = await Promise.all(purchases.map((p) => purchaseToOrder(p, userId)))
    res.json({ data: orders })
  } catch (err) {
    logger.error('orders.list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const purchase = await findById<Record<string, unknown>>('purchases', getParamId(req))
    if (!purchase || purchase.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('order.notFound', undefined, { defaultValue: 'Order not found' }) })
      return
    }
    const order = await purchaseToOrder(purchase, userId)
    res.json(order)
  } catch (err) {
    logger.error('orders.get', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
