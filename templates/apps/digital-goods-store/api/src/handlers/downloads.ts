/**
 * Downloads handler — `/api/downloads/:productId` issues a download
 * for a purchased product, and `/api/downloads/:productId/file` streams
 * the file bytes back to the buyer. Authorization: caller must hold a
 * completed purchase for the product.
 *
 * Two delivery modes:
 *
 * 1. Product has an `http(s)://` `file_url` → return that as the signed
 *    URL (caller does the GET themselves; e.g. an external CDN). The
 *    client uses `<a download href={url}>`.
 * 2. Product has no `file_url` (pure-digital sale of synthetic content)
 *    → stream a deterministic placeholder zip from `/file` so the
 *    download path is exercisable end-to-end without external storage.
 *
 * Real production deploys would wire `@molecule/api-uploads-s3` here
 * to presign an S3 GET; that work is intentionally deferred behind the
 * stream mode so the polished UI works on day one.
 */
import crypto from 'crypto'
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

function buildSignedUrl(
  fileUrl: string | null,
  productId: string,
  expiresInSeconds: number,
  baseUrl: string,
): { url: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
  // External http(s) URL → return it directly with a token (caller GETs
  // it from the CDN). This is the production code path for any product
  // whose `file_url` was uploaded to S3 / Cloudfront / etc.
  if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
    const token = crypto.randomBytes(16).toString('hex')
    const sep = fileUrl.includes('?') ? '&' : '?'
    return {
      url: `${fileUrl}${sep}token=${token}&expires=${expiresAt.getTime()}`,
      expiresAt,
    }
  }
  // No external URL → return our own /file stream endpoint so the
  // browser actually receives bytes.
  const token = crypto.randomBytes(16).toString('hex')
  return {
    url: `${baseUrl}/api/downloads/${productId}/file?token=${token}&expires=${expiresAt.getTime()}`,
    expiresAt,
  }
}

router.get('/:productId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    // Either a completed purchase OR an active license proves ownership.
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: getParamId(req, 'productId') },
        { field: 'status', operator: '=', value: 'completed' },
      ],
      limit: 1,
    })
    if (purchases.length === 0) {
      res.status(403).json({
        error: t('download.notPurchased', undefined, {
          defaultValue: 'You have not purchased this product',
        }),
      })
      return
    }

    const product = await findById<Record<string, unknown>>(
      'products',
      getParamId(req, 'productId'),
    )
    if (!product) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    const fileUrl = (product.file_url as string | null) ?? null
    const expiryHours = parseInt(process.env.DOWNLOAD_LINK_EXPIRY_HOURS ?? '24', 10)
    const baseUrl = `${req.protocol}://${req.get('host') ?? 'localhost'}`
    const signed = buildSignedUrl(
      fileUrl,
      getParamId(req, 'productId'),
      expiryHours * 3600,
      baseUrl,
    )

    const licenses = await findMany<Record<string, unknown>>('licenses', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: getParamId(req, 'productId') },
      ],
      limit: 1,
    })

    await create('download_logs', {
      user_id: userId,
      product_id: getParamId(req, 'productId'),
      license_id: licenses[0]?.id ?? null,
      ip_address: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
      signed_url: signed.url,
      expires_at: signed.expiresAt,
    })

    res.json({
      url: signed.url,
      expiresIn: expiryHours * 3600,
      expiresAt: signed.expiresAt,
      fileName: (product.file_name as string | null) ?? `${product.name as string}.zip`,
      fileSize: product.file_size,
    })
  } catch (err) {
    logger.error('downloads.getSignedUrl', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

/**
 * GET /api/downloads/:productId/file — actually deliver the bytes of a
 * purchased product whose `file_url` is internal (no external CDN).
 * The token query param + link expiry are checked against the most
 * recent `download_logs` row for this user+product, so a stale, expired,
 * or stolen token can't fetch the file.
 */
router.get('/:productId/file', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const productId = getParamId(req, 'productId')
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: productId },
        { field: 'status', operator: '=', value: 'completed' },
      ],
      limit: 1,
    })
    if (purchases.length === 0) {
      res.status(403).json({
        error: t('download.notPurchased', undefined, {
          defaultValue: 'You have not purchased this product',
        }),
      })
      return
    }
    // Validate the signed token + expiry against the most recent issued link for this
    // user+product. The issue endpoint (GET /:productId) bakes a random token + expiry into
    // download_logs.signed_url / .expires_at; without this check a stale or stolen token — or a
    // hand-crafted /file URL — downloads forever, which the docstring above wrongly promised was
    // blocked. Reject when there's no issued link, the token doesn't match, or it has expired.
    const token = typeof req.query.token === 'string' ? req.query.token : ''
    const logs = await findMany<Record<string, unknown>>('download_logs', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: productId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1,
    })
    const log = logs[0]
    const issuedToken =
      typeof log?.signed_url === 'string'
        ? (log.signed_url.match(/[?&]token=([^&]+)/)?.[1] ?? '')
        : ''
    const expiresAtMs = log?.expires_at ? new Date(log.expires_at as string).getTime() : 0
    if (!log || !token || token !== issuedToken || !(expiresAtMs > Date.now())) {
      res.status(403).json({
        error: t('download.linkInvalid', undefined, {
          defaultValue: 'This download link is invalid or has expired. Request a new one.',
        }),
      })
      return
    }

    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    const fileName =
      (product.file_name as string | null) ?? `${(product.name as string) ?? 'product'}.txt`
    const fileType = ((product.file_type as string | null) ?? 'TEXT').toUpperCase()
    // Build a deterministic placeholder body. Real bytes — not an empty
    // file — so client-side `<a download>` actually saves a usable file.
    const body = [
      `# ${product.name as string}`,
      ``,
      `License key: see your library`,
      `File type: ${fileType}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Thanks for your purchase!`,
    ].join('\n')
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/"/g, '')}"`)
    res.setHeader('Content-Length', String(Buffer.byteLength(body, 'utf8')))
    res.send(body)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/:productId/history',
  validateQuery(historyQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const { page, limit } = req.query as unknown as z.infer<typeof historyQuerySchema>
      const logs = await findMany('download_logs', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'product_id', operator: '=', value: getParamId(req, 'productId') },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      })
      res.json({ data: logs, page, limit })
    } catch (err) {
      logger.error('downloads.history', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
