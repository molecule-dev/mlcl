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
import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  discardUploads,
  getProvider as getUploadProvider,
  getUploads,
  hasProvider as hasUploadProvider,
  receiveUploads,
  sendUpload,
} from '@molecule/api-uploads'

const UPLOADS_TABLE = 'uploads'

// Images only. Enforced SERVER-SIDE on purpose — a client can lie about
// Content-Type, so never trust the browser's declared MIME.
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 10 * 1024 * 1024

const router = Router()

const requireUser: RequestHandler = (_req, res, next) => {
  if (!getUserId(res)) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('uploads.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }
  next()
}

// POST /api/uploads — an authenticated host uploads one listing photo. receiveUploads
// refuses a type outside ALLOWED_MIME (415), a file over MAX_BYTES (413) and a request
// without a `file` (400) before this runs; the handler records an OWNED row and returns
// a same-origin serve URL the client stores in the listing's `images` array.
router.post(
  '/',
  requireUser,
  receiveUploads({ field: 'file', maxFileBytes: MAX_BYTES, types: ALLOWED_MIME, maxFields: 0 }),
  async (req: Request, res: Response) => {
    const [file] = getUploads(req, 'file')
    // Own the file: persist the provider id + uploader. The serve route can
    // only stream back an id that exists here, and the owner can later manage it.
    let row: { id: string } | null | undefined
    try {
      const result = await create<{ id: string }>(UPLOADS_TABLE, {
        user_id: String(getUserId(res)),
        file_id: file.id,
        filename: file.filename,
        mimetype: file.mimetype.toLowerCase(),
        size: file.size,
        created_at: new Date().toISOString(),
      })
      row = result.data
    } catch (err) {
      console.error('[uploads] recording the upload failed', err)
    }
    if (!row) {
      // No row points at the stored file, so the serve route could never reach it.
      await discardUploads(req)
      res.status(500).json({
        error: t('uploads.saveFailed', {}, { defaultValue: 'Could not save the upload.' }),
      })
      return
    }
    res.status(201).json({ id: row.id, url: `/api/uploads/${row.id}` })
  },
)

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
    filename?: string
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
  res.setHeader('Cache-Control', 'public, max-age=3600')
  await sendUpload(res, stream, {
    inline: ALLOWED_MIME.includes(row.mimetype),
    type: row.mimetype,
    filename: row.filename,
  })
})

export default router
