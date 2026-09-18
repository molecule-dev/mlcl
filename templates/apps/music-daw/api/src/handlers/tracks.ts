import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { MusicDawLimits } from '../tiers.js'

const router = Router()

const ALLOWED_TYPES = ['audio', 'midi', 'aux'] as const

const createTrackSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: z.enum(ALLOWED_TYPES).default('audio'),
  instrument_id: z.string().uuid().optional(),
})

const updateTrackSchema = z.object({
  name: z.string().min(1).optional(),
  volume: z.number().min(0).max(1).optional(),
  pan: z.number().min(-1).max(1).optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
  armed: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
  instrument_id: z.string().uuid().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : null
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (projectId) where.push({ field: 'project_id', operator: '=', value: projectId })

    const tracks = await findMany('audio_tracks', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(tracks)
  } catch (error) {
    logger.error('tracks.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier track cap (tiers.ts maxTracks) — defined + shown on Pricing but never enforced.
const enforceTrackLimit = enforceLimit<MusicDawLimits>({
  limitType: 'maxTracks',
  getLimit: (limits) => limits.maxTracks,
  getCurrent: async (userId) =>
    count('audio_tracks', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceTrackLimit,
  validateBody(createTrackSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const body = req.body as z.infer<typeof createTrackSchema>

      const project = await findById<Record<string, unknown>>('music_projects', body.project_id)
      if (!project || project.user_id !== userId) {
        return res.status(404).json({
          error: t('projects.notFound', undefined, { defaultValue: 'Project not found.' }),
        })
      }

      const existing = await findMany('audio_tracks', {
        where: [{ field: 'project_id', operator: '=', value: body.project_id }],
        orderBy: [{ field: 'position', direction: 'desc' }],
        limit: 1,
      })
      const nextPosition =
        Array.isArray(existing) && existing.length > 0
          ? ((existing[0] as { position?: number }).position ?? 0) + 1
          : 0

      const result = await create('audio_tracks', {
        project_id: body.project_id,
        user_id: userId,
        name: body.name ?? t('tracks.defaultName', undefined, { defaultValue: 'New Track' }),
        type: body.type,
        instrument_id: body.instrument_id ?? null,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        armed: false,
        position: nextPosition,
        created_at: new Date(),
      })

      const created = (result as { data?: Record<string, unknown> }).data ?? result
      res.status(201).json(created)
    } catch (error) {
      logger.error('tracks.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.put('/:id', validateBody(updateTrackSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('audio_tracks', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('tracks.notFound', undefined, { defaultValue: 'Track not found.' }),
      })
    }

    const body = req.body as z.infer<typeof updateTrackSchema>
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.volume !== undefined) updates.volume = body.volume
    if (body.pan !== undefined) updates.pan = body.pan
    if (body.muted !== undefined) updates.muted = body.muted
    if (body.solo !== undefined) updates.solo = body.solo
    if (body.armed !== undefined) updates.armed = body.armed
    if (body.position !== undefined) updates.position = body.position
    if (body.instrument_id !== undefined) updates.instrument_id = body.instrument_id

    const result = await updateById('audio_tracks', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('tracks.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('audio_tracks', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('tracks.notFound', undefined, { defaultValue: 'Track not found.' }),
      })
    }

    await deleteById('audio_tracks', id)
    res.status(204).end()
  } catch (error) {
    logger.error('tracks.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
