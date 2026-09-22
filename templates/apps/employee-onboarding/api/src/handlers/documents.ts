import { randomUUID } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDefaultOnboardingIfMissing } from '../seedDefaultOnboarding.js'
import type { EmployeeOnboardingLimits } from '../tiers.js'

const router = Router()

const logger = getLogger()

const createDocumentSchema = z.object({
  onboarding_id: z.string().nullable().optional(),
  name: z.string().min(1),
  file_url: z.string().nullable().optional(),
  // s3_key is intentionally NOT accepted from the client. A client-chosen
  // storage key could address another tenant's object via any future
  // download/preview route (cross-tenant IDOR); it is minted server-side below.
  content_type: z.string().nullable().optional(),
  category: z.string().optional(),
  kind: z.enum(['read', 'sign', 'upload']).optional(),
  requires_signature: z.boolean().optional(),
})

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  kind: z.enum(['read', 'sign', 'upload']).optional(),
  signed: z.boolean().optional(),
  acknowledged_at: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    await seedDefaultOnboardingIfMissing(userId)

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (typeof req.query.onboarding_id === 'string') {
      where.push({ field: 'onboarding_id', operator: '=', value: req.query.onboarding_id })
    }

    const items = await findMany('onboarding_documents', {
      where,
      orderBy: [{ field: 'uploaded_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (_err) {
    logger.error('documents.list', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('onboarding_documents', id)
    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
    }
    res.json(item)
  } catch (_err) {
    logger.error('documents.read', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier documents cap (tiers.ts maxDocuments) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceDocumentLimit = enforceLimit<EmployeeOnboardingLimits>({
  limitType: 'maxDocuments',
  getLimit: (limits) => limits.maxDocuments,
  getCurrent: async (userId) =>
    count('onboarding_documents', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceDocumentLimit,
  validateBody(createDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createDocumentSchema>
      const result = await create('onboarding_documents', {
        user_id: userId,
        onboarding_id: body.onboarding_id ?? null,
        name: body.name,
        file_url: body.file_url ?? null,
        // Server-minted, owner-scoped key — never a client-supplied value.
        s3_key: `documents/${userId}/${randomUUID()}`,
        content_type: body.content_type ?? null,
        category: body.category ?? 'general',
        kind: body.kind ?? 'read',
        requires_signature: body.requires_signature ?? false,
        signed: false,
        uploaded_by: userId,
        uploaded_at: new Date(),
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (_err) {
      logger.error('documents.create', _err as Error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateDocumentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('onboarding_documents', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
    }

    const body = req.body as z.infer<typeof updateDocumentSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.category !== undefined) updates.category = body.category
    if (body.kind !== undefined) updates.kind = body.kind
    if (body.signed !== undefined) {
      updates.signed = body.signed
      if (body.signed) {
        updates.signed_at = new Date()
        updates.signed_by = userId
      }
    }
    if (body.acknowledged_at !== undefined) {
      updates.acknowledged_at = body.acknowledged_at ? new Date(body.acknowledged_at) : null
    }

    const result = await updateById('onboarding_documents', id, updates)
    res.json(result.data)
  } catch (_err) {
    logger.error('documents.update', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('onboarding_documents', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
    }
    await deleteById('onboarding_documents', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('documents.delete', _err as Error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
