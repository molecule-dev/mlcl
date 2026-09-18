/**
 * Recording comments handler — list/create/delete time-coded comments.
 *
 * Authorization: any user with read access to the recording may list/create
 * comments (when `comments_allowed` is true). Delete is restricted to the
 * comment author OR the recording owner.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { loadRecording, requireRecordingAccess } from '../lib/authz.js'

const createSchema = z.object({
  content: z.string().min(1).max(2_000),
  timestamp_ms: z.number().int().min(0).optional().default(0),
  parent_comment_id: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
})

const router = Router()

router.get('/:recordingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingAccess(req.params.recordingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const comments = await findMany('recording_comments', {
      where: [{ field: 'recording_id', operator: '=', value: req.params.recordingId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    res.json(comments)
  } catch (error) {
    logger.error('comments.list', error)
    res.status(500).json({
      error: t('comments.listError', undefined, { defaultValue: 'Failed to list comments' }),
    })
  }
})

router.post('/:recordingId', requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingAccess(req.params.recordingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    if (check.row.comments_allowed === false) {
      res.status(403).json({
        error: t('comments.disabled', undefined, { defaultValue: 'Comments are disabled' }),
      })
      return
    }
    const result = await create('recording_comments', {
      recording_id: req.params.recordingId,
      owner_id: String(check.row.owner_id),
      user_id: userId,
      name: parsed.data.name ?? null,
      content: parsed.data.content,
      timestamp_ms: parsed.data.timestamp_ms ?? 0,
      parent_comment_id: parsed.data.parent_comment_id ?? null,
      created_at: new Date().toISOString(),
    })
    // Bump the denormalised counter on the parent recording so list views
    // (Library, Profile, Billing usage) reflect the new total without a
    // separate count query per row.
    try {
      await updateById('recordings', req.params.recordingId as string, {
        comment_count: (Number(check.row.comment_count) || 0) + 1,
        updated_at: new Date().toISOString(),
      })
    } catch (_error) {
      // counter bump is best-effort — do not fail the comment write
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('comments.create', error)
    res.status(500).json({
      error: t('comments.createError', undefined, { defaultValue: 'Failed to create comment' }),
    })
  }
})

router.delete('/:recordingId/:commentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const comment = await findById<Record<string, unknown>>(
      'recording_comments',
      req.params.commentId as string,
    )
    if (!comment || String(comment.recording_id) !== String(req.params.recordingId)) {
      res.status(404).json({
        error: t('comments.notFound', undefined, { defaultValue: 'Comment not found' }),
      })
      return
    }
    const isAuthor = String(comment.user_id) === String(userId)
    let isOwner = false
    if (!isAuthor) {
      const recording = await loadRecording(String(comment.recording_id))
      isOwner = !!recording && String(recording.owner_id) === String(userId)
    }
    if (!isAuthor && !isOwner) {
      res.status(404).json({
        error: t('comments.notFound', undefined, { defaultValue: 'Comment not found' }),
      })
      return
    }
    await deleteById('recording_comments', req.params.commentId as string)
    try {
      const recording = await loadRecording(String(comment.recording_id))
      if (recording) {
        await updateById('recordings', recording.id as string, {
          comment_count: Math.max(0, (Number(recording.comment_count) || 0) - 1),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (_error) {
      // counter bump is best-effort — do not fail the delete
    }
    res.status(204).end()
  } catch (error) {
    logger.error('comments.delete', error)
    res.status(500).json({
      error: t('comments.deleteError', undefined, { defaultValue: 'Failed to delete comment' }),
    })
  }
})

export default router
