import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

const startSessionSchema = z.object({
  booking_id: z.string().min(1),
})

const endSessionSchema = z.object({
  notes: z.string().optional(),
})

const messageSchema = z.object({
  content: z.string().min(1),
})

async function isParticipant(session: Record<string, unknown>, userId: string): Promise<boolean> {
  if (session.student_id === userId) return true
  const tutor = await findById<Record<string, unknown>>('tutor_profiles', String(session.tutor_id))
  return !!tutor && tutor.user_id === userId
}

router.post('/start', validateBody(startSessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof startSessionSchema>
    const booking = await findById<Record<string, unknown>>('bookings', body.booking_id)
    if (!booking) {
      res
        .status(404)
        .json({ error: t('bookings.notFound', undefined, { defaultValue: 'Booking not found' }) })
      return
    }
    let allowed = booking.student_id === userId
    if (!allowed) {
      const tutor = await findById<Record<string, unknown>>(
        'tutor_profiles',
        String(booking.tutor_id),
      )
      allowed = !!tutor && tutor.user_id === userId
    }
    if (!allowed) {
      res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const result = await create<Record<string, unknown>>('tutoring_sessions', {
      booking_id: body.booking_id,
      tutor_id: booking.tutor_id,
      student_id: booking.student_id,
      status: 'active',
      started_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const session = result.data as Record<string, unknown> | undefined
    if (session?.id) {
      await updateById('bookings', body.booking_id, {
        status: 'in_progress',
        updated_at: new Date(),
      })
      try {
        await broadcast(`session:${String(session.id)}`, 'session-started', session)
        // Also broadcast to the booking room so BOTH parties hear the start even
        // before they know the new session id (the session-keyed room can't reach
        // the non-starting party pre-start).
        await broadcast(`booking:${String(body.booking_id)}`, 'session-started', session)
      } catch (broadcastErr) {
        logger.warn?.(`broadcast failed: ${(broadcastErr as Error).message}`)
      }
    }
    res.status(201).json(session)
  } catch (err) {
    logger.error?.(`POST /sessions/start failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('tutoring_sessions', id)
    if (!session) {
      res
        .status(404)
        .json({ error: t('sessions.notFound', undefined, { defaultValue: 'Session not found' }) })
      return
    }
    if (!(await isParticipant(session, userId))) {
      res
        .status(404)
        .json({ error: t('sessions.notFound', undefined, { defaultValue: 'Session not found' }) })
      return
    }
    res.json(session)
  } catch (err) {
    logger.error?.(`GET /sessions/:id failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/end', validateBody(endSessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('tutoring_sessions', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('sessions.notFound', undefined, { defaultValue: 'Session not found' }) })
      return
    }
    if (!(await isParticipant(existing, userId))) {
      res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const body = req.body as z.infer<typeof endSessionSchema>
    const result = await updateById<Record<string, unknown>>('tutoring_sessions', id, {
      status: 'completed',
      ended_at: new Date(),
      notes: body.notes ?? null,
      updated_at: new Date(),
    })
    const updated = result.data as Record<string, unknown> | undefined
    if (existing.booking_id) {
      await updateById('bookings', String(existing.booking_id), {
        status: 'completed',
        updated_at: new Date(),
      })
    }
    try {
      await broadcast(`session:${id}`, 'session-ended', updated)
      // Also to the booking room so both parties get the end live (they both
      // joined `booking:<id>` on open, regardless of who ended it).
      if (existing.booking_id) {
        await broadcast(`booking:${String(existing.booking_id)}`, 'session-ended', updated)
      }
    } catch (broadcastErr) {
      logger.warn?.(`broadcast failed: ${(broadcastErr as Error).message}`)
    }
    res.json(updated)
  } catch (err) {
    logger.error?.(`POST /sessions/:id/end failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('tutoring_sessions', id)
    if (!session) {
      res
        .status(404)
        .json({ error: t('sessions.notFound', undefined, { defaultValue: 'Session not found' }) })
      return
    }
    if (!(await isParticipant(session, userId))) {
      res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const messages = await findMany('session_messages', {
      where: [{ field: 'session_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    res.json(messages)
  } catch (err) {
    logger.error?.(`GET /sessions/:id/messages failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/message', validateBody(messageSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const session = await findById<Record<string, unknown>>('tutoring_sessions', id)
    if (!session) {
      res
        .status(404)
        .json({ error: t('sessions.notFound', undefined, { defaultValue: 'Session not found' }) })
      return
    }
    if (!(await isParticipant(session, userId))) {
      res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const body = req.body as z.infer<typeof messageSchema>
    const result = await create<Record<string, unknown>>('session_messages', {
      session_id: id,
      user_id: userId,
      content: body.content,
      created_at: new Date(),
    })
    const message = result.data as Record<string, unknown> | undefined
    try {
      await broadcast(`session:${id}`, 'new-message', message)
    } catch (broadcastErr) {
      logger.warn?.(`broadcast failed: ${(broadcastErr as Error).message}`)
    }
    res.status(201).json(message)
  } catch (err) {
    logger.error?.(`POST /sessions/:id/message failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
