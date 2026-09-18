import connectBusboy from 'connect-busboy'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  getProvider as getUploadProvider,
  hasProvider as hasUploadProvider,
} from '@molecule/api-uploads'

// Adapt PARENT_TABLE to the record attachments hang off (orders, tickets, tasks…).
// Every attachment is scoped to a parent the caller OWNS — so a user can never
// list, download, attach to, or delete files on someone else's record (no IDOR).
const PARENT_TABLE = 'records'
const ATTACHMENTS_TABLE = 'attachments'

// Broad document support. This is enforced SERVER-SIDE on purpose — a client can
// lie about Content-Type, so never trust the browser's declared MIME.
const ALLOWED_MIME = new Set([
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
])
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

// The size cap is enforced by the multipart parser's `fileSize` limit — the uploads
// bond only size-limits a stream that emits busboy's `'limit'` event.
const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_BYTES, fields: 8 },
})

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

// POST /?parent_id=... — stream one file to the uploads bond, record a row the user owns.
router.post('/', requireAuth, busboyMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string

  if (!hasUploadProvider()) {
    res.status(503).json({
      error: t('attachments.noProvider', undefined, {
        defaultValue: 'Upload provider not configured.',
      }),
    })
    return
  }
  if (!req.busboy) {
    res.status(400).json({
      error: t('attachments.notMultipart', undefined, {
        defaultValue: 'Expected multipart/form-data.',
      }),
    })
    return
  }

  // Authorize the PARENT before accepting a single byte — users only attach to
  // records they own (parent.user_id === session.userId), never someone else's.
  const parent = await requireOwnedParent(req.query.parent_id as string | undefined, userId, res)
  if (!parent) return

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
            'attachments.badType',
            { type: mimetype },
            { defaultValue: `Unsupported file type: ${mimetype}` },
          ),
        )
        stream.resume()
        return
      }

      let size = 0
      let limitHit = false
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
      })
      stream.on('limit', () => {
        limitHit = true
        sendError(
          413,
          t('attachments.tooLarge', undefined, { defaultValue: 'File exceeds the 25 MB limit.' }),
        )
      })

      const file = getUploadProvider().upload('file', stream, info, (err) => {
        if (limitHit) return
        console.error('[attachments] provider error', err)
        sendError(500, err.message || 'Upload failed.')
      })

      const promise = file.uploadPromise
      if (!promise) return

      promise
        .then(async () => {
          if (responded) return
          // Persist the provider's file id + owner — this is what makes the file OURS.
          const result = await create(ATTACHMENTS_TABLE, {
            parent_id: parent.id,
            user_id: userId,
            file_id: file.id,
            filename: info.filename,
            mimetype,
            size,
            created_at: new Date().toISOString(),
          })
          responded = true
          res.status(201).json(result.data)
        })
        .catch(() => {
          // onError already produced a response; swallow to avoid an unhandled rejection.
        })
    },
  )

  req.busboy.on('finish', () => {
    if (!sawFile && !responded) {
      sendError(400, t('attachments.missingFile', undefined, { defaultValue: 'No file uploaded' }))
    }
  })
  req.busboy.on('error', (err: Error) => sendError(400, err.message))
  req.on('aborted', () => sendError(499, 'Client aborted upload.'))
  req.pipe(req.busboy)
})

// GET /:id/download — authenticated, ownership-checked stream (works for S3 AND filesystem).
// The uploads bond exposes no signed-URL method; streaming through an authenticated
// route keeps files private-by-default without ever putting them on a public path.
router.get('/:id/download', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const row = (await findById(ATTACHMENTS_TABLE, req.params.id as string)) as {
    id: string
    user_id: string
    file_id: string
    filename: string
    mimetype: string
  } | null
  // Load the row and 404 unless it's the caller's — an unscoped getFile(id) is an IDOR.
  if (!row || row.user_id !== userId) {
    res.status(404).json({
      error: t('attachments.notFound', undefined, { defaultValue: 'Attachment not found' }),
    })
    return
  }
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
  res.setHeader('Content-Type', row.mimetype || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.filename)}"`)
  // [M4-2] mimetype is client-declared — stop the browser sniffing the streamed bytes
  // into executable markup (defense in depth with the uploads bond's [M4-1] blocklist).
  res.setHeader('X-Content-Type-Options', 'nosniff')
  stream.pipe(res)
})

// DELETE /:id — remove the row AND the stored blob (owner only).
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const row = (await findById(ATTACHMENTS_TABLE, req.params.id as string)) as {
    id: string
    user_id: string
    file_id: string
  } | null
  if (!row || row.user_id !== userId) {
    res.status(404).json({
      error: t('attachments.notFound', undefined, { defaultValue: 'Attachment not found' }),
    })
    return
  }
  if (hasUploadProvider()) {
    try {
      await getUploadProvider().deleteFile(row.file_id)
    } catch (err) {
      // Best-effort: still drop the row so it leaves the UI; a leftover blob is
      // recoverable, a dangling row the owner can't clear is not.
      console.error('[attachments] deleteFile failed', err)
    }
  }
  await deleteById(ATTACHMENTS_TABLE, row.id)
  res.status(204).end()
})

export default router
