/**
 * Clips handler — list/read/create/update/delete clips on a project's track.
 *
 * Authorization: every clip is owner-scoped via the parent project. Mutations
 * require the requester to own the project; reads of foreign clips return 404.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireClipOwner, requireProjectOwner, requireTrackOwner } from '../lib/authz.js'

const createSchema = z.object({
  project_id: z.string().min(1),
  track_id: z.string().min(1),
  source_url: z.string().max(2_000).optional(),
  type: z.enum(['video', 'audio', 'image', 'text']).optional().default('video'),
  start_time: z.number().int().min(0).optional().default(0),
  end_time: z.number().int().min(0).optional().default(0),
  trim_start: z.number().int().min(0).optional().default(0),
  trim_end: z.number().int().min(0).optional().default(0),
  position: z.number().int().min(0).optional().default(0),
  volume: z.number().min(0).max(2).optional().default(1),
  speed: z.number().min(0.1).max(10).optional().default(1),
  text_content: z.string().max(2_000).optional(),
})

const updateSchema = z.object({
  source_url: z.string().max(2_000).optional(),
  start_time: z.number().int().min(0).optional(),
  end_time: z.number().int().min(0).optional(),
  trim_start: z.number().int().min(0).optional(),
  trim_end: z.number().int().min(0).optional(),
  position: z.number().int().min(0).optional(),
  volume: z.number().min(0).max(2).optional(),
  speed: z.number().min(0.1).max(10).optional(),
  text_content: z.string().max(2_000).nullable().optional(),
  track_id: z.string().min(1).optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  const projectId = String(req.query.projectId ?? req.query.project_id ?? '')
  if (!projectId) {
    res.status(400).json({
      error: t('clips.projectRequired', undefined, { defaultValue: 'Project ID is required' }),
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireProjectOwner(projectId, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    const clips = await findMany('clips', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 1_000,
    })
    res.json(clips)
  } catch (error) {
    logger.error('clips.list', error)
    res.status(500).json({
      error: t('clips.listError', undefined, { defaultValue: 'Failed to list clips' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireClipOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('clips.read', error)
    res.status(500).json({
      error: t('clips.readError', undefined, { defaultValue: 'Failed to read clip' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
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
    const projectCheck = await requireProjectOwner(parsed.data.project_id, userId)
    if (!projectCheck.ok) {
      res.status(projectCheck.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    const trackCheck = await requireTrackOwner(parsed.data.track_id, userId)
    if (!trackCheck.ok) {
      res.status(trackCheck.status).json({
        error: t('timeline.trackNotFound', undefined, { defaultValue: 'Track not found' }),
      })
      return
    }
    const result = await create('clips', {
      project_id: parsed.data.project_id,
      track_id: parsed.data.track_id,
      owner_id: userId,
      source_url: parsed.data.source_url ?? null,
      type: parsed.data.type ?? 'video',
      start_time: parsed.data.start_time ?? 0,
      end_time: parsed.data.end_time ?? 0,
      trim_start: parsed.data.trim_start ?? 0,
      trim_end: parsed.data.trim_end ?? 0,
      position: parsed.data.position ?? 0,
      volume: parsed.data.volume ?? 1,
      speed: parsed.data.speed ?? 1,
      text_content: parsed.data.text_content ?? null,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('clips.create', error)
    res.status(500).json({
      error: t('clips.createError', undefined, { defaultValue: 'Failed to create clip' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
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
    const check = await requireClipOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found' }),
      })
      return
    }
    if (parsed.data.track_id) {
      const trackCheck = await requireTrackOwner(parsed.data.track_id, userId)
      if (!trackCheck.ok) {
        res.status(trackCheck.status).json({
          error: t('timeline.trackNotFound', undefined, { defaultValue: 'Track not found' }),
        })
        return
      }
    }
    const result = await updateById('clips', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('clips.update', error)
    res.status(500).json({
      error: t('clips.updateError', undefined, { defaultValue: 'Failed to update clip' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireClipOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found' }),
      })
      return
    }
    await deleteById('clips', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('clips.delete', error)
    res.status(500).json({
      error: t('clips.deleteError', undefined, { defaultValue: 'Failed to delete clip' }),
    })
  }
})

export default router
