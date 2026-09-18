/**
 * Telemedicine — appointments handler.
 *
 * Owner scope: a row's owner is `patient_user_id`; provider users may also
 * read appointments where they are the provider via `provider_user_id`.
 * Both branches are enforced by the read/update/cancel handlers below
 * (see G6 — no IDOR).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateAppointments } from './_lib/decorate.js'
import { getParamId, getUserId } from './_lib/shared.js'
import { seedForUser } from './_seed.js'

const router = Router()

const ALLOWED_TYPES = ['video', 'audio', 'phone', 'in_person', 'messaging'] as const
const ALLOWED_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'] as const

const createSchema = z.object({
  provider_id: z.string().min(1),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().int().positive().optional(),
  type: z.enum(ALLOWED_TYPES).default('video'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  scheduled_at: z.string().optional().nullable(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  type: z.enum(ALLOWED_TYPES).optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(ALLOWED_STATUSES).optional(),
})

const cancelSchema = z.object({
  reason: z.string().optional(),
})

const completeSchema = z.object({
  summary: z.string().optional(),
  follow_up_recommended: z.boolean().optional(),
})

interface AppointmentRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  scheduled_at?: string | Date
  type?: string
  status?: string
}

function canRead(row: AppointmentRow | null, userId: string): boolean {
  if (!row) return false
  return row.patient_user_id === userId || row.provider_user_id === userId
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedForUser(userId)
    const asPatient = await findMany<AppointmentRow>('appointments', {
      where: [{ field: 'patient_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'scheduled_at', direction: 'desc' }],
    })
    const asProvider = await findMany<AppointmentRow>('appointments', {
      where: [{ field: 'provider_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'scheduled_at', direction: 'desc' }],
    })
    const merged = [...(asPatient as AppointmentRow[]), ...(asProvider as AppointmentRow[])]
    res.json(await decorateAppointments(merged))
  } catch (error) {
    logger.error('telemedicine appointments list:', error)
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
    const row = await findById<AppointmentRow>('appointments', id)
    if (!canRead(row, userId)) {
      return res.status(404).json({
        error: t('appointments.notFound', undefined, { defaultValue: 'Appointment not found.' }),
      })
    }
    const decorated = await decorateAppointments([row as AppointmentRow])
    res.json(decorated[0])
  } catch (error) {
    logger.error('telemedicine appointments get-by-id:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    // Resolve provider's user_id so dashboards/list endpoints that join
    // by provider_user_id can find appointments where the user is the
    // provider — without this, every booked appointment had a null
    // provider_user_id and never showed up in the provider's "as
    // provider" branch of the list query.
    const providerRow = await findById<{ user_id?: string }>('providers', body.provider_id)
    const providerUserId = providerRow?.user_id ?? null

    // Claim the availability slot BEFORE creating the appointment. The old code created the
    // appointment first and then best-effort flipped the slot, so two patients who both loaded the
    // same open slot both booked it (the 2nd UPDATE just matched 0 rows) — despite the comment
    // promising it "can't be double-booked". Flip the slot only while it's still open (an atomic
    // conditional UPDATE); if that flips nothing but a slot for this (provider, time) does exist,
    // it's already taken, so reject the double-book. A booking whose time matches no slot at all is
    // still allowed, as before. The booking page sends scheduled_at = slot.starts_at.
    const claim = await query<{ id: string }>(
      'UPDATE availability_slots SET is_booked = true WHERE provider_id = $1 AND starts_at = $2 AND is_booked = false RETURNING id',
      [body.provider_id, body.scheduled_at],
    )
    const slotClaimed = (claim.rowCount ?? claim.rows.length) > 0
    if (!slotClaimed) {
      const existing = await query<{ id: string }>(
        'SELECT id FROM availability_slots WHERE provider_id = $1 AND starts_at = $2 LIMIT 1',
        [body.provider_id, body.scheduled_at],
      )
      if ((existing.rowCount ?? existing.rows.length) > 0) {
        return res.status(409).json({
          error: t('appointment.slotTaken', undefined, {
            defaultValue: 'That time slot is no longer available. Please choose another time.',
          }),
        })
      }
    }

    const result = await create('appointments', {
      patient_user_id: userId,
      provider_user_id: providerUserId,
      provider_id: body.provider_id,
      scheduled_at: body.scheduled_at,
      duration_minutes: body.duration_minutes ?? 30,
      type: body.type,
      reason: body.reason ?? null,
      notes: body.notes ?? null,
      status: 'scheduled',
      created_at: new Date(),
    })

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('telemedicine appointments create:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<AppointmentRow>('appointments', id)
    if (!canRead(existing, userId)) {
      return res.status(404).json({
        error: t('appointments.notFound', undefined, { defaultValue: 'Appointment not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('appointments', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine appointments update:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/cancel', validateBody(cancelSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<AppointmentRow>('appointments', id)
    if (!canRead(existing, userId)) {
      return res.status(404).json({
        error: t('appointments.notFound', undefined, { defaultValue: 'Appointment not found.' }),
      })
    }
    const body = req.body as z.infer<typeof cancelSchema>
    const now = new Date()
    const result = await updateById('appointments', id, {
      status: 'cancelled',
      cancellation_reason: body.reason ?? null,
      cancelled_at: now,
      updatedAt: now,
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine appointments cancel:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/complete', validateBody(completeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<AppointmentRow>('appointments', id)
    if (!existing || !canRead(existing, userId)) {
      return res.status(404).json({
        error: t('appointments.notFound', undefined, { defaultValue: 'Appointment not found.' }),
      })
    }
    // Only a live appointment (scheduled / in progress) can be completed — mirror the client's
    // isLive gate server-side, so a cancelled / already-completed / no-show visit can't be
    // force-flipped to completed (which would surface a cancelled visit as completed in history).
    if (existing.status !== 'scheduled' && existing.status !== 'in_progress') {
      return res.status(409).json({
        error: t('appointments.notActive', undefined, {
          defaultValue: 'This appointment is not active.',
        }),
      })
    }
    const body = req.body as z.infer<typeof completeSchema>
    const now = new Date()
    const result = await updateById('appointments', id, {
      status: 'completed',
      summary: body.summary ?? null,
      follow_up_recommended: body.follow_up_recommended ?? false,
      completed_at: now,
      updatedAt: now,
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine appointments complete:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
