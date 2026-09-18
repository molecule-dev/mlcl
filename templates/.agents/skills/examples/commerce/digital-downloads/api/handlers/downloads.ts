import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  getProvider as getUploadProvider,
  hasProvider as hasUploadProvider,
} from '@molecule/api-uploads'

const MAX_DOWNLOADS_PER_PURCHASE = 3

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const router = Router()

router.get('/:order_id', requireAuth, async (req, res) => {
  const orderId = req.params.order_id as string
  const userId = res.locals.session.userId as string

  const order = (await findById('orders', orderId)) as {
    id: string
    user_id: string
    product_id: string
    download_count: number
    status: string
  } | null
  if (!order) {
    return res
      .status(404)
      .json({ error: t('orders.notFound', undefined, { defaultValue: 'Order not found' }) })
  }
  if (order.user_id !== userId) {
    return res
      .status(403)
      .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
  }
  if (order.status !== 'paid') {
    return res
      .status(402)
      .json({ error: t('downloads.notPaid', undefined, { defaultValue: 'Order is not paid' }) })
  }
  if (order.download_count >= MAX_DOWNLOADS_PER_PURCHASE) {
    return res.status(429).json({
      error: t('downloads.exceeded', undefined, {
        defaultValue: 'Download limit reached. Contact support.',
      }),
    })
  }

  const product = (await findById('products', order.product_id)) as {
    id: string
    storage_key: string
    filename: string
    mime_type?: string
  } | null
  if (!product?.storage_key) {
    return res.status(404).json({
      error: t('downloads.fileMissing', undefined, { defaultValue: 'File no longer available' }),
    })
  }

  if (!hasUploadProvider()) {
    return res.status(503).json({
      error: t('downloads.providerUnavailable', undefined, {
        defaultValue: 'Download service unavailable.',
      }),
    })
  }

  // Increment counter BEFORE streaming — the file transfer is the auditable
  // moment of distribution. If the stream fails after this point, the counter
  // still ticks; that's the safer side to err on for access control.
  await updateById('orders', orderId, {
    download_count: order.download_count + 1,
    last_downloaded_at: new Date().toISOString(),
  })

  const stream = await getUploadProvider().getFile?.(product.storage_key)
  if (!stream) {
    return res.status(404).json({
      error: t('downloads.fileMissing', undefined, { defaultValue: 'File no longer available' }),
    })
  }

  const contentType = product.mime_type ?? 'application/octet-stream'
  const safeFilename = encodeURIComponent(product.filename)
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`)
  // [M4-2] nosniff: never let the browser sniff the streamed bytes into a type other
  // than the one we declared (defense in depth with the uploads bond's [M4-1] blocklist).
  res.setHeader('X-Content-Type-Options', 'nosniff')
  stream.pipe(res)
  return
})

router.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  const orders = await findMany('orders', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'paid' },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(orders)
})

export default router
