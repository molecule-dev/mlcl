import { type Request, type RequestHandler, type Response, Router } from 'express'

import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  discardUploads,
  getProvider as getUploadProvider,
  getUploads,
  receiveUploads,
  sendUpload,
} from '@molecule/api-uploads'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
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

/** Whether a profile URL refers to a file managed by the avatar router. */
export const isManagedAvatar = (avatar: unknown): avatar is string =>
  typeof avatar === 'string' && avatar.startsWith(AVATAR_ROUTE)

const avatarUrl = (id: string): string => `${AVATAR_ROUTE}${encodeURIComponent(id)}`

const requireUser: RequestHandler = (_req, res, next) => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

// POST /avatar — receiveUploads stores one image from the `file` field in the uploads bond.
// It refuses a type outside ALLOWED_MIME (415), a file over MAX_BYTES (413) and a request
// without a file (400) before the handler runs, and removes a partial file when the client
// disconnects. Put requireUser first, so an anonymous request is refused before anything
// is stored.
router.post(
  '/avatar',
  requireUser,
  receiveUploads({ field: 'file', maxFileBytes: MAX_BYTES, types: ALLOWED_MIME, maxFields: 0 }),
  async (req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const [file] = getUploads(req, 'file')
    // The provider derives a storage id (`file.id`) itself — an opaque UUID, never the
    // filename, so two users' "photo.jpg" can't collide. Persist a SERVE URL (not
    // `file.location`) into the framework `avatar` column; GET below streams the private
    // object back. NOTE the column is `avatar` (text) — NOT `avatar_url`.
    const avatar = avatarUrl(file.id)
    let previous: unknown
    try {
      previous = (await findById('users', userId))?.avatar
      const result = await updateById('users', userId, { avatar })
      if (result.affected !== 1) throw new Error('The profile write affected no row')
    } catch (err) {
      // A failed persist means the avatar wouldn't survive a reload — surface it as a real
      // error, never return 200 with an unsaved avatar, and free the new object.
      console.error('[upload.avatar] profile update failed', err)
      await discardUploads(req)
      res
        .status(500)
        .json({ error: t('upload.saveFailed', {}, { defaultValue: 'Could not save avatar.' }) })
      return
    }
    if (isManagedAvatar(previous) && previous !== avatar) {
      try {
        const references = await findMany('users', {
          where: [{ field: 'avatar', operator: '=', value: previous }],
          limit: 1,
        })
        if (!references.length) {
          await getUploadProvider().deleteFile(
            decodeURIComponent(previous.slice(AVATAR_ROUTE.length)),
          )
        }
      } catch (err) {
        console.error('[upload.avatar] removing the previous avatar failed', err)
      }
    }
    res.json({ avatar })
  },
)

// GET /avatar/:fileId — stream the avatar image (works for S3 AND filesystem: the raw
// bucket URL is private, so it's served through here). Auth required, and — crucially —
// it only streams a fileId REGISTERED as some user's avatar. Without that check,
// `getFile(anyId)` is an IDOR: a signed-in user could pass another user's private
// ATTACHMENT id to this route and download it (all objects share one bucket). `<img>`
// sniffs the image bytes, so a generic content-type still renders jpeg/png/webp.
router.get('/avatar/:fileId', requireUser, async (req: Request, res: Response) => {
  const fileId = String(req.params.fileId)
  const registered = (await findMany('users', {
    where: [{ field: 'avatar', operator: '=', value: avatarUrl(fileId) }],
    limit: 1,
  })) as unknown[]
  if (registered.length === 0) {
    res.status(404).json({ error: t('upload.notFound', {}, { defaultValue: 'Avatar not found' }) })
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
  const stream = await provider.getFile?.(fileId)
  if (!stream) {
    res.status(404).json({ error: t('upload.notFound', {}, { defaultValue: 'Avatar not found' }) })
    return
  }
  res.setHeader('Cache-Control', 'private, max-age=300')
  await sendUpload(res, stream, { inline: true, type: 'image/jpeg' })
})

export default router
