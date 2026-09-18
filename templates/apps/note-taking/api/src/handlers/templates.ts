/**
 * Page-template handlers — system templates (read-only) + user templates.
 *
 * System templates are workspace-less (`workspace_id IS NULL`,
 * `is_system = true`) and readable by every authenticated user. User
 * templates belong to a workspace owned by the user; only the owner may
 * read / patch / delete them.
 *
 * `POST /:id/instantiate` clones the template's snapshot into a new page
 * (and its blocks) inside a destination workspace the caller owns.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import {
  internalError,
  type PageRow,
  type PageTemplateRow,
  requireReadableTemplate,
  requireUser,
  requireWorkspace,
  requireWritableTemplate,
  validationError,
} from '../lib/authz.js'
import type { NoteTakingLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  category: z.string().max(64).optional(),
  include_system: z.string().optional(),
})

const createSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(64).optional(),
  icon: z.string().max(64).nullable().optional(),
  content: z
    .object({
      blocks: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(64).optional(),
  icon: z.string().max(64).nullable().optional(),
  content: z
    .object({
      blocks: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .optional(),
})

const instantiateSchema = z.object({
  workspace_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  title: z.string().max(1000).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    // Templates visible to a user = system templates + the user's own
    // workspace templates. We run two separate findMany calls and merge
    // (the abstract DataStore doesn't ship an OR operator, so a single
    // query would require provider-specific SQL).
    const merged: PageTemplateRow[] = []

    if (parsed.data.workspace_id) {
      const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
      if (ws) {
        const userWhere: WhereCondition[] = [
          { field: 'workspace_id', operator: '=', value: parsed.data.workspace_id },
        ]
        if (parsed.data.category) {
          userWhere.push({ field: 'category', operator: '=', value: parsed.data.category })
        }
        merged.push(
          ...(await findMany<PageTemplateRow>('page_templates', {
            where: userWhere,
            orderBy: [{ field: 'name', direction: 'asc' }],
          })),
        )
      }
    }

    if (parsed.data.include_system !== 'false') {
      const sysWhere: WhereCondition[] = [{ field: 'is_system', operator: '=', value: true }]
      if (parsed.data.category) {
        sysWhere.push({ field: 'category', operator: '=', value: parsed.data.category })
      }
      merged.push(
        ...(await findMany<PageTemplateRow>('page_templates', {
          where: sysWhere,
          orderBy: [{ field: 'name', direction: 'asc' }],
        })),
      )
    }

    res.json(merged)
  } catch (error) {
    internalError(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const tpl = await requireReadableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    res.json(tpl)
  } catch (error) {
    internalError(res, error)
  }
})

// Enforce the per-tier template cap (tiers.ts maxTemplates) — defined + shown on Pricing but
// enforceLimit was never called anywhere. Counts only the user's own templates (is_system=false);
// shared system templates are not owned by any user.
const enforceTemplateLimit = enforceLimit<NoteTakingLimits>({
  limitType: 'maxTemplates',
  getLimit: (limits) => limits.maxTemplates,
  getCurrent: async (userId) =>
    count('page_templates', [
      { field: 'created_by', operator: '=', value: userId },
      { field: 'is_system', operator: '=', value: false },
    ]),
}) as unknown as RequestHandler

router.post('/', enforceTemplateLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    const result = await create<PageTemplateRow>('page_templates', {
      workspace_id: ws.id,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      category: parsed.data.category ?? 'custom',
      icon: parsed.data.icon ?? null,
      content: parsed.data.content ?? { blocks: [] },
      is_system: false,
      created_by: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const tpl = await requireWritableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const result = await updateById<PageTemplateRow>('page_templates', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const tpl = await requireWritableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    await deleteById('page_templates', id.data.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/:id/instantiate', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = instantiateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const tpl = await requireReadableTemplate(id.data.id, ownerId)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const ws = await requireWorkspace(body.data.workspace_id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    const pageResult = await create<PageRow>('pages', {
      workspace_id: ws.id,
      parent_id: body.data.parent_id ?? null,
      template_id: tpl.id,
      title: body.data.title ?? tpl.name,
      icon: tpl.icon,
      cover_image: null,
      position: 0,
      is_favorited: false,
      is_template: false,
      trashed_at: null,
      created_by: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const page = pageResult.data
    if (page) {
      const blocks = tpl.content?.blocks ?? []
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]
        await create('blocks', {
          page_id: page.id,
          type: typeof b.type === 'string' ? b.type : 'paragraph',
          content: typeof b.content === 'object' && b.content !== null ? b.content : {},
          properties: typeof b.properties === 'object' && b.properties !== null ? b.properties : {},
          parent_block_id: null,
          position: i,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
    res.status(201).json(page)
  } catch (error) {
    internalError(res, error)
  }
})

export default router
