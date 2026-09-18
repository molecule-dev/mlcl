import { randomUUID } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { HrManagementLimits } from '../tiers.js'
import { buildLookups, decorateDocument, type RawDocument } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  kind: z.string().optional(),
  category: z.string().optional(),
  sort: z.string().optional().default('uploaded_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const createBodySchema = z.object({
  employee_id: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  // Accept either `title` (DB column) or `name` (frontend field name).
  title: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  // Accept `kind` (DB) or `type` (frontend field).
  kind: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional().nullable(),
  // s3_key is intentionally NOT accepted from the client. A client-chosen
  // storage key could address another tenant's object via any future
  // download/preview route (cross-tenant IDOR); it is minted server-side below.
  file_url: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  content_type: z.string().optional().nullable(),
  file_size: z.number().int().nonnegative().optional().nullable(),
  size_label: z.string().max(60).optional().nullable(),
  shared_with: z.string().max(200).optional().nullable(),
})

const updateBodySchema = createBodySchema.partial()

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const { employee_id, kind, category, sort, order } = parsed.data
  const where = [{ field: 'user_id', operator: '=' as const, value: userId }]
  if (employee_id) where.push({ field: 'employee_id', operator: '=' as const, value: employee_id })
  if (kind) where.push({ field: 'kind', operator: '=' as const, value: kind })
  if (category) where.push({ field: 'category', operator: '=' as const, value: category })
  const items = await findMany<RawDocument>('documents', {
    where,
    orderBy: [{ field: sort, direction: order }],
  })
  const lookups = await buildLookups(userId)
  res.json(items.map((d) => decorateDocument(d, { employee: lookups.employeeById })))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  if (!params.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: params.error.issues,
    })
  }
  const item = await findById<RawDocument>('documents', params.data.id)
  if (!item || item.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
  }
  const lookups = await buildLookups(userId)
  res.json(decorateDocument(item, { employee: lookups.employeeById }))
})

// Enforce the per-tier documents cap (tiers.ts maxDocuments) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceDocumentLimit = enforceLimit<HrManagementLimits>({
  limitType: 'maxDocuments',
  getLimit: (limits) => limits.maxDocuments,
  getCurrent: async (userId) =>
    count('documents', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceDocumentLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const parsed = createBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const body = parsed.data
  const title = body.title ?? body.name
  if (!title) {
    return res
      .status(400)
      .json({ error: t('document.titleRequired', {}, { defaultValue: 'Title is required.' }) })
  }
  const result = await create<RawDocument>('documents', {
    user_id: userId,
    employee_id: body.employee_id ?? null,
    title,
    kind: body.kind ?? body.type ?? 'pdf',
    category: body.category ?? 'Other',
    // Server-minted, owner-scoped key — never a client-supplied value.
    s3_key: `documents/${userId}/${randomUUID()}`,
    file_url: body.file_url ?? body.url ?? null,
    content_type: body.content_type ?? null,
    file_size: body.file_size ?? null,
    size_label: body.size_label ?? null,
    shared_with: body.shared_with ?? null,
    uploaded_by: userId,
    uploaded_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  })
  const raw = (result.data ?? result) as RawDocument
  const lookups = await buildLookups(userId)
  res.status(201).json(decorateDocument(raw, { employee: lookups.employeeById }))
})

async function updateHandler(req: Request, res: Response): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  const body = updateBodySchema.safeParse(req.body)
  if (!params.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: [
        ...(params.success ? [] : params.error.issues),
        ...(body.success ? [] : body.error.issues),
      ],
    })
    return
  }
  const existing = await findById<RawDocument>('documents', params.data.id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
    return
  }
  // Map the frontend field aliases (name/type/url) onto the DB columns
  // (title/kind/file_url) — same aliasing the create handler accepts.
  const data = body.data
  const patch: Record<string, unknown> = { ...data, updated_at: new Date() }
  delete patch.name
  delete patch.type
  delete patch.url
  const title = data.title ?? data.name
  if (title !== undefined) patch.title = title
  const kind = data.kind ?? data.type
  if (kind !== undefined) patch.kind = kind
  const fileUrl = data.file_url ?? data.url
  if (fileUrl !== undefined) patch.file_url = fileUrl
  const result = await updateById<RawDocument>('documents', params.data.id, patch)
  const raw = (result.data ?? result) as RawDocument
  const lookups = await buildLookups(userId)
  res.json(decorateDocument(raw, { employee: lookups.employeeById }))
}

router.put('/:id', updateHandler)
router.patch('/:id', updateHandler)

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const params = idParamSchema.safeParse({ id: getParamId(req) })
  if (!params.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: params.error.issues,
    })
  }
  const existing = await findById<RawDocument>('documents', params.data.id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
  }
  await deleteById('documents', params.data.id)
  res.status(204).end()
})

export default router
