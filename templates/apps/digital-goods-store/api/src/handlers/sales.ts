/**
 * Sales handler — `/api/sales`. Seller-side. Returns recent sales for
 * products owned by the current user, in the shape
 * `Dashboard` and `Sales` pages expect (snake_case fields with
 * customer + product info hydrated).
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v == null) return 0
  return Number(v)
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
    const myProducts = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'creator_id', operator: '=', value: userId }],
      limit: 1000,
    })
    if (myProducts.length === 0) {
      res.json({ data: [] })
      return
    }
    const productIds = myProducts.map((p) => p.id as string)
    const productById = new Map(myProducts.map((p) => [p.id as string, p]))
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [{ field: 'product_id', operator: 'in', value: productIds }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const sales = await Promise.all(
      purchases.map(async (purchase) => {
        const product = productById.get(purchase.product_id as string) ?? {}
        const buyer =
          (await findById<Record<string, unknown>>('users', purchase.user_id as string)) ?? {}
        const licenses = await findMany<Record<string, unknown>>('licenses', {
          where: [{ field: 'purchase_id', operator: '=', value: purchase.id }],
          limit: 1,
        })
        const license = licenses[0]
        const status =
          purchase.refunded_at != null
            ? 'refunded'
            : license != null
              ? 'licensed'
              : purchase.status === 'completed'
                ? 'licensed'
                : 'pending'
        return {
          id: purchase.id,
          product_id: purchase.product_id,
          product_name: product.name ?? '',
          product_slug: product.slug ?? '',
          customer_name: buyer.name ?? buyer.username ?? buyer.email ?? '—',
          customer_email: buyer.email ?? null,
          customer_avatar: null,
          amount_cents: toNum(purchase.amount),
          occurred_at: purchase.created_at,
          status,
          license_key: license?.license_key ?? null,
        }
      }),
    )
    res.json({ data: sales })
  } catch (err) {
    logger.error('sales.list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
