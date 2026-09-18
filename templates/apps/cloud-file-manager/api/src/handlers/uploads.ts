/**
 * Uploads handler — multipart byte-stream upload to the configured S3 bond.
 *
 * Mounted BEFORE the JSON body parser in `server.ts` so that the multipart
 * request body is delivered to busboy intact (the express body parser
 * skips files: 0 multipart, which would silently consume and drop the
 * incoming file stream).
 *
 * Flow: client POSTs multipart/form-data with a single `file` field →
 * busboy hands the stream to the active uploads provider (`@molecule/api-uploads-s3`)
 * → S3 multipart upload runs in parallel with the request body →
 * once S3 reports `done`, we respond with the upload descriptor the
 * frontend then attaches to a `POST /api/files` metadata row.
 *
 * Authentication: requires the JWT cookie set by the user resource
 * (the `verifyMiddleware()` runs ahead of this router in server.ts);
 * unauthenticated requests get a 401 before any bytes are read.
 *
 * @module
 */
import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { getProvider } from '@molecule/api-uploads'

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

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_FILE_BYTES, fields: 5 },
})

router.post('/', busboyMiddleware, (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    return
  }

  if (!req.busboy) {
    res.status(400).json({
      error: t('uploads.error.notMultipart', {}, { defaultValue: 'Expected multipart/form-data.' }),
    })
    return
  }

  let provider: ReturnType<typeof getProvider>
  try {
    provider = getProvider()
  } catch (err) {
    logger.error('uploads.handler: provider lookup failed', err)
    res.status(500).json({
      error: t('uploads.error.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }

  let uploadFinished = false
  let aborted = false
  let uploadFile: ReturnType<typeof provider.upload> | null = null
  let limitReached = false

  const fail = (status: number, error: Error | string): void => {
    if (uploadFinished) return
    uploadFinished = true
    aborted = true
    if (uploadFile) {
      void provider.abortUpload(uploadFile)
    }
    const message = typeof error === 'string' ? error : error.message
    logger.error('uploads.handler: upload failed', error)
    if (!res.headersSent) {
      res.status(status).json({ error: message })
    }
  }

  req.busboy.on(
    'file',
    (
      _fieldname: string,
      stream: NodeJS.ReadableStream,
      info: { filename: string; encoding: string; mimeType: string },
    ) => {
      if (uploadFile) {
        stream.resume()
        return
      }

      stream.on('limit', () => {
        limitReached = true
      })

      uploadFile = provider.upload('file', stream, info, (error) => {
        fail(400, error)
      })

      Promise.resolve(uploadFile.uploadPromise)
        .then(async () => {
          if (aborted) return
          if (limitReached) {
            fail(
              413,
              t(
                'uploads.error.tooLarge',
                {},
                { defaultValue: 'File exceeds maximum allowed size.' },
              ),
            )
            return
          }
          uploadFinished = true
          const f = uploadFile!
          // SECURITY: the metadata row is created HERE, server-side, with the
          // provider-minted storage key (`f.id`) bound to the authenticated
          // owner. The client never supplies the storage key, so a row can
          // only ever point at the object these bytes were just written to —
          // closing the cross-tenant S3-read IDOR. The frontend persists this
          // returned row directly instead of POSTing to /api/files with a key.
          const name = f.filename || 'upload'
          const mimeType = f.mimetype || 'application/octet-stream'
          const size = f.size ?? 0
          const result = await create<FileRow>('files', {
            owner_id: userId,
            folder_id: null,
            name,
            storage_key: f.id,
            mime_type: mimeType,
            size,
            is_starred: false,
            is_trashed: false,
            trashed_at: null,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
          })
          const file = result.data
          if (!file) {
            fail(500, t('files.error.create', {}, { defaultValue: 'Failed to record upload.' }))
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
        })
        .catch((err) => fail(500, err instanceof Error ? err : new Error(String(err))))
    },
  )

  req.busboy.on('error', (err: Error) => fail(400, err))
  req.on('aborted', () => fail(499, new Error('Client aborted upload.')))

  req.pipe(req.busboy)
})

export default router
