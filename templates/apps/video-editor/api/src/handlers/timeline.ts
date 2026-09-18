/**
 * Timeline handler — tracks + transitions for a project.
 *
 * Authorization: tracks and transitions are owner-scoped via the parent
 * project. List/create/update/delete all require requireProjectOwner /
 * requireTrackOwner / requireTransitionOwner.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireProjectOwner, requireTrackOwner, requireTransitionOwner } from '../lib/authz.js'

const trackCreateSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  type: z.enum(['video', 'audio', 'text']).optional().default('video'),
  position: z.number().int().min(0).optional(),
})

const trackUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  muted: z.boolean().optional(),
  locked: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

const transitionCreateSchema = z.object({
  project_id: z.string().min(1),
  type: z.enum(['cut', 'fade', 'wipe', 'slide']).optional().default('fade'),
  duration_ms: z.number().int().min(0).max(10_000).optional().default(500),
  clip_before_id: z.string().min(1).optional(),
  clip_after_id: z.string().min(1).optional(),
  position: z.number().int().min(0).optional().default(0),
})

const router = Router()

router.use(requireAuth)

router.get('/tracks', async (req: Request, res: Response) => {
  const projectId = String(req.query.projectId ?? req.query.project_id ?? '')
  if (!projectId) {
    res.status(400).json({
      error: t('timeline.projectRequired', undefined, { defaultValue: 'Project ID is required' }),
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
    const tracks = await findMany('tracks', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 200,
    })
    res.json(tracks)
  } catch (error) {
    logger.error('timeline.listTracks', error)
    res.status(500).json({
      error: t('timeline.listTracksError', undefined, { defaultValue: 'Failed to list tracks' }),
    })
  }
})

router.post('/tracks', async (req: Request, res: Response) => {
  const parsed = trackCreateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireProjectOwner(parsed.data.project_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    let position = parsed.data.position
    if (position === undefined) {
      const existing = await findMany<{ position: number }>('tracks', {
        where: [{ field: 'project_id', operator: '=', value: parsed.data.project_id }],
        orderBy: [{ field: 'position', direction: 'desc' }],
        limit: 1,
      })
      position = existing.length > 0 ? Number(existing[0].position) + 1 : 0
    }
    const result = await create('tracks', {
      project_id: parsed.data.project_id,
      owner_id: userId,
      name:
        parsed.data.name ?? t('timeline.defaultTrackName', undefined, { defaultValue: 'Track' }),
      type: parsed.data.type ?? 'video',
      muted: false,
      locked: false,
      position,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('timeline.createTrack', error)
    res.status(500).json({
      error: t('timeline.createTrackError', undefined, { defaultValue: 'Failed to create track' }),
    })
  }
})

router.put('/tracks/:id', async (req: Request, res: Response) => {
  const parsed = trackUpdateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireTrackOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('timeline.trackNotFound', undefined, { defaultValue: 'Track not found' }),
      })
      return
    }
    const result = await updateById('tracks', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('timeline.updateTrack', error)
    res.status(500).json({
      error: t('timeline.updateTrackError', undefined, { defaultValue: 'Failed to update track' }),
    })
  }
})

router.delete('/tracks/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireTrackOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('timeline.trackNotFound', undefined, { defaultValue: 'Track not found' }),
      })
      return
    }
    await deleteById('tracks', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('timeline.deleteTrack', error)
    res.status(500).json({
      error: t('timeline.deleteTrackError', undefined, { defaultValue: 'Failed to delete track' }),
    })
  }
})

router.get('/transitions', async (req: Request, res: Response) => {
  const projectId = String(req.query.projectId ?? req.query.project_id ?? '')
  if (!projectId) {
    res.status(400).json({
      error: t('timeline.projectRequired', undefined, { defaultValue: 'Project ID is required' }),
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
    const transitions = await findMany('transitions', {
      where: [{ field: 'project_id', operator: '=', value: projectId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 500,
    })
    res.json(transitions)
  } catch (error) {
    logger.error('timeline.listTransitions', error)
    res.status(500).json({
      error: t('timeline.listTransitionsError', undefined, {
        defaultValue: 'Failed to list transitions',
      }),
    })
  }
})

router.post('/transitions', async (req: Request, res: Response) => {
  const parsed = transitionCreateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireProjectOwner(parsed.data.project_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('projects.notFound', undefined, { defaultValue: 'Project not found' }),
      })
      return
    }
    const result = await create('transitions', {
      project_id: parsed.data.project_id,
      owner_id: userId,
      type: parsed.data.type ?? 'fade',
      duration_ms: parsed.data.duration_ms ?? 500,
      clip_before_id: parsed.data.clip_before_id ?? null,
      clip_after_id: parsed.data.clip_after_id ?? null,
      position: parsed.data.position ?? 0,
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('timeline.createTransition', error)
    res.status(500).json({
      error: t('timeline.createTransitionError', undefined, {
        defaultValue: 'Failed to create transition',
      }),
    })
  }
})

router.delete('/transitions/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireTransitionOwner(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('timeline.transitionNotFound', undefined, {
          defaultValue: 'Transition not found',
        }),
      })
      return
    }
    await deleteById('transitions', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('timeline.deleteTransition', error)
    res.status(500).json({
      error: t('timeline.deleteTransitionError', undefined, {
        defaultValue: 'Failed to delete transition',
      }),
    })
  }
})

export default router
