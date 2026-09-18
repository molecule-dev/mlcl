import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_KINDS = ['audio', 'midi'] as const

const createClipSchema = z.object({
  track_id: z.string().uuid(),
  kind: z.enum(ALLOWED_KINDS).default('audio'),
  start_time: z.number().nonnegative().default(0),
  duration: z.number().nonnegative().default(0),
  source_url: z.string().optional(),
  notes: z.array(z.unknown()).optional(),
})

const updateClipSchema = z.object({
  start_time: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  source_url: z.string().nullable().optional(),
  notes: z.array(z.unknown()).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const trackId = typeof req.query.track_id === 'string' ? req.query.track_id : null
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (trackId) where.push({ field: 'track_id', operator: '=', value: trackId })

    const clips = await findMany('clips', {
      where,
      orderBy: [{ field: 'start_time', direction: 'asc' }],
    })
    res.json(clips)
  } catch (error) {
    logger.error('clips.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const clip = await findById<Record<string, unknown>>('clips', id)
    if (!clip || clip.user_id !== userId) {
      return res.status(404).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found.' }),
      })
    }

    const notes = await findMany('midi_notes', {
      where: [{ field: 'clip_id', operator: '=', value: id }],
      orderBy: [{ field: 'start', direction: 'asc' }],
    })

    res.json({ ...clip, midi_notes: notes })
  } catch (error) {
    logger.error('clips.get', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createClipSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createClipSchema>

    const track = await findById<Record<string, unknown>>('audio_tracks', body.track_id)
    if (!track || track.user_id !== userId) {
      return res.status(404).json({
        error: t('tracks.notFound', undefined, { defaultValue: 'Track not found.' }),
      })
    }

    const result = await create('clips', {
      track_id: body.track_id,
      user_id: userId,
      kind: body.kind,
      start_time: body.start_time,
      duration: body.duration,
      source_url: body.source_url ?? null,
      notes: body.notes ? JSON.stringify(body.notes) : null,
      created_at: new Date(),
    })

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('clips.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateClipSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('clips', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found.' }),
      })
    }

    const body = req.body as z.infer<typeof updateClipSchema>
    const updates: Record<string, unknown> = {}
    if (body.start_time !== undefined) updates.start_time = body.start_time
    if (body.duration !== undefined) updates.duration = body.duration
    if (body.source_url !== undefined) updates.source_url = body.source_url
    if (body.notes !== undefined) updates.notes = JSON.stringify(body.notes)

    const result = await updateById('clips', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('clips.update', error)
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
    const existing = await findById<Record<string, unknown>>('clips', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found.' }),
      })
    }

    await deleteById('clips', id)
    res.status(204).end()
  } catch (error) {
    logger.error('clips.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
