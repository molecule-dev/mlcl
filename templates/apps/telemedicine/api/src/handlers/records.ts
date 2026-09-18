/**
 * Telemedicine — medical records handler.
 *
 * Records are owned by `patient_user_id`. Patient writes; providers read
 * only via active `record_shares` (deferred to MVP — providers see
 * records only via shares granted by the patient). The handler enforces
 * patient-owner scope on every read/write.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateRecords } from './_lib/decorate.js'
import { getParamId, getUserId } from './_lib/shared.js'
import { seedForUser } from './_seed.js'

const router = Router()

const ALLOWED_KINDS = ['lab', 'imaging', 'discharge', 'upload', 'note'] as const

const createSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(ALLOWED_KINDS).default('upload'),
  type: z.string().optional(),
  description: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  attachments: z.array(z.unknown()).optional(),
  occurred_on: z.string().optional(),
  record_date: z.string().optional(),
  // NOTE: `attachment_s3_key` is NOT accepted from the client. A client-chosen
  // object key defeats server-minted UUID keys — a future record download/
  // preview route streaming getFile(<client key>) would let one patient address
  // another patient's PHI object (cross-tenant read IDOR). The key must be
  // minted server-side when an upload-receipt flow is added; until then a
  // record carries no attachment key.
  consultation_id: z.string().optional(),
  source: z.string().optional(),
})

const updateSchema = createSchema.partial()

interface RecordRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_id?: string
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
    const records = await findMany<RecordRow>('medical_records', {
      where: [{ field: 'patient_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(await decorateRecords(records as RecordRow[]))
  } catch (error) {
    logger.error('telemedicine records list:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/types', async (_req: Request, res: Response) => {
  res.json([
    { id: 'lab', label: 'Lab' },
    { id: 'imaging', label: 'Imaging' },
    { id: 'discharge', label: 'Discharge' },
    { id: 'upload', label: 'Upload' },
    { id: 'note', label: 'Clinical note' },
  ])
})

router.get('/me/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const conditions = await findMany('medical_records', {
      where: [
        { field: 'patient_user_id', operator: '=', value: userId },
        { field: 'kind', operator: '=', value: 'note' },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({
      conditions: [],
      allergies: [],
      medications: [],
      recentVitals: conditions,
    })
  } catch (error) {
    logger.error('telemedicine records #1:', error)
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
    const row = await findById<RecordRow>('medical_records', id)
    if (!row || row.patient_user_id !== userId) {
      return res.status(404).json({
        error: t('records.notFound', undefined, { defaultValue: 'Record not found.' }),
      })
    }
    const decorated = await decorateRecords([row as RecordRow])
    res.json(decorated[0])
  } catch (error) {
    logger.error('telemedicine records #2:', error)
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
    const result = await create('medical_records', {
      patient_user_id: userId,
      title: body.title,
      kind: body.kind,
      type: body.type ?? body.kind,
      description: body.description ?? null,
      data: JSON.stringify(body.data ?? {}),
      attachments: JSON.stringify(body.attachments ?? []),
      occurred_on: body.occurred_on ?? null,
      record_date: body.record_date ?? null,
      // Storage key is never taken from the client (cross-tenant PHI read IDOR);
      // minted server-side only when an upload-receipt flow exists.
      attachment_s3_key: null,
      consultation_id: body.consultation_id ?? null,
      source: body.source ?? 'uploaded',
      created_at: new Date(),
    })
    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('telemedicine records #3:', error)
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
    const existing = await findById<RecordRow>('medical_records', id)
    if (!existing || existing.patient_user_id !== userId) {
      return res.status(404).json({
        error: t('records.notFound', undefined, { defaultValue: 'Record not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() }
    if (body.data !== undefined) updates.data = JSON.stringify(body.data)
    if (body.attachments !== undefined) updates.attachments = JSON.stringify(body.attachments)
    const result = await updateById('medical_records', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine records #4:', error)
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
    const existing = await findById<RecordRow>('medical_records', id)
    if (!existing || existing.patient_user_id !== userId) {
      return res.status(404).json({
        error: t('records.notFound', undefined, { defaultValue: 'Record not found.' }),
      })
    }
    await deleteById('medical_records', id)
    res.status(204).end()
  } catch (error) {
    logger.error('telemedicine records #5:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
