/**
 * Purchases handler — lists a buyer's purchases (GET) and acquires FREE products
 * (POST), generating a license key on success.
 *
 * This route does NOT process payment. Paid products are bought through the
 * Stripe checkout-session flow in `checkout.ts` (create-session → signature-verified
 * webhook → fulfilment), which the frontend uses. POST here therefore fails closed:
 * a priced product returns 402 (use checkout) and only a genuinely free (server-side
 * price 0) product mints a completed purchase + active license.
 */
import crypto from 'crypto'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

function generateLicenseKey(): string {
  const prefix = process.env.LICENSE_KEY_PREFIX ?? 'DG'
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString('hex').toUpperCase(),
  )
  return `${prefix}-${segments.join('-')}`
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

const createPurchaseSchema = z.object({
  productId: z.string().min(1),
  paymentMethodId: z.string().min(1).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const purchases = await findMany('purchases', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: purchases, page, limit })
  } catch (err) {
    logger.error('purchases.list', err)
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
        .json({ error: t('purchase.notFound', undefined, { defaultValue: 'Purchase not found' }) })
      return
    }
    const product = await findById('products', purchase.product_id as string)
    const licenses = await findMany<Record<string, unknown>>('licenses', {
      where: [{ field: 'purchase_id', operator: '=', value: getParamId(req) }],
      limit: 1,
    })
    res.json({ ...purchase, product, license: licenses[0] ?? null })
  } catch (err) {
    logger.error('purchases.get', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createPurchaseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { productId } = req.body as z.infer<typeof createPurchaseSchema>
    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product || product.status !== 'active') {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }

    // Idempotency: bail if the user already owns this product so duplicate
    // checkout submits don't generate orphan licenses.
    const existing = await findMany<Record<string, unknown>>('purchases', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: productId },
      ],
      limit: 1,
    })
    if (existing.length > 0) {
      res.status(409).json({
        error: t('purchase.alreadyOwned', undefined, {
          defaultValue: 'You already own this product',
        }),
      })
      return
    }

    const priceNum = typeof product.price === 'number' ? product.price : Number(product.price ?? 0)
    // SECURITY: this route does NOT process payment — it previously minted a
    // 'completed' purchase + active license from a bare productId, so any user could
    // acquire any PAID product for free (the real, payment-verified flow is the Stripe
    // checkout session in checkout.ts, which the frontend uses). Fail closed: only a
    // genuinely free product (server-side price 0) may be acquired here; any priced
    // product must go through checkout. [RVALL-1 payment-bypass]
    if (!(priceNum === 0)) {
      res.status(402).json({
        error: t('purchase.paymentRequired', undefined, {
          defaultValue: 'This product requires payment — use checkout.',
        }),
        errorKey: 'purchase.paymentRequired',
      })
      return
    }
    const purchaseResult = await create<Record<string, unknown>>('purchases', {
      user_id: userId,
      product_id: productId,
      amount: priceNum,
      currency: product.currency ?? 'USD',
      status: 'completed',
      payment_id: `free_${crypto.randomUUID()}`,
    })
    const purchase = purchaseResult.data as Record<string, unknown> | null
    if (!purchase) {
      res.status(500).json({
        error: t('purchase.failed', undefined, { defaultValue: 'Could not record purchase' }),
      })
      return
    }

    const licenseKey = generateLicenseKey()
    const licenseResult = await create('licenses', {
      purchase_id: purchase.id,
      product_id: productId,
      user_id: userId,
      license_key: licenseKey,
      status: 'active',
      activations: 0,
      max_activations: 3,
    })

    // Bump product stats. Best-effort — failure here doesn't undo the sale.
    // BIGINT columns come back as strings from node-pg; coerce before +.
    try {
      const toNum = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
      await updateById('products', productId, {
        total_sales: toNum(product.total_sales) + 1,
        total_revenue: toNum(product.total_revenue) + toNum(product.price),
      })
    } catch (_err) {
      // Stats failure must not undo the sale, but never swallow silently.
      logger.error('purchases.updateProductStats', _err)
    }

    res.status(201).json({
      purchase,
      license: licenseResult.data,
      licenseKey,
    })
  } catch (err) {
    logger.error('purchases.create', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
