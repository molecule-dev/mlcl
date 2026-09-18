/**
 * Telemedicine — prescriptions handler.
 *
 * Provider writes (only their own); patient reads (only their own).
 * Both branches enforced via `provider_user_id` / `patient_user_id` on the
 * row (see G6 — no IDOR).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { decoratePrescriptions } from './_lib/decorate.js'
import { getParamId, getUserId } from './_lib/shared.js'
import { seedForUser } from './_seed.js'

const router = Router()

const ALLOWED_STATUSES = [
  'active',
  'cancelled',
  'expired',
  'sent_to_pharmacy',
  'discontinued',
  'pending_pharmacy',
  'filled',
] as const

const createSchema = z.object({
  patient_user_id: z.string().min(1),
  provider_id: z.string().min(1),
  drug_name: z.string().min(1),
  medication_name: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  refills: z.number().int().min(0).optional(),
  refills_allowed: z.number().int().min(0).optional(),
  pharmacy_id: z.string().optional(),
  consultation_id: z.string().optional(),
})

const updateSchema = z.object({
  drug_name: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  refills: z.number().int().min(0).optional(),
  refills_allowed: z.number().int().min(0).optional(),
  pharmacy_id: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
})

const discontinueSchema = z.object({
  reason: z.string().optional(),
})

interface PrescriptionRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  refills_allowed?: number
  refills_used?: number
}

function canRead(row: PrescriptionRow | null, userId: string): boolean {
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
    const asPatient = await findMany<PrescriptionRow>('prescriptions', {
      where: [{ field: 'patient_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'prescribed_at', direction: 'desc' }],
    })
    const asProvider = await findMany<PrescriptionRow>('prescriptions', {
      where: [{ field: 'provider_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'prescribed_at', direction: 'desc' }],
    })
    const merged = [...(asPatient as PrescriptionRow[]), ...(asProvider as PrescriptionRow[])]
    res.json(await decoratePrescriptions(merged))
  } catch (error) {
    logger.error('telemedicine prescriptions list:', error)
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
    const row = await findById<PrescriptionRow>('prescriptions', id)
    if (!canRead(row, userId)) {
      return res.status(404).json({
        error: t('prescriptions.notFound', undefined, { defaultValue: 'Prescription not found.' }),
      })
    }
    const decorated = await decoratePrescriptions([row as PrescriptionRow])
    res.json(decorated[0])
  } catch (error) {
    logger.error('telemedicine prescriptions get-by-id:', error)
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
    // SECURITY: only a provider may write a prescription, and only into the
    // record of a patient they actually have a relationship with. NEVER trust
    // the client's patient/provider ids — confirm the session user is a
    // provider AND has an existing appointment/consultation with the target
    // patient before injecting into that patient's medical record.
    const providerRows = await findMany<{ id: string; user_id?: string }>('providers', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const providerRow = (providerRows as { id: string; user_id?: string }[])[0]
    if (!providerRow) {
      return res.status(403).json({
        error: t('prescriptions.forbidden', undefined, {
          defaultValue: 'Only a provider with a relationship to this patient can prescribe.',
        }),
      })
    }
    const relatedAppointments = await findMany('appointments', {
      where: [
        { field: 'provider_user_id', operator: '=', value: userId },
        { field: 'patient_user_id', operator: '=', value: body.patient_user_id },
      ],
    })
    const relatedConsultations = await findMany('consultations', {
      where: [
        { field: 'provider_user_id', operator: '=', value: userId },
        { field: 'patient_user_id', operator: '=', value: body.patient_user_id },
      ],
    })
    if (
      (relatedAppointments as unknown[]).length === 0 &&
      (relatedConsultations as unknown[]).length === 0
    ) {
      return res.status(403).json({
        error: t('prescriptions.forbidden', undefined, {
          defaultValue: 'Only a provider with a relationship to this patient can prescribe.',
        }),
      })
    }
    const result = await create('prescriptions', {
      provider_user_id: userId,
      provider_id: providerRow.id,
      patient_user_id: body.patient_user_id,
      drug_name: body.drug_name,
      medication_name: body.medication_name ?? body.drug_name,
      dosage: body.dosage ?? null,
      frequency: body.frequency ?? null,
      duration: body.duration ?? null,
      instructions: body.instructions ?? null,
      refills: body.refills ?? 0,
      refills_allowed: body.refills_allowed ?? body.refills ?? 0,
      refills_used: 0,
      pharmacy_id: body.pharmacy_id ?? null,
      consultation_id: body.consultation_id ?? null,
      status: 'active',
      prescribed_at: new Date(),
      created_at: new Date(),
    })
    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('telemedicine prescriptions create:', error)
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
    const existing = await findById<PrescriptionRow>('prescriptions', id)
    if (!existing || existing.provider_user_id !== userId) {
      return res.status(404).json({
        error: t('prescriptions.notFound', undefined, { defaultValue: 'Prescription not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('prescriptions', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine prescriptions update:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/refill', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<PrescriptionRow>('prescriptions', id)
    if (!canRead(existing, userId)) {
      return res.status(404).json({
        error: t('prescriptions.notFound', undefined, { defaultValue: 'Prescription not found.' }),
      })
    }
    const used = existing?.refills_used ?? 0
    const allowed = existing?.refills_allowed ?? 0
    if (used >= allowed) {
      return res.status(400).json({
        error: t('prescriptions.noRefills', undefined, { defaultValue: 'No refills remaining.' }),
      })
    }
    const result = await updateById('prescriptions', id, {
      refills_used: used + 1,
      last_refill_at: new Date(),
      updatedAt: new Date(),
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine prescriptions refill:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post(
  '/:id/discontinue',
  validateBody(discontinueSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }
      const id = getParamId(req)
      const existing = await findById<PrescriptionRow>('prescriptions', id)
      if (!existing || existing.provider_user_id !== userId) {
        return res.status(404).json({
          error: t('prescriptions.notFound', undefined, {
            defaultValue: 'Prescription not found.',
          }),
        })
      }
      const body = req.body as z.infer<typeof discontinueSchema>
      const now = new Date()
      const result = await updateById('prescriptions', id, {
        status: 'discontinued',
        discontinue_reason: body.reason ?? null,
        discontinued_at: now,
        updatedAt: now,
      })
      res.json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('telemedicine prescriptions discontinue:', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

export default router
