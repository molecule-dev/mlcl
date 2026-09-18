import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createNoteSchema = z.object({
  clip_id: z.string().uuid(),
  pitch: z.number().int().min(0).max(127),
  velocity: z.number().int().min(0).max(127).default(100),
  start: z.number().nonnegative().default(0),
  duration: z.number().nonnegative().default(0),
})

const updateNoteSchema = z.object({
  pitch: z.number().int().min(0).max(127).optional(),
  velocity: z.number().int().min(0).max(127).optional(),
  start: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const clipId = typeof req.query.clip_id === 'string' ? req.query.clip_id : null
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (clipId) where.push({ field: 'clip_id', operator: '=', value: clipId })

    const notes = await findMany('midi_notes', {
      where,
      orderBy: [{ field: 'start', direction: 'asc' }],
    })
    res.json(notes)
  } catch (error) {
    logger.error('midiNotes.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createNoteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createNoteSchema>

    const clip = await findById<Record<string, unknown>>('clips', body.clip_id)
    if (!clip || clip.user_id !== userId) {
      return res.status(404).json({
        error: t('clips.notFound', undefined, { defaultValue: 'Clip not found.' }),
      })
    }

    const result = await create('midi_notes', {
      clip_id: body.clip_id,
      user_id: userId,
      pitch: body.pitch,
      velocity: body.velocity,
      start: body.start,
      duration: body.duration,
      created_at: new Date(),
    })

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('midiNotes.create', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateNoteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('midi_notes', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('midiNotes.notFound', undefined, { defaultValue: 'MIDI note not found.' }),
      })
    }

    const body = req.body as z.infer<typeof updateNoteSchema>
    const updates: Record<string, unknown> = {}
    if (body.pitch !== undefined) updates.pitch = body.pitch
    if (body.velocity !== undefined) updates.velocity = body.velocity
    if (body.start !== undefined) updates.start = body.start
    if (body.duration !== undefined) updates.duration = body.duration

    const result = await updateById('midi_notes', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('midiNotes.update', error)
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
    const existing = await findById<Record<string, unknown>>('midi_notes', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('midiNotes.notFound', undefined, { defaultValue: 'MIDI note not found.' }),
      })
    }

    await deleteById('midi_notes', id)
    res.status(204).end()
  } catch (error) {
    logger.error('midiNotes.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
