/**
 * Attachment handlers — file uploads tied to articles.
 *
 * The blob upload itself goes to S3 via `@molecule/api-uploads-s3`; this
 * handler tracks the metadata row and ensures the user has write access
 * to the article's space.
 */

import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  type AttachmentRow,
  internalError,
  requireReadableArticle,
  requireReadableAttachment,
  requireUser,
  requireWritableArticle,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })
const articleQuery = z.object({ article_id: z.string().uuid() })

// NOTE: `s3_key` is NOT accepted from the client. Letting the client choose the
// S3 object key defeats server-minted UUID keys — a future download/preview
// route that streams `getFile(<that key>)` would let one user address another
// tenant's object (cross-tenant read IDOR). The key is always minted
// server-side at row-create below.
const createSchema = z.object({
  article_id: z.string().uuid(),
  filename: z.string().min(1).max(512),
  content_type: z.string().max(255).optional(),
  size_bytes: z
    .number()
    .int()
    .nonnegative()
    .max(25 * 1024 * 1024),
})

router.get('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const q = articleQuery.safeParse(req.query)
  if (!q.success) {
    validationError(res, q.error.issues)
    return
  }
  try {
    const article = await requireReadableArticle(q.data.article_id, uid)
    if (!article) {
      res.json([])
      return
    }
    const items = await findMany<AttachmentRow>('attachments', {
      where: [{ field: 'article_id', operator: '=', value: q.data.article_id }],
      orderBy: [{ field: 'uploaded_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const article = await requireWritableArticle(parsed.data.article_id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    const result = await create<AttachmentRow>('attachments', {
      article_id: parsed.data.article_id,
      uploaded_by_user_id: uid,
      s3_key: crypto.randomUUID(),
      filename: parsed.data.filename,
      content_type: parsed.data.content_type ?? 'application/octet-stream',
      size_bytes: parsed.data.size_bytes,
      uploaded_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const att = await requireReadableAttachment(id.data.id, uid)
    if (!att) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    // Confirm write access via the parent article.
    const article = await requireWritableArticle(att.article_id, uid)
    if (!article) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    await deleteById('attachments', id.data.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

export default router
