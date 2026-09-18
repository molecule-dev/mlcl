/**
 * Uploads handler — listing photos stored through the uploads bond.
 *
 * POST /uploads      — auth; streams one image to the uploads bond, records an
 *                       owned row, returns a same-origin serve URL.
 * GET  /uploads/:id  — public; streams a stored image back (see note below).
 *
 * The uploads bond (S3 by default) stores objects PRIVATELY and exposes no
 * presigned-URL method, so uploads go THROUGH this API (multipart POST →
 * `provider.upload`) and reads come back THROUGH it (`provider.getFile`) — never
 * from a raw bucket URL, which 403s the moment you switch off the local
 * filesystem bond. Mirrors the profile-photo / file-attachments molecule pattern.
 */
import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  getProvider as getUploadProvider,
  hasProvider as hasUploadProvider,
} from '@molecule/api-uploads'

const UPLOADS_TABLE = 'uploads'

// Images only. Enforced SERVER-SIDE on purpose — a client can lie about
// Content-Type, so never trust the browser's declared MIME.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 10 * 1024 * 1024

const router = Router()

// The size cap is enforced by the multipart parser's `fileSize` limit — the
// uploads bond only size-limits a stream that emits busboy's `'limit'` event.
const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_BYTES, fields: 0 },
})

// POST /api/uploads — an authenticated host uploads one listing photo. Streams
// the file to the uploads bond, records an OWNED row, and returns a same-origin
// serve URL the client stores in the listing's `images` array.
router.post('/', busboyMiddleware, (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('uploads.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }
  if (!req.busboy) {
    res.status(400).json({
      error: t('uploads.notMultipart', {}, { defaultValue: 'Expected multipart/form-data.' }),
    })
    return
  }

  let responded = false
  let sawFile = false
  const sendError = (status: number, message: string): void => {
    if (responded) return
    responded = true
    if (!res.headersSent) res.status(status).json({ error: message })
  }

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
        sendError(415, t('uploads.badType', {}, { defaultValue: 'Unsupported image type.' }))
        stream.resume()
        return
      }

      let size = 0
      let limitHit = false
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
      })
      stream.on('limit', () => {
        limitHit = true
        sendError(
          413,
          t('uploads.tooLarge', {}, { defaultValue: 'Image exceeds the 10 MB limit.' }),
        )
      })

      const file = getUploadProvider().upload('file', stream, info, (err) => {
        if (limitHit) return
        console.error('[uploads] provider error', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) return

      promise
        .then(async () => {
          if (responded) return
          // Own the file: persist the provider id + uploader. The serve route can
          // only stream back an id that exists here, and the owner can later manage it.
          const result = await create<{ id: string }>(UPLOADS_TABLE, {
            user_id: userId,
            file_id: file.id,
            filename: info.filename,
            mimetype,
            size,
            created_at: new Date().toISOString(),
          })
          const row = result.data
          if (!row) {
            sendError(
              500,
              t('uploads.saveFailed', {}, { defaultValue: 'Could not save the upload.' }),
            )
            return
          }
          responded = true
          res.status(201).json({ id: row.id, url: `/api/uploads/${row.id}` })
        })
        .catch(() => {
          // onError already produced a response; swallow to avoid an unhandled rejection.
        })
    },
  )

  req.busboy.on('finish', () => {
    if (!sawFile && !responded) {
      sendError(400, t('uploads.missingFile', {}, { defaultValue: 'No file uploaded.' }))
    }
  })
  req.busboy.on('error', (err: Error) => sendError(400, err.message))
  req.on('aborted', () => sendError(499, 'Client aborted upload.'))
  req.pipe(req.busboy)
})

// GET /api/uploads/:id — stream a stored listing photo. PUBLIC on purpose:
// listing photos are shown to anonymous marketplace visitors (GET /api/listings
// is a public read) and rendered as a plain <img src>, so the bytes must be
// fetchable without a session. The row id is an unguessable UUID and the route is
// scoped to this uploads registry — a raw bucket key can never be fetched here.
router.get('/:id', async (req: Request, res: Response) => {
  const id = getParamId(req)
  const row = (await findById(UPLOADS_TABLE, id)) as {
    id: string
    file_id: string
    mimetype: string
  } | null
  if (!row) {
    res.status(404).json({ error: t('uploads.notFound', {}, { defaultValue: 'Image not found.' }) })
    return
  }
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('uploads.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }
  const stream = await getUploadProvider().getFile?.(row.file_id)
  if (!stream) {
    res.status(404).json({ error: t('uploads.notFound', {}, { defaultValue: 'Image not found.' }) })
    return
  }
  res.setHeader('Content-Type', row.mimetype || 'application/octet-stream')
  // [M4-2] mimetype is client-declared AND this route serves the bytes INLINE (no
  // attachment disposition, so a browser may render them) — stop it sniffing a
  // benign-typed file into executable HTML. Serving-side half of the uploads bond's
  // [M4-1] storage-side dangerous-MIME blocklist (defense in depth).
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  stream.pipe(res)
})

export default router
