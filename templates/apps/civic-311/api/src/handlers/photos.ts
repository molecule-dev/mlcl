import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getProvider as getUploadProvider } from '@molecule/api-uploads'

// Issue photos: stream one image field ("photo") to the uploads bond and
// return a SERVE URL (`/api/issues/photo/<fileId>`) that the client stores
// on `issues.photo_url`. The GET below streams the private object back —
// never persist `provider.upload(...).location` and render it directly:
// upload providers store objects PRIVATELY by default, so a raw S3 URL
// 403s in the browser. The serve-URL indirection keeps it provider-agnostic
// (filesystem dev fallback AND S3 work unchanged).
const PHOTO_ROUTE = '/api/issues/photo/'

// The report form accepts "JPG, PNG or GIF. 5MB max." — validate that
// server-side (the authoritative check; the client accept="" can be
// bypassed).
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024

const router = Router()

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_BYTES, fields: 0 },
})

// POST / — upload one issue photo. Returns `{ url }` (the serve URL the
// client passes as photo_url when POSTing the issue).
router.post('/', busboyMiddleware, (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
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
    console.error('photo.upload_provider_lookup', err)
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
        sendError(415, t('uploads.badType', {}, { defaultValue: 'Unsupported image type' }))
        stream.resume()
        return
      }

      let limitHit = false
      stream.on('limit', () => {
        limitHit = true
        sendError(413, t('uploads.tooLarge', {}, { defaultValue: 'File exceeds 5 MB limit.' }))
      })

      // The provider derives an opaque storage id (`file.id`), never the
      // filename, so two reporters' "pothole.jpg" can't collide.
      const file = provider.upload('photo', stream, info, (err) => {
        if (limitHit) return
        console.error('photo.upload', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) return

      promise
        .then(async () => {
          if (responded) return
          responded = true
          res.json({ url: `${PHOTO_ROUTE}${file.id}` })
        })
        .catch(() => {
          // onError callback already produced a response; swallow to avoid
          // an unhandled rejection.
        })
    },
  )

  req.busboy.on('finish', () => {
    if (!sawFile && !responded) {
      sendError(400, t('uploads.missingFile', {}, { defaultValue: 'No file uploaded' }))
    }
  })

  req.busboy.on('error', (err: Error) => sendError(400, err.message))
  req.on('aborted', () => sendError(499, 'Client aborted upload.'))
  req.pipe(req.busboy)
})

// GET /:fileId — stream an issue photo (works for S3 AND filesystem: the
// raw bucket URL is private, so it is served through here). Auth required,
// and — crucially — it only streams a fileId REGISTERED as some issue's
// photo. Without that check, `getFile(anyId)` is an IDOR: a signed-in user
// could pass another user's private file id to this route. Issue photos are
// community-visible with the issue itself, so any authenticated resident may
// view a REGISTERED one. `<img>` sniffs the bytes, so a generic content-type
// still renders jpeg/png/gif.
router.get('/:fileId', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const fileId = String(req.params.fileId)
  const registered = (await findMany('issues', {
    where: [{ field: 'photo_url', operator: '=', value: `${PHOTO_ROUTE}${fileId}` }],
    limit: 1,
  })) as unknown[]
  if (registered.length === 0) {
    res.status(404).json({ error: t('uploads.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }

  let provider: ReturnType<typeof getUploadProvider>
  try {
    provider = getUploadProvider()
  } catch (_error) {
    res.status(500).json({
      error: t('uploads.error.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }
  const stream = await provider.getFile?.(fileId)
  if (!stream) {
    res.status(404).json({ error: t('uploads.notFound', {}, { defaultValue: 'Photo not found' }) })
    return
  }
  res.setHeader('Content-Type', 'image/jpeg')
  // nosniff: this route serves the stored bytes inline, so stop the browser
  // sniffing them into any type other than the server-declared image (defense
  // in depth with the uploads bond's storage-side MIME blocklist).
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, max-age=300')
  stream.pipe(res)
})

export default router
