import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { getLogger } from '@molecule/api-bond'
import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getProvider as getUploadProvider } from '@molecule/api-uploads'

// The Settings avatar UI accepts "JPG, GIF or PNG. 1MB max." — validate that
// server-side (the authoritative check; the client accept="" can be bypassed).
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif'])
const MAX_BYTES = 1 * 1024 * 1024

// The avatar is served THROUGH this API (an authenticated getFile stream), never
// as a raw bucket URL. Upload providers store objects PRIVATELY by default, so a
// raw S3 URL 403s in the browser — persisting `provider.upload(...).location` and
// rendering it directly works only for the local filesystem bond and breaks the
// moment you switch to S3. We store a serve URL (`/api/user/avatar/<fileId>`) in
// the `users.avatar` text column instead; that keeps it provider-agnostic AND
// private. This router is mounted at `/user`, under the API's `/api` base.
const AVATAR_ROUTE = '/api/user/avatar/'

const logger = getLogger()

const router = Router()

/** The stored uploads fileId behind an avatar serve URL, or null if it isn't one. */
function avatarFileId(avatar: unknown): string | null {
  return typeof avatar === 'string' && avatar.startsWith(AVATAR_ROUTE)
    ? avatar.slice(AVATAR_ROUTE.length) || null
    : null
}

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_BYTES, fields: 0 },
})

// POST /avatar — stream one image field ("avatar") to the uploads bond and save
// a serve URL on `users.avatar`. Returns `{ url }` (the client renders it as the
// <img src>).
router.post('/avatar', busboyMiddleware, (req: Request, res: Response) => {
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
    logger.error('avatar.upload', err)
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
        sendError(413, t('uploads.tooLarge', {}, { defaultValue: 'File exceeds 1 MB limit.' }))
      })

      const file = provider.upload('file', stream, info, (err) => {
        if (limitHit) return
        logger.error('avatar.upload', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) return

      promise
        .then(async () => {
          if (responded) return
          // The provider derives an opaque storage id (`file.id`), never the
          // filename, so two users' "photo.jpg" can't collide. Persist a SERVE
          // URL (not `file.location`) into `users.avatar`; the GET below streams
          // the private object back.
          const avatar = `${AVATAR_ROUTE}${file.id}`
          // Capture the avatar being replaced so its storage can be freed after the swap.
          // No initializer: both branches below assign it.
          let previous: string | null
          try {
            const existing = await findById<Record<string, unknown>>('users', userId)
            previous = avatarFileId(existing?.avatar)
          } catch (_error) {
            // The previous avatar is only needed to clean up its old file; if the read fails there is nothing to clean up.
            previous = null
          }
          try {
            await updateById('users', userId, { avatar })
          } catch (err) {
            // A failed persist means the avatar wouldn't survive a reload —
            // surface it, never return 200 with an unsaved avatar.
            logger.error('avatar.update', err)
            sendError(500, t('uploads.saveFailed', {}, { defaultValue: 'Could not save avatar.' }))
            return
          }
          // The old avatar object is now unreferenced — best-effort delete so changing your
          // avatar doesn't leak the previous blob. AFTER the successful swap, never fatal.
          if (previous && previous !== file.id) {
            try {
              await provider.deleteFile(previous)
            } catch (err) {
              logger.error('avatar.cleanup', err)
            }
          }
          responded = true
          res.json({ url: avatar })
        })
        .catch(() => {
          // onError callback already produced a response; swallow to avoid an
          // unhandled rejection.
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

// DELETE /avatar — remove the caller's avatar. Best-effort deletes the stored
// object from the uploads bond (own every file; don't leak orphaned storage),
// then clears `users.avatar` so the UI reflects removal even if storage errors.
router.delete('/avatar', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }

  const user = await findById<Record<string, unknown>>('users', userId)
  const fileId = avatarFileId(user?.avatar)
  if (fileId) {
    try {
      await getUploadProvider().deleteFile(fileId)
    } catch (err) {
      // A storage hiccup must not block clearing the column — the user still
      // sees the avatar removed; the orphaned object can be swept separately.
      logger.error('avatar.delete', err)
    }
  }

  await updateById('users', userId, { avatar: null })
  res.status(204).end()
})

// GET /avatar/:fileId — stream the avatar image (works for S3 AND filesystem: the
// raw bucket URL is private, so it's served through here). Auth required, and —
// crucially — it only streams a fileId REGISTERED as some user's avatar. Without
// that check, `getFile(anyId)` is an IDOR: a signed-in user could pass another
// user's private file id to this route. `<img>` sniffs the bytes, so a generic
// content-type still renders jpeg/png/gif.
router.get('/avatar/:fileId', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const fileId = String(req.params.fileId)
  const registered = (await findMany('users', {
    where: [{ field: 'avatar', operator: '=', value: `${AVATAR_ROUTE}${fileId}` }],
    limit: 1,
  })) as unknown[]
  if (registered.length === 0) {
    res.status(404).json({ error: t('uploads.notFound', {}, { defaultValue: 'Avatar not found' }) })
    return
  }

  let provider: ReturnType<typeof getUploadProvider>
  try {
    provider = getUploadProvider()
  } catch (_error) {
    // No uploads bond is wired — reported to the caller below, so the throw carries no extra information.
    res.status(500).json({
      error: t('uploads.error.noProvider', {}, { defaultValue: 'Upload provider not configured.' }),
    })
    return
  }
  const stream = await provider.getFile?.(fileId)
  if (!stream) {
    res.status(404).json({ error: t('uploads.notFound', {}, { defaultValue: 'Avatar not found' }) })
    return
  }
  res.setHeader('Content-Type', 'image/jpeg')
  // [M4-2] nosniff: this route serves the stored bytes inline, so stop the browser
  // sniffing them into any type other than the server-declared image/jpeg (defense
  // in depth with the uploads bond's [M4-1] storage-side MIME blocklist).
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, max-age=300')
  stream.pipe(res)
})

export default router
