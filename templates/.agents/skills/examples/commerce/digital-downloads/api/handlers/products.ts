import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  discardUploads,
  getUploads,
  hasProvider as hasUploadProvider,
  receiveUploads,
} from '@molecule/api-uploads'

const PRODUCTS_TABLE = 'products'

// Digital goods: PDFs, ebooks, fonts, design/template archives. Enforced
// SERVER-SIDE on purpose — a client can lie about Content-Type, so never trust
// the browser's declared MIME.
const ALLOWED_MIME = [
  'application/pdf',
  'application/epub+zip',
  'application/zip',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'image/png',
  'image/jpeg',
]
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

const requireUploadProvider = (_req: Request, res: Response, next: NextFunction): void => {
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('products.noProvider', undefined, {
        defaultValue: 'Upload provider not configured.',
      }),
    })
    return
  }
  next()
}

// POST / — admin uploads a new digital product: receiveUploads stores the deliverable
// (the `file` field) in the uploads bond, then the handler records a catalog row (title +
// price + the storage key). receiveUploads refuses a type outside ALLOWED_MIME (415), a
// file over MAX_BYTES (413) and a request without a file (400) before the handler runs;
// the text fields arrive in req.body as strings.
router.post(
  '/',
  requireAdmin,
  requireUploadProvider,
  receiveUploads({ field: 'file', maxFileBytes: MAX_BYTES, types: ALLOWED_MIME, maxFields: 8 }),
  async (req: Request, res: Response) => {
    const fields = req.body as Record<string, string | undefined>
    const [file] = getUploads(req, 'file')
    // A refused request must not leave its deliverable in storage with no product row.
    const refuse = async (status: number, message: string): Promise<void> => {
      await discardUploads(req)
      res.status(status).json({ error: message })
    }
    const title = (fields.title ?? '').trim()
    const price = (fields.price ?? '').trim()
    const priceCents = Number(price)
    if (!title) {
      await refuse(
        400,
        t('products.missingTitle', undefined, { defaultValue: 'A product title is required.' }),
      )
      return
    }
    if (!/^\d+$/.test(price) || !Number.isSafeInteger(priceCents)) {
      await refuse(
        400,
        t('products.badPrice', undefined, {
          defaultValue: 'Price must be a whole number of cents (>= 0).',
        }),
      )
      return
    }
    try {
      // storage_key = the uploads bond's file id. This is what /downloads
      // streams through the ownership check — it is NEVER sent to the
      // storefront (see toStorefront).
      const result = await create(PRODUCTS_TABLE, {
        title,
        description: (fields.description ?? '').trim() || null,
        price: priceCents,
        storage_key: file.id,
        filename: file.filename,
        mime_type: file.mimetype.toLowerCase(),
        created_at: new Date().toISOString(),
      })
      if (!result.data) throw new Error('The product write returned no row')
      res.status(201).json(toStorefront(result.data))
    } catch (err) {
      console.error('[products] recording the product failed', err)
      await refuse(
        500,
        t('products.saveFailed', undefined, { defaultValue: 'Could not save the product.' }),
      )
    }
  },
)

export default router
