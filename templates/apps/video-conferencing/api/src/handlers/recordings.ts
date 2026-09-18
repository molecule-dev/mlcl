/**
 * Meeting recordings handler — list/read/create/delete.
 *
 * Authorization: list/read requires meeting access (host, workspace member,
 * or participant). Create/delete are owner-only (server-side or host writes
 * the row when MediaRecorder finishes uploading to S3).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireMeetingAccess, requireMeetingHost } from '../lib/authz.js'

const createSchema = z.object({
  meeting_id: z.string().min(1),
  video_url: z.string().min(1).max(2_000),
  thumbnail_url: z.string().max(2_000).optional(),
  duration_ms: z.number().int().min(0).optional().default(0),
  size_bytes: z.number().int().min(0).optional().default(0),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    if (req.query.meeting_id) {
      const check = await requireMeetingAccess(String(req.query.meeting_id), userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
        })
        return
      }
      const rows = await findMany('recordings', {
        where: [{ field: 'meeting_id', operator: '=', value: String(req.query.meeting_id) }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      res.json(rows)
      return
    }
    // No meeting filter — only return recordings the user owns.
    const rows = await findMany('recordings', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(rows)
  } catch (error) {
    logger.error('recordings.list', error)
    res.status(500).json({
      error: t('recordings.listError', undefined, { defaultValue: 'Failed to list recordings' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const recording = await findById<Record<string, unknown>>('recordings', req.params.id as string)
    if (!recording) {
      res.status(404).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    // Owner OR a meeting participant may view.
    if (String(recording.owner_id) !== String(userId)) {
      const check = await requireMeetingAccess(String(recording.meeting_id), userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
        })
        return
      }
    }
    res.json(recording)
  } catch (error) {
    logger.error('recordings.read', error)
    res.status(500).json({
      error: t('recordings.readError', undefined, { defaultValue: 'Failed to read recording' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
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
    // Only the meeting host may register a recording.
    const check = await requireMeetingHost(parsed.data.meeting_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const result = await create('recordings', {
      meeting_id: parsed.data.meeting_id,
      owner_id: userId,
      video_url: parsed.data.video_url,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      duration_ms: parsed.data.duration_ms ?? 0,
      size_bytes: parsed.data.size_bytes ?? 0,
      status: 'ready',
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('recordings.create', error)
    res.status(500).json({
      error: t('recordings.createError', undefined, {
        defaultValue: 'Failed to register recording',
      }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const recording = await findById<Record<string, unknown>>('recordings', req.params.id as string)
    if (!recording || String(recording.owner_id) !== String(userId)) {
      res.status(404).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const result = await updateById('recordings', req.params.id as string, {
      ...(typeof req.body === 'object' && req.body !== null ? req.body : {}),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('recordings.update', error)
    res.status(500).json({
      error: t('recordings.updateError', undefined, { defaultValue: 'Failed to update recording' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const recording = await findById<Record<string, unknown>>('recordings', req.params.id as string)
    if (!recording || String(recording.owner_id) !== String(userId)) {
      res.status(404).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    await deleteById('recordings', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('recordings.delete', error)
    res.status(500).json({
      error: t('recordings.deleteError', undefined, { defaultValue: 'Failed to delete recording' }),
    })
  }
})

export default router
