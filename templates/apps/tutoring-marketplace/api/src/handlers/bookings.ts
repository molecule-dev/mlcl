import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createBookingSchema = z.object({
  tutor_id: z.string().min(1),
  subject: z.string().optional(),
  scheduled_at: z.string().min(1),
  duration_hours: z.number().positive(),
  payment_intent_id: z.string().optional(),
})

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
})

async function attachTutor(
  bookings: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const tutorIds = Array.from(
    new Set(bookings.map((b) => b.tutor_id).filter((id) => typeof id === 'string')),
  ) as string[]
  const tutorMap: Record<string, Record<string, unknown>> = {}
  for (const id of tutorIds) {
    try {
      const tutor = await findById<Record<string, unknown>>('tutor_profiles', id)
      if (tutor) tutorMap[id] = tutor
    } catch (lookupErr) {
      logger.warn?.(`tutor lookup failed for booking enrichment: ${(lookupErr as Error).message}`)
    }
  }
  return bookings.map((b) => {
    const tutor = tutorMap[String(b.tutor_id)]
    return {
      ...b,
      tutor_name: tutor?.display_name ?? null,
      tutor_avatar_url: tutor?.avatar_url ?? null,
      hourly_rate: tutor?.hourly_rate ?? null,
    }
  })
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const role = req.query.role === 'tutor' ? 'tutor' : 'student'
    const field = role === 'tutor' ? 'tutor_id' : 'student_id'
    let scope: string = userId
    if (role === 'tutor') {
      const tutor = await findMany<Record<string, unknown>>('tutor_profiles', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        limit: 1,
      })
      if (tutor.length === 0) {
        res.json([])
        return
      }
      scope = String(tutor[0].id)
    }
    const where: WhereCondition[] = [{ field, operator: '=', value: scope }]
    if (req.query.status)
      where.push({ field: 'status', operator: '=', value: String(req.query.status) })
    const orderBy: OrderBy[] = [{ field: 'scheduled_at', direction: 'desc' }]
    const bookings = (await findMany('bookings', { where, orderBy, limit: 100 })) as Array<
      Record<string, unknown>
    >
    res.json(await attachTutor(bookings))
  } catch (err) {
    logger.error?.(`GET /bookings failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId
    if (studentId !== userId) {
      res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const bookings = await findMany('bookings', {
      where: [{ field: 'student_id', operator: '=', value: studentId }],
      orderBy: [{ field: 'scheduled_at', direction: 'desc' }],
    })
    res.json(await attachTutor(bookings as Array<Record<string, unknown>>))
  } catch (err) {
    logger.error?.(`GET /bookings/student/:studentId failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/tutor/:tutorId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const tutorId = Array.isArray(req.params.tutorId) ? req.params.tutorId[0] : req.params.tutorId
    const tutor = await findById<Record<string, unknown>>('tutor_profiles', tutorId)
    if (!tutor || tutor.user_id !== userId) {
      res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
      return
    }
    const bookings = (await findMany('bookings', {
      where: [{ field: 'tutor_id', operator: '=', value: tutorId }],
      orderBy: [{ field: 'scheduled_at', direction: 'desc' }],
    })) as Array<Record<string, unknown>>
    res.json(await attachTutor(bookings))
  } catch (err) {
    logger.error?.(`GET /bookings/tutor/:tutorId failed: ${(err as Error).message}`)
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
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking) {
      res
        .status(404)
        .json({ error: t('bookings.notFound', undefined, { defaultValue: 'Booking not found' }) })
      return
    }
    let tutor: Record<string, unknown> | null = null
    if (booking.tutor_id) {
      try {
        tutor = await findById<Record<string, unknown>>('tutor_profiles', String(booking.tutor_id))
      } catch (lookupErr) {
        logger.warn?.(`tutor lookup failed: ${(lookupErr as Error).message}`)
      }
    }
    if (booking.student_id !== userId) {
      if (!tutor || tutor.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('bookings.notFound', undefined, { defaultValue: 'Booking not found' }) })
        return
      }
    }
    res.json({
      ...booking,
      tutor_name: tutor?.display_name ?? null,
      tutor_avatar_url: tutor?.avatar_url ?? null,
      hourly_rate: tutor?.hourly_rate ?? null,
    })
  } catch (err) {
    logger.error?.(`GET /bookings/:id failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createBookingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createBookingSchema>
    const tutor = await findById<Record<string, unknown>>('tutor_profiles', body.tutor_id)
    if (!tutor) {
      res
        .status(404)
        .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
      return
    }
    if (tutor.user_id === userId) {
      res.status(400).json({
        error: t('bookings.cannotBookSelf', undefined, {
          defaultValue: 'Cannot book your own tutor profile.',
        }),
      })
      return
    }

    // Prevent double-booking a tutor: reject if the tutor already has a CONFIRMED session
    // overlapping the requested window. Bookings store scheduled_at + duration_hours (no end
    // column), so we fetch confirmed sessions that could overlap (start before the new one
    // ends, and no more than a day before it starts — a session can't run >24h) and compute
    // the overlap in JS. Overlapping pending REQUESTS are allowed; only a confirmed session
    // makes the tutor unavailable. (A DB EXCLUDE constraint would close the concurrent race.)
    const HOUR_MS = 3_600_000
    const newStart = new Date(body.scheduled_at).getTime()
    const newEnd = newStart + body.duration_hours * HOUR_MS
    if (Number.isFinite(newStart) && Number.isFinite(newEnd)) {
      const candidates = await findMany<Record<string, unknown>>('bookings', {
        where: [
          { field: 'tutor_id', operator: '=', value: body.tutor_id },
          { field: 'status', operator: '=', value: 'confirmed' },
          { field: 'scheduled_at', operator: '<', value: new Date(newEnd).toISOString() },
          {
            field: 'scheduled_at',
            operator: '>',
            value: new Date(newStart - 24 * HOUR_MS).toISOString(),
          },
        ],
        limit: 50,
      })
      const clash = candidates.some((b) => {
        const s = new Date(String(b.scheduled_at)).getTime()
        const e = s + Number(b.duration_hours ?? 0) * HOUR_MS
        return Number.isFinite(s) && s < newEnd && e > newStart
      })
      if (clash) {
        res.status(409).json({
          error: t('bookings.tutorUnavailable', undefined, {
            defaultValue: 'That tutor is already booked for the selected time.',
          }),
        })
        return
      }
    }

    const totalAmount = Math.round((tutor.hourly_rate as number) * body.duration_hours)
    const result = await create<Record<string, unknown>>('bookings', {
      student_id: userId,
      tutor_id: body.tutor_id,
      subject: body.subject ?? null,
      scheduled_at: new Date(body.scheduled_at),
      duration_hours: body.duration_hours,
      total_amount: totalAmount,
      currency: 'USD',
      payment_intent_id: body.payment_intent_id ?? null,
      status: body.payment_intent_id ? 'confirmed' : 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    })
    const booking = result.data as Record<string, unknown> | undefined

    try {
      await sendMail({
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        to: process.env.TUTOR_NOTIFICATIONS_TO ?? `tutor+${tutor.user_id}@flagship.test`,
        subject: t('bookings.newBookingSubject', undefined, {
          defaultValue: 'New tutoring session booked',
        }),
        text: t(
          'bookings.newBookingBody',
          { date: body.scheduled_at },
          { defaultValue: `A new session has been booked for ${body.scheduled_at}.` },
        ),
      })
    } catch (mailErr) {
      logger.warn?.(`booking notification email failed: ${(mailErr as Error).message}`)
    }

    res.status(201).json(booking)
  } catch (err) {
    logger.error?.(`POST /bookings failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = getParamId(req)
    const booking = await findById<Record<string, unknown>>('bookings', id)
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
    const sessions = await findMany('tutoring_sessions', {
      where: [{ field: 'booking_id', operator: '=', value: id }],
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit: 50,
    })
    res.json(sessions)
  } catch (err) {
    logger.error?.(`GET /bookings/:id/sessions failed: ${(err as Error).message}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id/cancel',
  validateBody(cancelBookingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
        return
      }
      const id = getParamId(req)
      const booking = await findById<Record<string, unknown>>('bookings', id)
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
      const body = req.body as z.infer<typeof cancelBookingSchema>
      const result = await updateById<Record<string, unknown>>('bookings', id, {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancel_reason: body.reason ?? null,
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error?.(`PUT /bookings/:id/cancel failed: ${(err as Error).message}`)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
