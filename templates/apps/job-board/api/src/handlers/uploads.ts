/**
 * Resume / file upload handler. Accepts multipart/form-data with a
 * single `file` field, streams it to S3 via the `@molecule/api-uploads`
 * provider, and returns the resulting upload's public location.
 *
 * On success the URL is also persisted to the caller's
 * `user_profiles.resume_url` so subsequent applications can default to it.
 *
 * @module
 */

import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getProvider as getUploadProvider } from '@molecule/api-uploads'

const MAX_RESUME_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
])

const router = Router()

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_RESUME_BYTES, fields: 5 },
})

router.post('/resume', busboyMiddleware, (req: Request, res: Response) => {
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

  let provider: ReturnType<typeof getUploadProvider>
  try {
    provider = getUploadProvider()
  } catch (err) {
    console.error('[uploads.resume] provider lookup failed', err)
    res.status(500).json({
      error: t('uploads.error.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
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
        sendError(
          415,
          t(
            'uploads.error.unsupportedType',
            {},
            {
              defaultValue: 'Unsupported resume type. Use PDF, Word, or plain text.',
            },
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
          t(
            'uploads.error.tooLarge',
            {},
            {
              defaultValue: 'File exceeds the 10 MB resume size limit.',
            },
          ),
        )
      })

      const file = provider.upload('file', stream, info, (err) => {
        if (limitHit) return
        console.error('[uploads.resume] provider error', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) {
        // upload() rejected synchronously (e.g. blocked MIME) — error already sent.
        return
      }
      promise
        .then(async () => {
          if (responded) return
          const location = file.location
          if (!location) {
            sendError(500, 'Upload completed without a location URL.')
            return
          }
          try {
            const existing = await findOne<Record<string, unknown>>('user_profiles', [
              { field: 'user_id', operator: '=', value: userId },
            ])
            const now = new Date().toISOString()
            if (existing) {
              await updateMany(
                'user_profiles',
                [{ field: 'user_id', operator: '=', value: userId }],
                { resume_url: location, updated_at: now },
              )
            } else {
              await create('user_profiles', {
                user_id: userId,
                resume_url: location,
                skills: JSON.stringify([]),
                willing_to_relocate: false,
                created_at: now,
                updated_at: now,
              })
            }
          } catch (err) {
            // The file is already in S3 — return it anyway so the user can
            // still attach it to an application; the profile will catch up
            // on their next save.
            console.error('[uploads.resume] profile update failed', err)
          }
          responded = true
          res.status(201).json({
            url: location,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
          })
        })
        .catch(() => {
          // The onError callback already produced a response; swallow
          // here to avoid an unhandled rejection.
        })
    },
  )

  req.busboy.on('finish', () => {
    if (!sawFile && !responded) {
      sendError(400, t('uploads.error.noFile', {}, { defaultValue: 'No file field was supplied.' }))
    }
  })

  req.busboy.on('error', (err: Error) => sendError(400, err.message))
  req.on('aborted', () => sendError(499, 'Client aborted upload.'))
  req.pipe(req.busboy)
})

export default router
