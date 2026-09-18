/**
 * Library handler — `/api/library`. Returns the buyer's purchases
 * hydrated with product info + license keys, in the shape the
 * `CustomerLibrary` page expects.
 *
 * This is a buyer-side read; sellers use `/api/products?mine=true`.
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
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'completed' },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const items = await Promise.all(
      purchases.map(async (purchase) => {
        const product =
          (await findById<Record<string, unknown>>('products', purchase.product_id as string)) ?? {}
        const licenses = await findMany<Record<string, unknown>>('licenses', {
          where: [{ field: 'purchase_id', operator: '=', value: purchase.id }],
          limit: 1,
        })
        const license = licenses[0]
        const downloads = await findMany<Record<string, unknown>>('download_logs', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'product_id', operator: '=', value: purchase.product_id },
          ],
          limit: 200,
        })
        return {
          id: purchase.id,
          product_id: purchase.product_id,
          product_slug: product.slug ?? '',
          name: product.name ?? '',
          cover_image: product.cover_image ?? null,
          file_type: product.file_type ?? null,
          file_size: toNum(product.file_size) || null,
          size_mb: product.file_size ? Math.round(toNum(product.file_size) / 1024 / 1024) : null,
          license_key: license?.license_key ?? null,
          purchased_at: purchase.created_at,
          version: 'v1.0',
          update_available: false,
          downloads_remaining: null,
          download_count: downloads.length,
        }
      }),
    )
    res.json({ data: items })
  } catch (err) {
    logger.error('library.list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
