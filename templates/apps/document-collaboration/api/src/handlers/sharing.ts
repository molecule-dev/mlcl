/**
 * Document share handlers — only the document owner can manage shares.
 *
 * On invite create:
 *   - if `shared_with_user_id` (or a registered email) resolves to an
 *     existing user, the row is created with `accepted_at = now()` and
 *     the recipient sees the doc in `/api/documents/shared` immediately.
 *   - otherwise the row is created with `accepted_at = null` and an
 *     invite email is sent via the bonded mailer (Mailgun in production
 *     test mode, mailhog/no-op in CI when `MAILGUN_API_KEY` is unset).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentShareRow,
  internalError,
  requireOwnedDocument,
  requireOwnedShare,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const docParam = z.object({ documentId: z.string().uuid() })
const shareParam = z.object({
  documentId: z.string().uuid(),
  shareId: z.string().uuid(),
})

const createSchema = z
  .object({
    email: z.string().email().optional(),
    shared_with_user_id: z.string().uuid().optional(),
    role: z.enum(['viewer', 'commenter', 'editor']).optional(),
    from_email: z.string().email().optional(),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.shared_with_user_id), {
    message: 'email or shared_with_user_id required',
    path: ['email'],
  })

const updateSchema = z.object({
  role: z.enum(['viewer', 'commenter', 'editor']),
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
    const doc = await requireOwnedDocument(params.data.documentId, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const shares = await findMany<DocumentShareRow>('document_shares', {
      where: [{ field: 'document_id', operator: '=', value: params.data.documentId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(shares)
  } catch (error) {
    logger.error('sharing.list', error)
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
    const doc = await requireOwnedDocument(params.data.documentId, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    let resolvedUserId: string | null = body.data.shared_with_user_id ?? null
    if (!resolvedUserId && body.data.email) {
      const existing = await findOne<{ id: string }>('users', [
        { field: 'email', operator: '=', value: body.data.email },
      ])
      if (existing) resolvedUserId = existing.id
    }
    const result = await create<DocumentShareRow>('document_shares', {
      document_id: params.data.documentId,
      shared_by: ownerId,
      shared_with_user_id: resolvedUserId,
      email: body.data.email ?? null,
      role: body.data.role ?? 'viewer',
      accepted_at: resolvedUserId ? new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (!resolvedUserId && body.data.email) {
      // Fire-and-forget invite email — failures should not block the
      // share row from being created (the owner can resend later).
      try {
        await sendMail({
          to: body.data.email,
          from: body.data.from_email ?? `noreply@${process.env.MAILGUN_DOMAIN ?? 'flagship.test'}`,
          subject: t(
            'sharing.inviteSubject',
            { title: doc.title },
            { defaultValue: '{{title}} has been shared with you' },
          ),
          text: t(
            'sharing.inviteBody',
            { title: doc.title },
            { defaultValue: 'You have been invited to collaborate on {{title}}' },
          ),
        })
      } catch (_error) {
        // swallow — invite email is best-effort; share row already created.
      }
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('sharing.create', error)
    internalError(res)
  }
})

router.put('/:documentId/:shareId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = shareParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!params.success || !body.success) {
    validationError(res, params.success ? body.error?.issues : params.error.issues)
    return
  }
  try {
    const access = await requireOwnedShare(params.data.shareId, ownerId)
    if (!access || access.document.id !== params.data.documentId) {
      res
        .status(404)
        .json({ error: t('sharing.notFound', {}, { defaultValue: 'Share not found' }) })
      return
    }
    const result = await updateById<DocumentShareRow>('document_shares', params.data.shareId, {
      role: body.data.role,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('sharing.update', error)
    internalError(res)
  }
})

router.delete('/:documentId/:shareId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = shareParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireOwnedShare(params.data.shareId, ownerId)
    if (!access || access.document.id !== params.data.documentId) {
      res
        .status(404)
        .json({ error: t('sharing.notFound', {}, { defaultValue: 'Share not found' }) })
      return
    }
    await deleteById('document_shares', params.data.shareId)
    res.status(204).end()
  } catch (error) {
    logger.error('sharing.delete', error)
    internalError(res)
  }
})

export default router
