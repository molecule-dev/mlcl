/**
 * Uploads handler — multipart byte-stream upload to the configured S3 bond.
 *
 * Flow: client POSTs multipart/form-data with a single `file` field →
 * `receiveUploads` streams it to the active uploads provider
 * (`@molecule/api-uploads-s3`) → once the provider reports it stored, we
 * create the metadata row and respond with it.
 *
 * Authentication: requires the JWT cookie set by the user resource
 * (`verifyMiddleware()` runs ahead of the domain routers in App/router.ts);
 * unauthenticated requests get a 401 before any bytes are read.
 *
 * @module
 */
import { type RequestHandler, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { discardUploads, getUploads, receiveUploads } from '@molecule/api-uploads'

const router = Router()

interface FileRow {
  id: string
  owner_id: string
  folder_id: string | null
  name: string
  storage_key: string
  mime_type: string
  size: number
  is_starred: boolean
  is_trashed: boolean
  trashed_at: Date | null
  version: number
  created_at: Date
  updated_at: Date
}

// Reasonable per-file ceiling for the smoke environment. Real deployments
// would key this off the user's plan via `enforceLimit` from
// `@molecule/api-entitlements`; we keep a hard-cap here so a single bad
// upload can't OOM the API container.
const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200 MB

const requireUser: RequestHandler = (_req, res, next) => {
  if (!getUserId(res)) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    return
  }
  next()
}

// receiveUploads refuses a body that is not multipart (415), a file over
// MAX_FILE_BYTES (413) and a request without a `file` (400), and removes a
// partial file when the client disconnects, before this handler runs.
router.post(
  '/',
  requireUser,
  receiveUploads({ field: 'file', maxFileBytes: MAX_FILE_BYTES, maxFields: 5 }),
  async (req, res) => {
    const userId = String(getUserId(res))
    const [f] = getUploads(req, 'file')
    // SECURITY: the metadata row is created HERE, server-side, with the
    // provider-minted storage key (`f.id`) bound to the authenticated
    // owner. The client never supplies the storage key, so a row can
    // only ever point at the object these bytes were just written to —
    // closing the cross-tenant S3-read IDOR. The frontend persists this
    // returned row directly instead of POSTing to /api/files with a key.
    let file: FileRow | null | undefined
    try {
      const result = await create<FileRow>('files', {
        owner_id: userId,
        folder_id: null,
        name: f.filename || 'upload',
        storage_key: f.id,
        mime_type: f.mimetype || 'application/octet-stream',
        size: f.size ?? 0,
        is_starred: false,
        is_trashed: false,
        trashed_at: null,
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      })
      file = result.data
    } catch (err) {
      logger.error('uploads.handler: recording the upload failed', err)
    }
    if (!file) {
      // No row points at the stored object, so nothing could ever serve or delete it.
      await discardUploads(req)
      res
        .status(500)
        .json({ error: t('files.error.create', {}, { defaultValue: 'Failed to record upload.' }) })
      return
    }
    res.status(201).json({
      id: file.id,
      file_id: file.id,
      // The storage key is server-minted (the upload provider's id),
      // never a client value.
      storage_key: file.storage_key,
      filename: file.name,
      name: file.name,
      mime_type: file.mime_type,
      // Postgres returns the `size` bigint column as a STRING; coerce to a
      // JSON number so the response shape matches FileRow.size: number and
      // a client can round-trip it (POST /api/files { size }) without a
      // string tripping the numeric create schema.
      size: Number(file.size),
      location: f.location ?? null,
    })
  },
)

export default router
