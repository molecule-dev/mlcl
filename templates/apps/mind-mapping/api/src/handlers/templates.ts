/**
 * Map template handlers — system + user templates with `instantiate`
 * action that materialises a fresh map for the calling user from the
 * snapshot.
 *
 * System templates (`is_system = true`) are readable by every
 * authenticated user but never editable. User templates are owned by a
 * single user.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  internalError,
  type MapRow,
  type MapTemplateRow,
  requireReadableTemplate,
  requireUser,
  requireWritableTemplate,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  snapshot: z
    .object({
      nodes: z.array(z.unknown()).optional(),
      connections: z.array(z.unknown()).optional(),
    })
    .optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  snapshot: z
    .object({
      nodes: z.array(z.unknown()).optional(),
      connections: z.array(z.unknown()).optional(),
    })
    .optional(),
})

const instantiateSchema = z.object({
  title: z.string().max(255).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    // System templates union user-owned templates. We make two queries
    // because the DataStore `where` doesn't support OR.
    const [system, mine] = await Promise.all([
      findMany<MapTemplateRow>('map_templates', {
        where: [{ field: 'is_system', operator: '=', value: true }],
        orderBy: [{ field: 'name', direction: 'asc' }],
      }),
      findMany<MapTemplateRow>('map_templates', {
        where: [{ field: 'owner_id', operator: '=', value: ownerId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
    ])
    res.json([...system, ...mine])
  } catch (error) {
    logger.error('templates.list', error)
    internalError(res)
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
    logger.error('templates.get', error)
    internalError(res)
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
    const result = await create<MapTemplateRow>('map_templates', {
      owner_id: ownerId,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      snapshot: parsed.data.snapshot ?? { nodes: [], connections: [] },
      is_system: false,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('templates.create', error)
    internalError(res)
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
    const result = await updateById<MapTemplateRow>('map_templates', id.data.id, body.data)
    res.json(result.data)
  } catch (error) {
    logger.error('templates.patch', error)
    internalError(res)
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
    await deleteById('map_templates', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('templates.delete', error)
    internalError(res)
  }
})

router.post('/:id/instantiate', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = instantiateSchema.safeParse(req.body ?? {})
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
    // Create a fresh map owned by the caller, then materialise the
    // template's snapshot nodes/connections under the new map id.
    const newMap = await create<MapRow>('maps', {
      owner_id: ownerId,
      title: body.data.title ?? tpl.name,
      description: tpl.description,
      theme: 'default',
      root_node_id: null,
      is_template: false,
      is_public: false,
      public_slug: null,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (!newMap.data) {
      internalError(res)
      return
    }
    const snapshot = (
      typeof tpl.snapshot === 'string' ? JSON.parse(tpl.snapshot) : tpl.snapshot
    ) as { nodes?: SnapshotNode[]; connections?: SnapshotConn[] }

    // Re-id nodes so multiple instantiations don't collide on PK.
    const nodeIdMap = new Map<string, string>()
    for (const n of snapshot.nodes ?? []) {
      const newId = crypto.randomUUID()
      if (n.id) nodeIdMap.set(String(n.id), newId)
      await create('nodes', {
        id: newId,
        map_id: newMap.data.id,
        parent_id: n.parent_id ? (nodeIdMap.get(String(n.parent_id)) ?? null) : null,
        text: n.text ?? '',
        color: n.color ?? '#0079bf',
        shape: n.shape ?? 'round',
        size: n.size ?? 'm',
        x: n.x ?? 0,
        y: n.y ?? 0,
        position: n.position ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    for (const c of snapshot.connections ?? []) {
      const src = nodeIdMap.get(String(c.source_node_id))
      const tgt = nodeIdMap.get(String(c.target_node_id))
      if (!src || !tgt) continue
      await create('connections', {
        id: crypto.randomUUID(),
        map_id: newMap.data.id,
        source_node_id: src,
        target_node_id: tgt,
        label: c.label ?? null,
        style: c.style ?? {},
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    res.status(201).json(newMap.data)
  } catch (error) {
    logger.error('templates.instantiate', error)
    internalError(res)
  }
})

interface SnapshotNode {
  id?: string
  parent_id?: string | null
  text?: string
  color?: string
  shape?: string
  size?: string
  x?: number
  y?: number
  position?: number
}

interface SnapshotConn {
  source_node_id: string
  target_node_id: string
  label?: string | null
  style?: Record<string, unknown>
}

export default router
