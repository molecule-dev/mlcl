import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createSegmentSchema = z.object({
  meeting_id: z.string().uuid(),
  ts_start_ms: z.number().int().nonnegative(),
  ts_end_ms: z.number().int().nonnegative(),
  speaker_id: z.string().uuid().optional(),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const meetingId = typeof req.query.meeting_id === 'string' ? req.query.meeting_id : null
  const where: Array<{ field: string; operator: '='; value: string }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (meetingId) where.push({ field: 'meeting_id', operator: '=', value: meetingId })

  const segments = await findMany('transcript_segments', {
    where,
    orderBy: [{ field: 'ts_start_ms', direction: 'asc' }],
  })

  res.json(segments)
})

router.post('/', validateBody(createSegmentSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const body = req.body as z.infer<typeof createSegmentSchema>

  const meeting = await findById<Record<string, unknown>>('meetings', body.meeting_id)
  if (!meeting || meeting.user_id !== userId) {
    return res.status(404).json({
      error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found.' }),
    })
  }

  const result = await create('transcript_segments', {
    meeting_id: body.meeting_id,
    user_id: userId,
    ts_start_ms: body.ts_start_ms,
    ts_end_ms: body.ts_end_ms,
    speaker_id: body.speaker_id ?? null,
    text: body.text,
    confidence: body.confidence,
    created_at: new Date(),
  })

  const created = (result as { data?: Record<string, unknown> }).data ?? result
  res.status(201).json(created)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('transcript_segments', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('transcripts.notFound', undefined, {
        defaultValue: 'Transcript segment not found.',
      }),
    })
  }

  await deleteById('transcript_segments', id)
  res.status(204).end()
})

export default router
