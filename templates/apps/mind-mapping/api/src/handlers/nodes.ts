/**
 * Node handlers — owner/editor-scoped CRUD over `nodes`.
 *
 * Nodes form a self-FK tree per map (parent_id self-FK). Authorization
 * walks back to the parent map via `requireWritableMap`. Recursive child
 * deletion + connection cleanup happens in app code (CASCADE handles the
 * raw row delete; we walk children explicitly for the broadcast event).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import {
  internalError,
  type NodeRow,
  requireUser,
  requireWritableMap,
  requireWritableNode,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  map_id: z.string().uuid(),
})

const createSchema = z.object({
  map_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  text: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
  shape: z.enum(['rect', 'round', 'cloud']).optional(),
  size: z.enum(['s', 'm', 'l']).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  position: z.number().optional(),
})

const updateSchema = z.object({
  text: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
  shape: z.enum(['rect', 'round', 'cloud']).optional(),
  size: z.enum(['s', 'm', 'l']).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  position: z.number().optional(),
  parent_id: z.string().uuid().nullable().optional(),
})

const batchUpdateSchema = z.object({
  map_id: z.string().uuid(),
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        x: z.number().optional(),
        y: z.number().optional(),
        position: z.number().optional(),
      }),
    )
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
    const map = await requireWritableMap(parsed.data.map_id, ownerId)
    if (!map) {
      // Don't leak existence — empty list.
      res.json([])
      return
    }
    const items = await findMany<NodeRow>('nodes', {
      where: [{ field: 'map_id', operator: '=', value: parsed.data.map_id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('nodes.list', error)
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
    const map = await requireWritableMap(parsed.data.map_id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    if (parsed.data.parent_id) {
      const parent = await findOne<NodeRow>('nodes', [
        { field: 'id', operator: '=', value: parsed.data.parent_id },
        { field: 'map_id', operator: '=', value: parsed.data.map_id },
      ])
      if (!parent) {
        res.status(404).json({ error: t('node.notFound', {}, { defaultValue: 'Node not found' }) })
        return
      }
    }
    const result = await create<NodeRow>('nodes', {
      map_id: parsed.data.map_id,
      parent_id: parsed.data.parent_id ?? null,
      text: parsed.data.text ?? '',
      color: parsed.data.color ?? '#0079bf',
      shape: parsed.data.shape ?? 'round',
      size: parsed.data.size ?? 'm',
      x: parsed.data.x ?? 0,
      y: parsed.data.y ?? 0,
      position: parsed.data.position ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    safeBroadcast(`map:${parsed.data.map_id}`, 'node:created', result.data)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('nodes.create', error)
    internalError(res)
  }
})

router.post('/batch-update', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = batchUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const map = await requireWritableMap(parsed.data.map_id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    const results: NodeRow[] = []
    for (const item of parsed.data.updates) {
      // Re-verify each node's map matches (defence-in-depth: a malicious
      // payload could mix in node ids from another map).
      const node = await findOne<NodeRow>('nodes', [
        { field: 'id', operator: '=', value: item.id },
        { field: 'map_id', operator: '=', value: parsed.data.map_id },
      ])
      if (!node) continue
      const patch: Record<string, unknown> = { updated_at: new Date() }
      if (item.x !== undefined) patch.x = item.x
      if (item.y !== undefined) patch.y = item.y
      if (item.position !== undefined) patch.position = item.position
      const updated = await updateById<NodeRow>('nodes', item.id, patch)
      if (updated.data) results.push(updated.data)
    }
    safeBroadcast(`map:${parsed.data.map_id}`, 'nodes:batch-updated', { updates: results })
    res.json(results)
  } catch (error) {
    logger.error('nodes.batchUpdate', error)
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
    const node = await requireWritableNode(id.data.id, ownerId)
    if (!node) {
      res.status(404).json({ error: t('node.notFound', {}, { defaultValue: 'Node not found' }) })
      return
    }
    res.json(node)
  } catch (error) {
    logger.error('nodes.get', error)
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
    const node = await requireWritableNode(id.data.id, ownerId)
    if (!node) {
      res.status(404).json({ error: t('node.notFound', {}, { defaultValue: 'Node not found' }) })
      return
    }
    if (body.data.parent_id) {
      // Cycle guard + same-map enforcement.
      if (body.data.parent_id === node.id) {
        res.status(400).json({
          error: t('node.cycleRefused', {}, { defaultValue: 'Cannot set node as its own parent' }),
        })
        return
      }
      const parent = await findOne<NodeRow>('nodes', [
        { field: 'id', operator: '=', value: body.data.parent_id },
        { field: 'map_id', operator: '=', value: node.map_id },
      ])
      if (!parent) {
        res.status(404).json({ error: t('node.notFound', {}, { defaultValue: 'Node not found' }) })
        return
      }
    }
    const result = await updateById<NodeRow>('nodes', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    safeBroadcast(`map:${node.map_id}`, 'node:updated', result.data)
    res.json(result.data)
  } catch (error) {
    logger.error('nodes.patch', error)
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
    const node = await requireWritableNode(id.data.id, ownerId)
    if (!node) {
      res.status(404).json({ error: t('node.notFound', {}, { defaultValue: 'Node not found' }) })
      return
    }
    // CASCADE on nodes(parent_id) + connections(source_node_id/target_node_id)
    // wipes descendants/edges; explicit delete here triggers the cascade.
    await deleteById('nodes', id.data.id)
    safeBroadcast(`map:${node.map_id}`, 'node:deleted', { id: id.data.id })
    res.status(204).end()
  } catch (error) {
    logger.error('nodes.delete', error)
    internalError(res)
  }
})

/**
 * Realtime broadcast is best-effort — if the socket bond isn't wired yet
 * (e.g. in tests where setupBonds skips realtime) the event simply drops.
 * The HTTP response is the source of truth.
 */
function safeBroadcast(channel: string, event: string, payload: unknown): void {
  try {
    void broadcast(channel, event, payload)
  } catch (_error) {
    // realtime is opportunistic — broadcast failures must not block HTTP responses
  }
}

export default router
