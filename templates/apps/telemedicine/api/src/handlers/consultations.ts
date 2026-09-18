/**
 * Telemedicine — consultations handler.
 *
 * A consultation row carries both `patient_user_id` and `provider_user_id`.
 * Both parties can read; only the provider may write SOAP notes / sign the
 * encounter (status changes). Patients can only read after
 * `encounter_signed_at` per INVENTORY authz rules — we enforce this on
 * read of the SOAP fields by overlaying `null` when patient && unsigned.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { getParamId, getUserId } from './_lib/shared.js'

const router = Router()

const createSchema = z.object({
  appointment_id: z.string().min(1),
  provider_id: z.string().min(1),
  provider_user_id: z.string().optional(),
  patient_user_id: z.string().optional(),
  room_provider: z.string().optional(),
})

const endSchema = z.object({
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
  follow_up: z.string().optional(),
  chief_complaint: z.string().optional(),
  hpi: z.string().optional(),
  ros: z.string().optional(),
  exam: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  sign: z.boolean().optional(),
})

const messageSchema = z.object({
  body: z.string().min(1),
  type: z.string().optional(),
  attachments: z.array(z.unknown()).optional(),
})

interface ConsultationRow extends Record<string, unknown> {
  patient_user_id?: string
  provider_user_id?: string | null
  encounter_signed_at?: string | Date | null
}

function canRead(row: ConsultationRow | null, userId: string): boolean {
  if (!row) return false
  return row.patient_user_id === userId || row.provider_user_id === userId
}

function isProvider(row: ConsultationRow | null, userId: string): boolean {
  return !!row && row.provider_user_id === userId
}

/**
 * SOAP / clinical-note fields the provider authors on `end`. A patient may not
 * read them until the encounter is signed (see the authz contract in the module
 * doc); until then the provider's draft must not cross the wire.
 */
const SOAP_FIELDS = [
  'notes',
  'diagnosis',
  'follow_up',
  'chief_complaint',
  'hpi',
  'ros',
  'exam',
  'assessment',
  'plan',
] as const

/**
 * Overlay the SOAP fields with `null` when the reader is the patient (not the
 * provider) and the encounter is unsigned. Providers always see their own
 * draft; a signed encounter is visible to both parties.
 */
function redactForReader(row: ConsultationRow, userId: string): ConsultationRow {
  if (isProvider(row, userId) || row.encounter_signed_at) return row
  const redacted: ConsultationRow = { ...row }
  for (const field of SOAP_FIELDS) redacted[field] = null
  return redacted
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const asPatient = await findMany('consultations', {
      where: [{ field: 'patient_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'started_at', direction: 'desc' }],
    })
    const asProvider = await findMany('consultations', {
      where: [{ field: 'provider_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'started_at', direction: 'desc' }],
    })
    const rows = [...(asPatient as unknown[]), ...(asProvider as unknown[])] as ConsultationRow[]
    res.json(rows.map((row) => redactForReader(row, userId)))
  } catch (error) {
    logger.error('telemedicine consultations #1:', error)
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
    const row = await findById<ConsultationRow>('consultations', id)
    if (!row || !canRead(row, userId)) {
      return res.status(404).json({
        error: t('consultation.notFound', undefined, { defaultValue: 'Consultation not found.' }),
      })
    }
    res.json(redactForReader(row, userId))
  } catch (error) {
    logger.error('telemedicine consultations #2:', error)
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
    // SECURITY: derive both parties from the referenced appointment — NEVER
    // trust client-supplied patient/provider ids (a patient could otherwise
    // fabricate a consultation targeting an arbitrary patient). The session
    // user must already be a participant of that appointment, and any
    // client-supplied ids that disagree with it are rejected.
    const appointment = await findById<{
      patient_user_id?: string
      provider_user_id?: string | null
      provider_id?: string
    }>('appointments', body.appointment_id)
    if (
      !appointment ||
      (appointment.patient_user_id !== userId && appointment.provider_user_id !== userId)
    ) {
      return res.status(403).json({
        error: t('consultation.forbidden', undefined, {
          defaultValue: 'You are not a participant of this appointment.',
        }),
      })
    }
    const patientUserId = appointment.patient_user_id ?? null
    const providerUserId = appointment.provider_user_id ?? null
    const providerId = appointment.provider_id ?? body.provider_id
    if (
      (body.patient_user_id && body.patient_user_id !== patientUserId) ||
      (body.provider_user_id && body.provider_user_id !== providerUserId) ||
      (body.provider_id && providerId && body.provider_id !== providerId)
    ) {
      return res.status(403).json({
        error: t('consultation.forbidden', undefined, {
          defaultValue: 'You are not a participant of this appointment.',
        }),
      })
    }
    const result = await create('consultations', {
      appointment_id: body.appointment_id,
      provider_id: providerId,
      provider_user_id: providerUserId,
      patient_user_id: patientUserId,
      status: 'waiting',
      started_at: new Date(),
      created_at: new Date(),
    })
    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('telemedicine consultations #3:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<ConsultationRow>('consultations', id)
    if (!canRead(existing, userId)) {
      return res.status(404).json({
        error: t('consultation.notFound', undefined, { defaultValue: 'Consultation not found.' }),
      })
    }
    const result = await updateById('consultations', id, {
      status: 'in_progress',
      updatedAt: new Date(),
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine consultations #4:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/end', validateBody(endSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<ConsultationRow>('consultations', id)
    if (!isProvider(existing, userId)) {
      return res.status(404).json({
        error: t('consultation.notFound', undefined, { defaultValue: 'Consultation not found.' }),
      })
    }
    const body = req.body as z.infer<typeof endSchema>
    const now = new Date()
    const result = await updateById('consultations', id, {
      status: 'completed',
      notes: body.notes ?? null,
      diagnosis: body.diagnosis ?? null,
      follow_up: body.follow_up ?? null,
      chief_complaint: body.chief_complaint ?? null,
      hpi: body.hpi ?? null,
      ros: body.ros ?? null,
      exam: body.exam ?? null,
      assessment: body.assessment ?? null,
      plan: body.plan ?? null,
      ended_at: now,
      encounter_signed_at: body.sign ? now : null,
      updatedAt: now,
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine consultations #5:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const consultation = await findById<ConsultationRow>('consultations', id)
    if (!canRead(consultation, userId)) {
      return res.status(404).json({
        error: t('consultation.notFound', undefined, { defaultValue: 'Consultation not found.' }),
      })
    }
    const messages = await findMany('consultation_messages', {
      where: [{ field: 'consultation_id', operator: '=', value: id }],
      orderBy: [{ field: 'sent_at', direction: 'asc' }],
    })
    res.json(messages)
  } catch (error) {
    logger.error('telemedicine consultations #6:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/messages', validateBody(messageSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const consultation = await findById<ConsultationRow>('consultations', id)
    if (!canRead(consultation, userId)) {
      return res.status(404).json({
        error: t('consultation.notFound', undefined, { defaultValue: 'Consultation not found.' }),
      })
    }
    const body = req.body as z.infer<typeof messageSchema>
    const role = consultation && consultation.provider_user_id === userId ? 'provider' : 'patient'
    const result = await create('consultation_messages', {
      consultation_id: id,
      sender_user_id: userId,
      sender_role: role,
      body: body.body,
      type: body.type ?? 'text',
      attachments: JSON.stringify(body.attachments ?? []),
      sent_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine consultations #7:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
