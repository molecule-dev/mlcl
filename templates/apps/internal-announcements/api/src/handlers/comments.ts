/**
 * Comment handlers for announcements.
 *
 * Comments are author-scoped: any authenticated user may post on any
 * announcement they can see; only the author may delete or edit their own
 * comment. Reads of an announcement's comment thread are visible to all
 * authenticated users.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type AnnouncementCommentRow,
  findAnnouncement,
  internalError,
  requireOwnedComment,
  requireUser,
  validationError,
} from '../lib/authz.js'
import type { InternalAnnouncementsLimits } from '../tiers.js'

const router = Router()

const announcementIdParam = z.object({ announcementId: z.string().uuid() })
const commentIdsParam = z.object({
  announcementId: z.string().uuid(),
  commentId: z.string().uuid(),
})

const createSchema = z.object({
  content: z.string().min(1).max(10_000),
  parent_id: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  content: z.string().min(1).max(10_000),
})

// GET /comments/:announcementId — list comments for an announcement
router.get('/:announcementId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = announcementIdParam.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const announcement = await findAnnouncement(parsed.data.announcementId)
    if (!announcement) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    const comments = await findMany<AnnouncementCommentRow>('announcement_comments', {
      where: [{ field: 'announcement_id', operator: '=', value: parsed.data.announcementId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(comments)
  } catch (error) {
    logger.error('comments.list', error)
    internalError(res)
  }
})

// POST /comments/:announcementId — author a new comment
// Enforce the per-tier comment cap (tiers.ts maxComments) — defined + advertised in Pricing but
// enforceLimit was never called on this create path.
const enforceCommentLimit = enforceLimit<InternalAnnouncementsLimits>({
  limitType: 'maxComments',
  getLimit: (limits) => limits.maxComments,
  getCurrent: async (userId) =>
    count('announcement_comments', [{ field: 'author_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/:announcementId', enforceCommentLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const idParse = announcementIdParam.safeParse(req.params)
  const bodyParse = createSchema.safeParse(req.body)
  if (!idParse.success || !bodyParse.success) {
    validationError(res, idParse.success ? bodyParse.error?.issues : idParse.error.issues)
    return
  }
  try {
    const announcement = await findAnnouncement(idParse.data.announcementId)
    if (!announcement) {
      res.status(404).json({
        error: t('announcements.notFound', {}, { defaultValue: 'Announcement not found' }),
      })
      return
    }
    const result = await create<AnnouncementCommentRow>('announcement_comments', {
      announcement_id: idParse.data.announcementId,
      parent_id: bodyParse.data.parent_id ?? null,
      author_id: ownerId,
      body: bodyParse.data.content,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('comments.create', error)
    internalError(res)
  }
})

// PATCH /comments/:announcementId/:commentId — edit own comment
router.patch('/:announcementId/:commentId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const idParse = commentIdsParam.safeParse(req.params)
  const bodyParse = updateSchema.safeParse(req.body)
  if (!idParse.success || !bodyParse.success) {
    validationError(res, idParse.success ? bodyParse.error?.issues : idParse.error.issues)
    return
  }
  try {
    const owned = await requireOwnedComment(idParse.data.commentId, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }),
      })
      return
    }
    const now = new Date()
    const result = await updateById<AnnouncementCommentRow>(
      'announcement_comments',
      idParse.data.commentId,
      {
        body: bodyParse.data.content,
        edited_at: now,
        updated_at: now,
      },
    )
    res.json(result.data)
  } catch (error) {
    logger.error('comments.patch', error)
    internalError(res)
  }
})

// DELETE /comments/:announcementId/:commentId — delete own comment
router.delete('/:announcementId/:commentId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = commentIdsParam.safeParse(req.params)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const owned = await requireOwnedComment(parsed.data.commentId, ownerId)
    if (!owned) {
      res.status(404).json({
        error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }),
      })
      return
    }
    await deleteById('announcement_comments', parsed.data.commentId)
    res.status(204).end()
  } catch (error) {
    logger.error('comments.delete', error)
    internalError(res)
  }
})

export default router
