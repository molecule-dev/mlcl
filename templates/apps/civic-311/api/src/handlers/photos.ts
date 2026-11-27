import { type RequestHandler, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  getProvider as getUploadProvider,
  getUploads,
  receiveUploads,
  sendUpload,
} from '@molecule/api-uploads'

// Issue photos: receive one image field ("photo") into the uploads bond and
// return a SERVE URL (`/api/issues/photo/<fileId>`) that the client stores
// on `issues.photo_url`. The GET below streams the private object back —
// never persist `provider.upload(...).location` and render it directly:
// upload providers store objects PRIVATELY by default, so a raw S3 URL
// 403s in the browser. The serve-URL indirection keeps it provider-agnostic
// (filesystem dev fallback AND S3 work unchanged).
const PHOTO_ROUTE = '/api/issues/photo/'
const photoUrl = (id: string): string => `${PHOTO_ROUTE}${encodeURIComponent(id)}`

const router = Router()

const requireUser: RequestHandler = (_req, res, next) => {
  if (!getUserId(res)) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  next()
}

// POST / — upload one issue photo. Returns `{ url }` (the serve URL the
// client passes as photo_url when POSTing the issue). The report form accepts
// "JPG, PNG or GIF. 5MB max."; receiveUploads enforces that server-side (415
// for another type, 413 over 5 MB, 400 without a photo) before this runs, and
// the uploads bond derives an opaque storage id, never the filename.
router.post(
  '/',
  requireUser,
  receiveUploads({
    field: 'photo',
    maxFileBytes: 5 * 1024 * 1024,
    types: ['image/jpeg', 'image/png', 'image/gif'],
    maxFields: 0,
  }),
  (req, res) => {
    const [photo] = getUploads(req, 'photo')
    res.json({ url: photoUrl(photo.id) })
  },
)

// GET /:fileId — stream an issue photo (works for S3 AND filesystem: the
// raw bucket URL is private, so it is served through here). Auth required,
// and — crucially — it only streams a fileId REGISTERED as some issue's
// photo. Without that check, `getFile(anyId)` is an IDOR: a signed-in user
// could pass another user's private file id to this route. Issue photos are
// community-visible with the issue itself, so any authenticated resident may
// view a REGISTERED one. `<img>` sniffs the bytes, so a generic content-type
// still renders jpeg/png/gif.
router.get('/:fileId', requireUser, async (req, res) => {
  const fileId = String(req.params.fileId)
  const registered = (await findMany('issues', {
    where: [{ field: 'photo_url', operator: '=', value: photoUrl(fileId) }],
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
  res.setHeader('Cache-Control', 'private, max-age=300')
  await sendUpload(res, stream, { inline: true, type: 'image/jpeg' })
})

export default router
