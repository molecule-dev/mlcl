/**
 * Connection handlers — owner/editor-scoped CRUD over `connections` (free
 * cross-tree edges between nodes). Always scoped to a parent map; both
 * source_node_id and target_node_id must belong to that same map.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import {
  type ConnectionRow,
  internalError,
  type NodeRow,
  requireUser,
  requireWritableConnection,
  requireWritableMap,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  map_id: z.string().uuid(),
})

const createSchema = z.object({
  map_id: z.string().uuid(),
  source_node_id: z.string().uuid(),
  target_node_id: z.string().uuid(),
  label: z.string().max(255).nullable().optional(),
  style: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = z.object({
  label: z.string().max(255).nullable().optional(),
  style: z.record(z.string(), z.unknown()).optional(),
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
      res.json([])
      return
    }
    const items = await findMany<ConnectionRow>('connections', {
      where: [{ field: 'map_id', operator: '=', value: parsed.data.map_id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('connections.list', error)
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
    if (parsed.data.source_node_id === parsed.data.target_node_id) {
      res.status(400).json({
        error: t('connection.selfRefused', {}, { defaultValue: 'Cannot connect a node to itself' }),
      })
      return
    }
    // Both endpoints must live in the same map as the connection.
    const [source, target] = await Promise.all([
      findOne<NodeRow>('nodes', [
        { field: 'id', operator: '=', value: parsed.data.source_node_id },
        { field: 'map_id', operator: '=', value: parsed.data.map_id },
      ]),
      findOne<NodeRow>('nodes', [
        { field: 'id', operator: '=', value: parsed.data.target_node_id },
        { field: 'map_id', operator: '=', value: parsed.data.map_id },
      ]),
    ])
    if (!source || !target) {
      res.status(404).json({ error: t('node.notFound', {}, { defaultValue: 'Node not found' }) })
      return
    }
    const result = await create<ConnectionRow>('connections', {
      map_id: parsed.data.map_id,
      source_node_id: parsed.data.source_node_id,
      target_node_id: parsed.data.target_node_id,
      label: parsed.data.label ?? null,
      style: parsed.data.style ?? {},
      created_at: new Date(),
      updated_at: new Date(),
    })
    safeBroadcast(`map:${parsed.data.map_id}`, 'connection:created', result.data)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('connections.create', error)
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
    const conn = await requireWritableConnection(id.data.id, ownerId)
    if (!conn) {
      res
        .status(404)
        .json({ error: t('connection.notFound', {}, { defaultValue: 'Connection not found' }) })
      return
    }
    const result = await updateById<ConnectionRow>('connections', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    safeBroadcast(`map:${conn.map_id}`, 'connection:updated', result.data)
    res.json(result.data)
  } catch (error) {
    logger.error('connections.patch', error)
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
    const conn = await requireWritableConnection(id.data.id, ownerId)
    if (!conn) {
      res
        .status(404)
        .json({ error: t('connection.notFound', {}, { defaultValue: 'Connection not found' }) })
      return
    }
    await deleteById('connections', id.data.id)
    safeBroadcast(`map:${conn.map_id}`, 'connection:deleted', { id: id.data.id })
    res.status(204).end()
  } catch (error) {
    logger.error('connections.delete', error)
    internalError(res)
  }
})

function safeBroadcast(channel: string, event: string, payload: unknown): void {
  try {
    void broadcast(channel, event, payload)
  } catch (_error) {
    // realtime is opportunistic — broadcast failures must not block HTTP responses
  }
}

export default router
