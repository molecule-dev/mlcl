/**
 * /api/templates — CRUD over the `contract_templates` table.
 *
 * GET enriches each row with `used_count` (number of contracts that
 * were generated_from_template_id) so the Templates grid can render
 * the "Used N×" badge without an N+1.
 *
 * The DB stores `category` (free-form text). The Templates UI groups
 * by a known set of categories — anything else falls back to "other".
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireUserOwnership } from '../lib/authz.js'
import { sanitizeHtml } from '../lib/sanitize-html.js'
import type { ContractManagementLimits } from '../tiers.js'

const router = Router()

const KNOWN_CATEGORIES = new Set(['msa', 'sow', 'nda', 'order', 'employment'])

const createTemplateSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(10_000).nullable().optional(),
  content: z.string().max(1_000_000).optional().default(''),
  body_html: z.string().max(1_000_000).optional().default(''),
  category: z.string().max(64).nullable().optional(),
  type: z.string().max(64).optional(),
  merge_fields: z.array(z.unknown()).optional(),
})

const updateTemplateSchema = createTemplateSchema.partial().extend({
  bumpVersion: z.boolean().optional(),
})

interface TemplateRow {
  id: string
  user_id: string
  name: string
  description: string | null
  content: string
  body_html: string
  category: string | null
  type: string
  merge_fields: unknown[]
  version: number
  archived_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
}

interface ContractRow {
  id: string
  template_id: string | null
}

function shape(
  row: TemplateRow,
  usedCount: number,
): {
  id: string
  name: string
  description: string
  content: string
  body_html: string
  category: string
  type: string
  merge_fields: unknown[]
  version: string
  used_count: number
  archived_at: string | null
  created_at: string
  updated_at: string
} {
  const cat = row.category && KNOWN_CATEGORIES.has(row.category) ? row.category : 'other'
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    content: row.content,
    body_html: row.body_html,
    category: cat,
    type: row.type,
    merge_fields: Array.isArray(row.merge_fields) ? row.merge_fields : [],
    version: String(row.version ?? 1),
    used_count: usedCount,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }
}

router.use(authorizers.auth())

router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const [items, contracts] = await Promise.all([
    findMany<TemplateRow>('contract_templates', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    }),
    findMany<ContractRow>('contracts', { where, limit: 10_000 }),
  ])
  const usage = new Map<string, number>()
  for (const c of contracts) {
    if (c.template_id) usage.set(c.template_id, (usage.get(c.template_id) ?? 0) + 1)
  }
  res.json(items.map((r) => shape(r, usage.get(r.id) ?? 0)))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<TemplateRow>(
    'contract_templates',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
    return
  }
  const row = check.row
  const used = await count('contracts', [{ field: 'template_id', operator: '=', value: row.id }])
  res.json(shape(row, used))
})

router.post(
  '/',
  enforceLimit<ContractManagementLimits>({
    limitType: 'maxTemplates',
    getLimit: (limits) => limits.maxTemplates,
    getCurrent: async (userId) =>
      count('contract_templates', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTemplateSchema),
  async (req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createTemplateSchema>
    const now = new Date().toISOString()
    const result = await create<TemplateRow>('contract_templates', {
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      content: body.content ?? '',
      // Sanitize client HTML at the trust boundary; template body_html is
      // copied into contracts and rendered via dangerouslySetInnerHTML.
      body_html: sanitizeHtml(body.body_html ?? ''),
      category: body.category ?? null,
      type: body.type ?? 'msa',
      merge_fields: body.merge_fields ?? [],
      version: 1,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    const created = (result.data ?? result) as TemplateRow
    res.status(201).json(shape(created, 0))
  },
)

router.patch('/:id', validateBody(updateTemplateSchema), async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<TemplateRow>(
    'contract_templates',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
    return
  }
  const row = check.row
  const body = req.body as z.infer<typeof updateTemplateSchema>
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.content !== undefined) updates.content = body.content
  if (body.body_html !== undefined) updates.body_html = sanitizeHtml(body.body_html)
  if (body.category !== undefined) updates.category = body.category
  if (body.type !== undefined) updates.type = body.type
  if (body.merge_fields !== undefined) updates.merge_fields = body.merge_fields
  if (body.bumpVersion) updates.version = (row.version ?? 1) + 1
  const result = await updateById<TemplateRow>(
    'contract_templates',
    req.params.id as string,
    updates,
  )
  const updated = (result.data ?? result) as TemplateRow
  const used = await count('contracts', [{ field: 'template_id', operator: '=', value: row.id }])
  res.json(shape(updated, used))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<TemplateRow>(
    'contract_templates',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
    return
  }
  await deleteById('contract_templates', req.params.id as string)
  res.status(204).end()
})

export default router
