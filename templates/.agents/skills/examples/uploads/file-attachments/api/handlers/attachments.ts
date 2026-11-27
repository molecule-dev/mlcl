import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Router } from 'express'

import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  discardUploads,
  getProvider as getUploadProvider,
  getUploads,
  hasProvider as hasUploadProvider,
  receiveUploads,
  sendUpload,
} from '@molecule/api-uploads'

// Adapt PARENT_TABLE to the record attachments hang off (orders, tickets, tasks…).
// Every attachment is scoped to a parent the caller OWNS — so a user can never
// list, download, attach to, or delete files on someone else's record (no IDOR).
const PARENT_TABLE = 'records'
const ATTACHMENTS_TABLE = 'attachments'

// Broad document support. This is enforced SERVER-SIDE on purpose — a client can
// lie about Content-Type, so never trust the browser's declared MIME.
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]
const MAX_BYTES = 25 * 1024 * 1024

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

// Loads the parent row and 404s unless the caller owns it (404, not 403, so callers
// can't probe which parent ids exist). Returns null when denied — the response has
// already been sent, so handlers just `if (!parent) return`.
const requireOwnedParent = async (
  parentId: string | undefined,
  userId: string,
  res: Response,
): Promise<{ id: string; user_id: string } | null> => {
  if (!parentId) {
    res.status(400).json({
      error: t('attachments.missingParent', undefined, { defaultValue: 'Missing parent_id' }),
    })
    return null
  }
  const parent = (await findById(PARENT_TABLE, parentId)) as { id: string; user_id: string } | null
  if (!parent || parent.user_id !== userId) {
    res.status(404).json({
      error: t('attachments.parentNotFound', undefined, { defaultValue: 'Record not found' }),
    })
    return null
  }
  return parent
}

const router = Router()

// GET /?parent_id=... — list a record's attachments (metadata only).
router.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parent = await requireOwnedParent(req.query.parent_id as string | undefined, userId, res)
  if (!parent) return

  const rows = await findMany<{
    id: string
    filename: string
    mimetype: string
    size: number
    created_at: Date
  }>(ATTACHMENTS_TABLE, {
    where: [
      { field: 'parent_id', operator: '=', value: parent.id },
      { field: 'user_id', operator: '=', value: userId },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  res.json(
    rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      mimetype: r.mimetype,
      size: r.size,
      created_at: r.created_at,
    })),
  )
})

// Authorize the PARENT before accepting a single byte — users only attach to
// records they own (parent.user_id === session.userId), never someone else's.
const loadOwnedParent: RequestHandler = async (req, res, next) => {
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('attachments.noProvider', undefined, {
        defaultValue: 'Upload provider not configured.',
      }),
    })
    return
  }
  const userId = res.locals.session.userId as string
  const parent = await requireOwnedParent(req.query.parent_id as string | undefined, userId, res)
  if (!parent) return
  res.locals.parent = parent
  next()
}

// POST /?parent_id=... — store one file in the uploads bond, record a row the user owns.
// receiveUploads refuses a type outside ALLOWED_MIME (415), a file over MAX_BYTES (413)
// and a request without a `file` (400) before the handler runs, and removes a partial
// file when the client disconnects.
router.post(
  '/',
  requireAuth,
  loadOwnedParent,
  receiveUploads({ field: 'file', maxFileBytes: MAX_BYTES, types: ALLOWED_MIME, maxFields: 8 }),
  async (req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const parent = res.locals.parent as { id: string }
    const [file] = getUploads(req, 'file')
    try {
      // Persist the provider's file id + owner — this is what makes the file OURS.
      const result = await create(ATTACHMENTS_TABLE, {
        parent_id: parent.id,
        user_id: userId,
        file_id: file.id,
        filename: file.filename,
        mimetype: file.mimetype.toLowerCase(),
        size: file.size,
        created_at: new Date().toISOString(),
      })
      if (!result.data) throw new Error('The attachment write returned no row')
      res.status(201).json(result.data)
    } catch (err) {
      // No row points at the stored file, so nothing could ever download or delete it.
      console.error('[attachments] recording the upload failed', err)
      await discardUploads(req)
      res.status(500).json({
        error: t('attachments.saveFailed', undefined, { defaultValue: 'Could not save the file.' }),
      })
    }
  },
)

interface AttachmentRow {
  id: string
  parent_id: string
  user_id: string
  file_id: string
  filename: string
}

// Both the attachment and its parent must still belong to the caller.
async function requireOwnedAttachment(req: Request, res: Response): Promise<AttachmentRow | null> {
  const userId = res.locals.session.userId as string
  const row = await findById<AttachmentRow>(ATTACHMENTS_TABLE, String(req.params.id))
  if (!row || row.user_id !== userId) {
    res.status(404).json({
      error: t('attachments.notFound', undefined, { defaultValue: 'Attachment not found' }),
    })
    return null
  }
  return (await requireOwnedParent(row.parent_id, userId, res)) ? row : null
}

// GET /:id/download — authenticated, ownership-checked stream.
router.get('/:id/download', requireAuth, async (req, res) => {
  const row = await requireOwnedAttachment(req, res)
  if (!row) return
  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('attachments.noProvider', undefined, {
        defaultValue: 'Upload provider not configured.',
      }),
    })
    return
  }
  const stream = await getUploadProvider().getFile?.(row.file_id)
  if (!stream) {
    res.status(404).json({
      error: t('attachments.fileMissing', undefined, {
        defaultValue: 'File no longer available',
      }),
    })
    return
  }
  res.setHeader('Cache-Control', 'private, no-store')
  await sendUpload(res, stream, { filename: row.filename })
})

// DELETE /:id — remove the row AND the stored blob (owner only).
router.delete('/:id', requireAuth, async (req, res) => {
  const row = await requireOwnedAttachment(req, res)
  if (!row) return
  const removed = await deleteById(ATTACHMENTS_TABLE, row.id)
  if (removed.affected && hasUploadProvider()) {
    try {
      await getUploadProvider().deleteFile(row.file_id)
    } catch (err) {
      console.error('[attachments] deleteFile failed', err)
    }
  }
  res.status(204).end()
})

export default router
