import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getLogger } from '@molecule/api-bond'
import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  discardUploads,
  getProvider as getUploadProvider,
  getUploads,
  receiveUploads,
  sendUpload,
} from '@molecule/api-uploads'

// The Settings avatar UI accepts "JPG, GIF or PNG. 1MB max." — validate that
// server-side (the authoritative check; the client accept="" can be bypassed).
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif']
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

/** Whether a profile URL can name a file managed by this template's avatar routes. */
export function isManagedAvatar(avatar: unknown): avatar is string {
  return typeof avatar === 'string' && avatar.startsWith(AVATAR_ROUTE)
}

const avatarUrl = (id: string): string => `${AVATAR_ROUTE}${encodeURIComponent(id)}`

const avatarWhere = (userId: string, avatar: unknown): WhereCondition[] => [
  { field: 'id', operator: '=', value: userId },
  avatar == null
    ? { field: 'avatar', operator: 'is_null' }
    : { field: 'avatar', operator: '=', value: avatar },
]

async function removeUnusedAvatar(avatar: unknown): Promise<void> {
  if (!isManagedAvatar(avatar)) return
  try {
    const stillUsed = await findMany('users', {
      where: [{ field: 'avatar', operator: '=', value: avatar }],
      limit: 1,
    })
    if (!stillUsed.length) {
      await getUploadProvider().deleteFile(decodeURIComponent(avatar.slice(AVATAR_ROUTE.length)))
    }
  } catch (err) {
    logger.error('avatar.cleanup', err)
  }
}

const requireUser: RequestHandler = (_req, res, next) => {
  if (!getUserId(res)) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  next()
}

// POST /avatar — store one image field ("avatar") in the uploads bond and save
// a serve URL on `users.avatar`. Returns `{ url }` (the client renders it as the
// <img src>). receiveUploads refuses a type outside ALLOWED_MIME (415), a file
// over MAX_BYTES (413) and a request without an avatar (400) before this runs.
router.post(
  '/avatar',
  requireUser,
  receiveUploads({ field: 'avatar', maxFileBytes: MAX_BYTES, types: ALLOWED_MIME, maxFields: 0 }),
  async (req: Request, res: Response) => {
    const userId = String(getUserId(res))
    const [file] = getUploads(req, 'avatar')
    // The provider derives an opaque storage id (`file.id`), never the
    // filename, so two users' "photo.jpg" can't collide. Persist a SERVE
    // URL (not `file.location`) into `users.avatar`; the GET below streams
    // the private object back.
    const avatar = avatarUrl(file.id)
    let previous: unknown
    try {
      const existing = await findById('users', userId)
      previous = existing?.avatar
      const result = await updateMany('users', avatarWhere(userId, previous), { avatar })
      if (result.affected !== 1) throw new Error('Avatar changed before the upload was saved')
    } catch (err) {
      // A failed persist means the avatar wouldn't survive a reload —
      // surface it, never return 200 with an unsaved avatar, and free the
      // new object nothing points at.
      logger.error('avatar.update', err)
      await discardUploads(req)
      res
        .status(500)
        .json({ error: t('uploads.saveFailed', {}, { defaultValue: 'Could not save avatar.' }) })
      return
    }
    if (previous !== avatar) await removeUnusedAvatar(previous)
    res.json({ url: avatar })
  },
)

// DELETE /avatar — clear the caller's avatar, then free its unreferenced blob.
router.delete('/avatar', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }

  const user = await findById<Record<string, unknown>>('users', userId)
  const result = await updateMany('users', avatarWhere(userId, user?.avatar), { avatar: null })
  if (result.affected !== 1) {
    res.status(409).json({
      error: t('uploads.avatarChanged', {}, { defaultValue: 'The avatar changed. Try again.' }),
    })
    return
  }
  await removeUnusedAvatar(user?.avatar)
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
    where: [{ field: 'avatar', operator: '=', value: avatarUrl(fileId) }],
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
  res.setHeader('Cache-Control', 'private, max-age=300')
  await sendUpload(res, stream, { inline: true, type: 'image/jpeg' })
})

export default router
