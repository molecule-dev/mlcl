/**
 * Receipts handler — accepts a base64-encoded receipt image, resizes
 * it via `@molecule/api-image-sharp`, and uploads to the configured
 * uploads bond (S3 in production via `@molecule/api-uploads-s3`,
 * filesystem in dev/CI via `@molecule/api-uploads-filesystem`).
 *
 * Returns the uploaded file's public URL so the frontend can persist
 * it on the expense row's `receipt_url`. The `data:` URL fallback
 * remains as a defense-in-depth path when the bonded provider is
 * unavailable, but the primary code path always produces a real
 * uploaded artifact in S3 (or the local filesystem in dev).
 *
 * @module
 */

import { Readable } from 'node:stream'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { resize } from '@molecule/api-image'
import { validateBody } from '@molecule/api-middleware-validation'
import {
  getProvider as getUploadProvider,
  hasProvider as hasUploadProvider,
} from '@molecule/api-uploads'

const router = Router()

// Attacker-chosen content types are NOT stored or served: a receipt is one
// of these four things (fleet pattern: job-board/api/src/handlers/uploads.ts).
// Everything else — notably text/html and image/svg+xml, which browsers may
// execute when the stored URL is opened — is rejected before any work.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

const receiptUploadSchema = z.object({
  image_base64: z.string().min(1),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
})

router.post('/', validateBody(receiptUploadSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const { image_base64, mime_type, filename } = req.body as z.infer<typeof receiptUploadSchema>
  const mime = (mime_type ?? 'image/jpeg').toLowerCase()
  if (!ALLOWED_MIME.has(mime)) {
    return res.status(400).json({
      error: t('receipts.unsupportedType', undefined, {
        defaultValue: 'Unsupported receipt type. Use JPEG, PNG, WebP, or PDF.',
      }),
    })
  }

  const buffer = Buffer.from(image_base64, 'base64')
  if (buffer.length === 0) {
    return res
      .status(400)
      .json({ error: t('receipts.empty', undefined, { defaultValue: 'Empty receipt' }) })
  }

  let resized: Buffer = buffer
  try {
    resized = await resize(buffer, { width: 1200 })
  } catch (err) {
    // sharp may not be available in CI; fall through with the original.
    console.warn('Receipt resize failed, using original buffer', err)
  }

  const safeFilename = String(filename ?? `receipt-${Date.now()}.jpg`).replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  )

  if (hasUploadProvider()) {
    try {
      const provider = getUploadProvider()
      const stream = Readable.from(resized)
      const uploaded = provider.upload(
        'receipt',
        stream,
        { filename: `${userId}-${safeFilename}`, encoding: 'binary', mimeType: mime },
        (err) => {
          console.warn('Receipt upload stream error', err)
        },
      )
      if (uploaded.uploadPromise) await uploaded.uploadPromise
      const url = uploaded.location ?? null
      if (url) {
        return res.status(201).json({
          url,
          location: url,
          id: uploaded.id,
          size: resized.length,
          mimeType: mime,
        })
      }
    } catch (err) {
      // Fall through to inline data URL so the user always gets a
      // working `receipt_url` even if S3 creds aren't filled. The
      // failure is logged so dev.log surfaces real provider errors.
      console.warn('Bonded uploads provider failed; falling back to data: URL', err)
    }
  }

  const url = `data:${mime};base64,${resized.toString('base64')}`
  res.status(201).json({ url, location: url, size: resized.length, mimeType: mime })
})

export default router
