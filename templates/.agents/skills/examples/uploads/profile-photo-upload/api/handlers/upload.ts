import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getProvider as getUploadProvider } from '@molecule/api-uploads'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

// The avatar is served THROUGH this API (an authenticated getFile stream), never as a
// raw bucket URL. Upload providers store objects PRIVATELY by default (S3's own docs:
// "never put an <img src> on a raw S3 URL — it 403s; serve via getFile or a presigned
// URL"), so persisting `provider.upload(...).location` and rendering it directly works
// only for the local filesystem bond and breaks the moment you switch to S3. Storing a
// serve URL keeps it provider-agnostic AND private. The framework `users.avatar` column
// (a string rendered directly as <img src> by shared components) holds this URL.
const AVATAR_ROUTE = '/api/upload/avatar/'

const router = Router()

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_BYTES, fields: 0 },
})

router.post('/avatar', busboyMiddleware, (req: Request, res: Response) => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', {}, { defaultValue: 'Authentication required' }) })
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
    console.error('[upload.avatar] provider lookup failed', err)
    res.status(500).json({
      error: t('uploads.error.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }

  const userId = res.locals.session.userId as string
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
        sendError(415, t('upload.badType', {}, { defaultValue: 'Unsupported image type' }))
        stream.resume()
        return
      }

      let limitHit = false
      stream.on('limit', () => {
        limitHit = true
        sendError(413, t('upload.tooLarge', {}, { defaultValue: 'File exceeds 5 MB limit.' }))
      })

      const file = provider.upload('file', stream, info, (err) => {
        if (limitHit) return
        console.error('[upload.avatar] provider error', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) return

      promise
        .then(async () => {
          if (responded) return
          // The provider derives a storage id (`file.id`) itself — an opaque UUID, never
          // the filename, so two users' "photo.jpg" can't collide. Persist a SERVE URL
          // (not `file.location`) into the framework `avatar` column; GET below streams
          // the private object back. NOTE the column is `avatar` (text) — NOT `avatar_url`.
          const avatar = `${AVATAR_ROUTE}${file.id}`
          try {
            await updateById('users', userId, { avatar })
          } catch (err) {
            // A failed persist means the avatar wouldn't survive a reload — surface it as
            // a real error, never return 200 with an unsaved avatar.
            console.error('[upload.avatar] profile update failed', err)
            sendError(500, t('upload.saveFailed', {}, { defaultValue: 'Could not save avatar.' }))
            return
          }
          responded = true
          res.json({ avatar })
        })
        .catch(() => {
          // onError callback already produced a response; swallow to avoid unhandled rejection.
        })
    },
  )

  req.busboy.on('finish', () => {
    if (!sawFile && !responded) {
      sendError(400, t('upload.missingFile', {}, { defaultValue: 'No file uploaded' }))
    }
  })

  req.busboy.on('error', (err: Error) => sendError(400, err.message))
  req.on('aborted', () => sendError(499, 'Client aborted upload.'))
  req.pipe(req.busboy)
})

// GET /avatar/:fileId — stream the avatar image (works for S3 AND filesystem: the raw
// bucket URL is private, so it's served through here). Auth required, and — crucially —
// it only streams a fileId REGISTERED as some user's avatar. Without that check,
// `getFile(anyId)` is an IDOR: a signed-in user could pass another user's private
// ATTACHMENT id to this route and download it (all objects share one bucket). `<img>`
// sniffs the image bytes, so a generic content-type still renders jpeg/png/webp.
router.get('/avatar/:fileId', async (req: Request, res: Response) => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const fileId = String(req.params.fileId)
  const registered = (await findMany('users', {
    where: [{ field: 'avatar', operator: '=', value: `${AVATAR_ROUTE}${fileId}` }],
    limit: 1,
  })) as unknown[]
  if (registered.length === 0) {
    res.status(404).json({ error: t('upload.notFound', {}, { defaultValue: 'Avatar not found' }) })
    return
  }

  let provider: ReturnType<typeof getUploadProvider>
  try {
    provider = getUploadProvider()
  } catch {
    res.status(500).json({
      error: t('uploads.error.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }
  const stream = await provider.getFile?.(fileId)
  if (!stream) {
    res.status(404).json({ error: t('upload.notFound', {}, { defaultValue: 'Avatar not found' }) })
    return
  }
  res.setHeader('Content-Type', 'image/jpeg')
  // [M4-2] nosniff: this route serves the stored bytes inline, so stop the browser
  // sniffing them into any type other than the server-declared image/jpeg.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, max-age=300')
  stream.pipe(res)
})

export default router
