/**
 * Document comment handlers — anchored, optionally threaded comments
 * scoped to a parent document.
 *
 * Authorisation: anyone with read access to the parent document can
 * list/create comments. Resolve / delete is restricted to the comment
 * author OR the document owner. New comments are broadcast over the
 * `document:<id>` realtime room so other connected editors update
 * their inline comment markers without polling.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentCommentRow,
  internalError,
  requireCommentAccess,
  requireReadableDocument,
  requireUser,
  safeBroadcast,
  validationError,
} from '../lib/authz.js'

const router = Router()

const docParam = z.object({ documentId: z.string().uuid() })
const commentParam = z.object({
  documentId: z.string().uuid(),
  commentId: z.string().uuid(),
})

const createSchema = z.object({
  body: z.string().min(1).max(10_000),
  anchor: z.record(z.string(), z.unknown()).optional(),
  parent_id: z.string().uuid().nullable().optional(),
})

router.get('/:documentId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = docParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireReadableDocument(params.data.documentId, ownerId)
    if (!access) {
      res.json([])
      return
    }
    const comments = await findMany<DocumentCommentRow>('document_comments', {
      where: [{ field: 'document_id', operator: '=', value: params.data.documentId }],
      orderBy: [
        { field: 'parent_id', direction: 'asc' },
        { field: 'created_at', direction: 'asc' },
      ],
    })
    res.json(comments)
  } catch (error) {
    logger.error('comments.list', error)
    internalError(res)
  }
})

router.post('/:documentId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = docParam.safeParse(req.params)
  const body = createSchema.safeParse(req.body)
  if (!params.success || !body.success) {
    validationError(res, params.success ? body.error?.issues : params.error.issues)
    return
  }
  try {
    const access = await requireReadableDocument(params.data.documentId, ownerId)
    if (!access) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    // A `viewer` share is read-only — only `commenter`/`editor` may post comments. This role
    // threshold was never enforced (any reader could comment), making the commenter tier dead.
    if (access.role === 'viewer') {
      res.status(403).json({ error: t('comments.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    if (body.data.parent_id) {
      // Parent comment must belong to the same document — prevents
      // cross-doc thread injection.
      const parent = await requireCommentAccess(body.data.parent_id, ownerId)
      if (!parent || parent.document.id !== access.document.id) {
        res
          .status(404)
          .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
        return
      }
    }
    const result = await create<DocumentCommentRow>('document_comments', {
      document_id: params.data.documentId,
      author_id: ownerId,
      parent_id: body.data.parent_id ?? null,
      body: body.data.body,
      anchor: body.data.anchor ?? {},
      is_resolved: false,
      resolved_by: null,
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await safeBroadcast(`document:${params.data.documentId}`, 'comment:created', result.data)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('comments.create', error)
    internalError(res)
  }
})

router.put('/:documentId/:commentId/resolve', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = commentParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireCommentAccess(params.data.commentId, ownerId)
    if (!access || access.document.id !== params.data.documentId) {
      res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
      return
    }
    if (access.comment.author_id !== ownerId && access.document.owner_id !== ownerId) {
      res.status(403).json({ error: t('comments.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const result = await updateById<DocumentCommentRow>(
      'document_comments',
      params.data.commentId,
      {
        is_resolved: true,
        resolved_by: ownerId,
        resolved_at: new Date(),
        updated_at: new Date(),
      },
    )
    await safeBroadcast(`document:${params.data.documentId}`, 'comment:resolved', result.data)
    res.json(result.data)
  } catch (error) {
    logger.error('comments.resolve', error)
    internalError(res)
  }
})

router.put('/:documentId/:commentId/reopen', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = commentParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireCommentAccess(params.data.commentId, ownerId)
    if (!access || access.document.id !== params.data.documentId) {
      res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
      return
    }
    if (access.comment.author_id !== ownerId && access.document.owner_id !== ownerId) {
      res.status(403).json({ error: t('comments.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const result = await updateById<DocumentCommentRow>(
      'document_comments',
      params.data.commentId,
      {
        is_resolved: false,
        resolved_by: null,
        resolved_at: null,
        updated_at: new Date(),
      },
    )
    // Mirror the resolve handler's broadcast so a re-opened comment reaches peers
    // live too (otherwise resolve propagates but reopen silently doesn't).
    await safeBroadcast(`document:${params.data.documentId}`, 'comment:reopened', result.data)
    res.json(result.data)
  } catch (error) {
    logger.error('comments.reopen', error)
    internalError(res)
  }
})

router.delete('/:documentId/:commentId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = commentParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireCommentAccess(params.data.commentId, ownerId)
    if (!access || access.document.id !== params.data.documentId) {
      res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
      return
    }
    if (access.comment.author_id !== ownerId && access.document.owner_id !== ownerId) {
      res.status(403).json({ error: t('comments.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    await deleteById('document_comments', params.data.commentId)
    await safeBroadcast(`document:${params.data.documentId}`, 'comment:deleted', {
      id: params.data.commentId,
    })
    res.status(204).end()
  } catch (error) {
    logger.error('comments.delete', error)
    internalError(res)
  }
})

export default router
