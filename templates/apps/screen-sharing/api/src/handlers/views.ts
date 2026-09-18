/**
 * Recording views handler — list/create/update views + analytics aggregation.
 *
 * Authorization: list/analytics restricted to the recording owner. Create
 * (heartbeat begin) requires the viewer to have read access via
 * `requireRecordingAccess`. Update (heartbeat tick) is restricted to the
 * owner_id stamped on the view row at creation time.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireRecordingAccess, requireRecordingOwner } from '../lib/authz.js'

const createSchema = z.object({
  viewer_email: z.string().email().optional(),
  user_agent: z.string().max(500).optional(),
  ip_hash: z.string().max(120).optional(),
})

const updateSchema = z.object({
  watch_percent: z.number().int().min(0).max(100).optional(),
  watched_seconds_total: z.number().int().min(0).optional(),
  watched_until: z.number().int().min(0).optional(),
  completed_at: z.string().datetime().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/:recordingId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(req.params.recordingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const views = await findMany('recording_views', {
      where: [{ field: 'recording_id', operator: '=', value: req.params.recordingId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    res.json(views)
  } catch (error) {
    logger.error('views.list', error)
    res.status(500).json({
      error: t('views.listError', undefined, { defaultValue: 'Failed to list views' }),
    })
  }
})

router.get('/:recordingId/analytics', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireRecordingOwner(req.params.recordingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('recordings.notFound', undefined, { defaultValue: 'Recording not found' }),
      })
      return
    }
    const views = await findMany<Record<string, unknown>>('recording_views', {
      where: [{ field: 'recording_id', operator: '=', value: req.params.recordingId }],
      limit: 5_000,
    })
    const totalViews = views.length
    const uniqueViewers = new Set(
      views.map((v) => String(v.viewer_user_id ?? v.viewer_email ?? v.ip_hash ?? '')),
    ).size
    const avgWatchPercent = views.length
      ? Math.round(views.reduce((sum, v) => sum + (Number(v.watch_percent) || 0), 0) / views.length)
      : 0
    res.json({
      total_views: totalViews,
      unique_viewers: uniqueViewers,
      avg_watch_percent: avgWatchPercent,
    })
  } catch (error) {
    logger.error('views.analytics', error)
    res.status(500).json({
      error: t('views.analyticsError', undefined, {
        defaultValue: 'Failed to compute analytics',
      }),
    })
  }
})

router.post('/:recordingId', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body ?? {})
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
    const recording = check.row
    const result = await create('recording_views', {
      recording_id: req.params.recordingId,
      owner_id: String(recording.owner_id),
      viewer_user_id: userId,
      viewer_email: parsed.data.viewer_email ?? null,
      user_agent: parsed.data.user_agent ?? null,
      ip_hash: parsed.data.ip_hash ?? null,
      watched_seconds_total: 0,
      watch_percent: 0,
      created_at: new Date().toISOString(),
    })
    try {
      await updateById('recordings', req.params.recordingId as string, {
        view_count: (Number(recording.view_count) || 0) + 1,
      })
    } catch (_error) {
      // counter increment non-fatal — do not fail the view creation
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('views.create', error)
    res.status(500).json({
      error: t('views.createError', undefined, { defaultValue: 'Failed to record view' }),
    })
  }
})

router.put('/:recordingId/:viewId', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const view = await findById<Record<string, unknown>>(
      'recording_views',
      req.params.viewId as string,
    )
    if (!view || String(view.recording_id) !== String(req.params.recordingId)) {
      res.status(404).json({
        error: t('views.notFound', undefined, { defaultValue: 'View not found' }),
      })
      return
    }
    if (
      String(view.viewer_user_id) !== String(userId) &&
      String(view.owner_id) !== String(userId)
    ) {
      res.status(404).json({
        error: t('views.notFound', undefined, { defaultValue: 'View not found' }),
      })
      return
    }
    const result = await updateById('recording_views', req.params.viewId as string, {
      ...parsed.data,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('views.update', error)
    res.status(500).json({
      error: t('views.updateError', undefined, { defaultValue: 'Failed to update view' }),
    })
  }
})

export default router
