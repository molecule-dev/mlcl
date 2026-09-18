import { randomUUID } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { HealthRecordsLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const ALLOWED_KINDS = [
  'lab_pdf',
  'discharge',
  'imaging',
  'prescription',
  'consent',
  'insurance',
  'referral',
  'other',
] as const
const ALLOWED_CATEGORIES = [
  'lab_report',
  'imaging',
  'discharge_summary',
  'referral',
  'insurance',
  'consent',
  'prescription',
  'other',
] as const

const createSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(ALLOWED_KINDS).optional(),
  category: z.enum(ALLOWED_CATEGORIES).default('other'),
  // s3_key is intentionally NOT accepted from the client. A client-chosen
  // storage key could address another tenant's object via any future
  // download/preview route (cross-tenant IDOR); it is minted server-side below.
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  file_size: z.number().int().nonnegative().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  content_type: z.string().optional(),
  mime_type: z.string().optional(),
  encryption_iv: z.string().optional(),
  sha256: z.string().optional(),
  related_record_id: z.string().uuid().optional(),
  provider_name: z.string().optional(),
  document_date: z.string().optional(),
  notes: z.string().optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  kind: z.enum(ALLOWED_KINDS).optional(),
  category: z.enum(ALLOWED_CATEGORIES).optional(),
  provider_name: z.string().optional().nullable(),
  document_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  related_record_id: z.string().uuid().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)
    const docs = await findMany('medical_documents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'uploaded_at', direction: 'desc' }],
    })
    res.json(docs)
  } catch (error) {
    logger.error('documents.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/categories', (_req: Request, res: Response) => {
  res.json([
    { id: 'lab_report', label: 'Lab Report' },
    { id: 'imaging', label: 'Imaging / Radiology' },
    { id: 'discharge_summary', label: 'Discharge Summary' },
    { id: 'referral', label: 'Referral Letter' },
    { id: 'insurance', label: 'Insurance Document' },
    { id: 'consent', label: 'Consent Form' },
    { id: 'prescription', label: 'Prescription' },
    { id: 'other', label: 'Other' },
  ])
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
    const row = await findById<Record<string, unknown>>('medical_documents', id)
    if (!row || row.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }
    res.json(row)
  } catch (error) {
    logger.error('documents.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Enforce the per-tier documents cap (tiers.ts maxDocuments) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceDocumentLimit = enforceLimit<HealthRecordsLimits>({
  limitType: 'maxDocuments',
  getLimit: (limits) => limits.maxDocuments,
  getCurrent: async (userId) =>
    count('medical_documents', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceDocumentLimit,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }
      const body = req.body as z.infer<typeof createSchema>
      const result = await create('medical_documents', {
        user_id: userId,
        title: body.title,
        kind: body.kind ?? null,
        category: body.category,
        // Server-minted, owner-scoped key — never a client-supplied value.
        s3_key: `documents/${userId}/${randomUUID()}`,
        file_url: body.file_url ?? null,
        file_name: body.file_name ?? body.title,
        file_size: body.file_size ?? body.size_bytes ?? null,
        size_bytes: body.size_bytes ?? body.file_size ?? null,
        content_type: body.content_type ?? body.mime_type ?? null,
        mime_type: body.mime_type ?? body.content_type ?? null,
        encryption_iv: body.encryption_iv ?? null,
        sha256: body.sha256 ?? null,
        related_record_id: body.related_record_id ?? null,
        provider_name: body.provider_name ?? null,
        document_date: body.document_date ?? null,
        notes: body.notes ?? null,
        uploaded_at: new Date(),
        created_at: new Date(),
      })
      res.status(201).json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('documents.handler', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('medical_documents', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('medical_documents', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('documents.handler', error)
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
    const existing = await findById<Record<string, unknown>>('medical_documents', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }
    await deleteById('medical_documents', id)
    res.status(204).end()
  } catch (error) {
    logger.error('documents.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
