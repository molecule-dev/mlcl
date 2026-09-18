import connectBusboy from 'connect-busboy'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  getProvider as getUploadProvider,
  hasProvider as hasUploadProvider,
} from '@molecule/api-uploads'

const PRODUCTS_TABLE = 'products'

// Digital goods: PDFs, ebooks, fonts, design/template archives. Enforced
// SERVER-SIDE on purpose — a client can lie about Content-Type, so never trust
// the browser's declared MIME.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/epub+zip',
  'application/zip',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
])
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB — fonts / ebooks / design bundles

// The shape returned to the storefront. `price` is an integer number of cents
// (the checkout slice charges it; see commerce/stripe-checkout/).
interface StorefrontProduct {
  id: string
  title: string
  description: string | null
  price: number
  filename: string
  mime_type: string | null
  created_at: string
}

// Project a raw product row down to the storefront view. This NEVER exposes
// `storage_key` (the internal uploads-bond file id). The deliverable file is
// only ever served through the ownership-checked /downloads route — leaking the
// storage key would let anyone fetch the file without paying.
const toStorefront = (row: Record<string, unknown>): StorefrontProduct => ({
  id: row.id as string,
  title: row.title as string,
  description: (row.description as string | null) ?? null,
  price: row.price as number,
  filename: row.filename as string,
  mime_type: (row.mime_type as string | null) ?? null,
  created_at: row.created_at as string,
})

// Creating catalog products (and uploading the deliverable file) is a privileged
// action — admin only. A valid session is implied: there is no role without one.
const requireAdmin = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  if (res.locals.session.role !== 'admin') {
    res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    return
  }
  next()
}

const router = Router()

// GET / — public storefront listing. Anyone may browse what's for sale; the file
// itself stays private (served only via the ownership-checked /downloads route).
router.get('/', async (_req, res) => {
  const rows = await findMany<Record<string, unknown>>(PRODUCTS_TABLE, {
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  res.json(rows.map(toStorefront))
})

// GET /:id — public product detail. Safe fields only (never storage_key).
router.get('/:id', async (req, res) => {
  const product = (await findById(PRODUCTS_TABLE, req.params.id as string)) as Record<
    string,
    unknown
  > | null
  if (!product) {
    return res
      .status(404)
      .json({ error: t('products.notFound', undefined, { defaultValue: 'Product not found' }) })
  }
  return res.json(toStorefront(product))
})

// The size cap is enforced by the multipart parser's `fileSize` limit — the
// uploads bond only size-limits a stream that emits busboy's `'limit'` event.
const busboyMiddleware = connectBusboy({ limits: { files: 1, fileSize: MAX_BYTES, fields: 8 } })

// POST / — admin uploads a new digital product: stream the deliverable file to
// the uploads bond, then record a catalog row (title + price + the storage key).
router.post('/', requireAdmin, busboyMiddleware, (req: Request, res: Response) => {
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('products.noProvider', undefined, {
        defaultValue: 'Upload provider not configured.',
      }),
    })
    return
  }
  if (!req.busboy) {
    res.status(400).json({
      error: t('products.notMultipart', undefined, {
        defaultValue: 'Expected multipart/form-data.',
      }),
    })
    return
  }

  const fields: Record<string, string> = {}
  let responded = false
  let sawFile = false
  const sendError = (status: number, message: string): void => {
    if (responded) return
    responded = true
    if (!res.headersSent) res.status(status).json({ error: message })
  }

  req.busboy.on('field', (name: string, value: string) => {
    fields[name] = value
  })

  req.busboy.on(
    'file',
    (
      _field: string,
      stream: NodeJS.ReadableStream,
      info: { filename: string; encoding: string; mimeType: string },
    ) => {
      if (responded) {
        stream.resume()
        return
      }
      sawFile = true
      const mimetype = (info.mimeType || 'application/octet-stream').toLowerCase()
      if (!ALLOWED_MIME.has(mimetype)) {
        sendError(
          415,
          t(
            'products.badType',
            { type: mimetype },
            { defaultValue: `Unsupported file type: ${mimetype}` },
          ),
        )
        stream.resume()
        return
      }

      let limitHit = false
      stream.on('limit', () => {
        limitHit = true
        sendError(
          413,
          t('products.tooLarge', undefined, { defaultValue: 'File exceeds the 100 MB limit.' }),
        )
      })

      const file = getUploadProvider().upload('file', stream, info, (err) => {
        if (limitHit) return
        console.error('[products] provider error', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) return

      promise
        .then(async () => {
          if (responded) return
          const title = (fields.title ?? '').trim()
          const priceCents = Number.parseInt(fields.price ?? '', 10)
          if (!title) {
            sendError(
              400,
              t('products.missingTitle', undefined, {
                defaultValue: 'A product title is required.',
              }),
            )
            return
          }
          if (!Number.isInteger(priceCents) || priceCents < 0) {
            sendError(
              400,
              t('products.badPrice', undefined, {
                defaultValue: 'Price must be a whole number of cents (>= 0).',
              }),
            )
            return
          }
          // storage_key = the uploads bond's file id. This is what /downloads
          // streams through the ownership check — it is NEVER sent to the
          // storefront (see toStorefront).
          const result = await create(PRODUCTS_TABLE, {
            title,
            description: (fields.description ?? '').trim() || null,
            price: priceCents,
            storage_key: file.id,
            filename: info.filename,
            mime_type: mimetype,
            created_at: new Date().toISOString(),
          })
          responded = true
          res.status(201).json(toStorefront(result.data as Record<string, unknown>))
        })
        .catch(() => {
          // onError already produced a response; swallow to avoid an unhandled rejection.
        })
    },
  )

  req.busboy.on('finish', () => {
    if (!sawFile && !responded) {
      sendError(400, t('products.missingFile', undefined, { defaultValue: 'No file uploaded' }))
    }
  })
  req.busboy.on('error', (err: Error) => sendError(400, err.message))
  req.on('aborted', () => sendError(499, 'Client aborted upload.'))
  req.pipe(req.busboy)
})

export default router
