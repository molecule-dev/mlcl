/**
 * Block handlers — typed content blocks within a page.
 *
 * Authorization: every block lives inside a page that lives inside a
 * workspace owned by `session.userId`. `requireBlock` walks the chain.
 *
 * Reorder + bulk-edit: `PUT /blocks/batch` accepts an array of partial
 * block updates so the editor can persist drag-reorders + multi-select
 * edits in one round-trip.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  type BlockRow,
  internalError,
  requireBlock,
  requirePage,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  page_id: z.string().uuid(),
})

const blockTypeSchema = z.enum([
  'paragraph',
  'text',
  'heading_1',
  'heading_2',
  'heading_3',
  'bullet_list',
  'numbered_list',
  'todo',
  'code',
  'image',
  'embed',
  'table',
  'divider',
  'quote',
  'callout',
  'database_view',
])

const createSchema = z.object({
  page_id: z.string().uuid(),
  type: blockTypeSchema.optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  parent_block_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
})

const updateSchema = z.object({
  type: blockTypeSchema.optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  parent_block_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
})

const convertSchema = z.object({
  type: blockTypeSchema,
})

const batchSchema = z.object({
  blocks: z
    .array(
      z
        .object({
          id: z.string().uuid(),
          type: blockTypeSchema.optional(),
          content: z.record(z.string(), z.unknown()).optional(),
          properties: z.record(z.string(), z.unknown()).optional(),
          parent_block_id: z.string().uuid().nullable().optional(),
          position: z.number().optional(),
        })
        .refine((v) => Object.keys(v).length > 1, {
          message: 'Must include at least one field to update besides id',
        }),
    )
    .min(1)
    .max(500),
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
    const page = await requirePage(parsed.data.page_id, ownerId)
    if (!page) {
      res.json([])
      return
    }
    const items = await findMany<BlockRow>('blocks', {
      where: [{ field: 'page_id', operator: '=', value: page.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.put('/batch', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = batchSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const updated: BlockRow[] = []
    // Cache page-ownership decisions so a 50-block batch doesn't hit
    // requireBlock 50 times.
    const ownedPageCache = new Map<string, boolean>()
    for (const item of parsed.data.blocks) {
      const block = await requireBlock(item.id, ownerId)
      if (!block) continue
      ownedPageCache.set(block.page_id, true)
      const { id, ...patch } = item
      const result = await updateById<BlockRow>('blocks', id, {
        ...patch,
        updated_at: new Date(),
      })
      if (result.data) updated.push(result.data)
    }
    // Refresh updated_at on each touched page.
    for (const pageId of ownedPageCache.keys()) {
      await updateById('pages', pageId, { updated_at: new Date() })
    }
    res.json(updated)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const page = await requirePage(parsed.data.page_id, ownerId)
    if (!page) {
      res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
      return
    }
    if (parsed.data.parent_block_id) {
      const parentBlock = await requireBlock(parsed.data.parent_block_id, ownerId)
      if (!parentBlock || parentBlock.page_id !== page.id) {
        res
          .status(404)
          .json({ error: t('block.notFound', {}, { defaultValue: 'Block not found' }) })
        return
      }
    }
    const position = parsed.data.position ?? (await getNextPosition(page.id))
    const result = await create<BlockRow>('blocks', {
      page_id: page.id,
      parent_block_id: parsed.data.parent_block_id ?? null,
      type: parsed.data.type ?? 'paragraph',
      content: parsed.data.content ?? {},
      properties: parsed.data.properties ?? {},
      position,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await updateById('pages', page.id, { updated_at: new Date() })
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
    const block = await requireBlock(id.data.id, ownerId)
    if (!block) {
      res.status(404).json({ error: t('block.notFound', {}, { defaultValue: 'Block not found' }) })
      return
    }
    const result = await updateById<BlockRow>('blocks', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/:id/convert', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = convertSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const block = await requireBlock(id.data.id, ownerId)
    if (!block) {
      res.status(404).json({ error: t('block.notFound', {}, { defaultValue: 'Block not found' }) })
      return
    }
    const result = await updateById<BlockRow>('blocks', id.data.id, {
      type: body.data.type,
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
    const block = await requireBlock(id.data.id, ownerId)
    if (!block) {
      res.status(404).json({ error: t('block.notFound', {}, { defaultValue: 'Block not found' }) })
      return
    }
    await deleteById('blocks', id.data.id)
    await updateById('pages', block.page_id, { updated_at: new Date() })
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

async function getNextPosition(pageId: string): Promise<number> {
  const where: WhereCondition[] = [{ field: 'page_id', operator: '=', value: pageId }]
  const siblings = await findMany<BlockRow>('blocks', {
    where,
    orderBy: [{ field: 'position', direction: 'desc' }],
    limit: 1,
  })
  return siblings.length > 0 ? siblings[0].position + 1 : 0
}

export default router
