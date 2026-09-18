/**
 * Map version handlers — append-only `map_versions` snapshots + restore.
 *
 * Snapshot a map's current nodes + connections. Restore replays a
 * snapshot by clearing the live nodes/connections and re-inserting from
 * the snapshot. Read access requires ownership or an accepted
 * collaborator; restore requires write access (editor or owner).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteMany, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type ConnectionRow,
  internalError,
  type MapVersionRow,
  type NodeRow,
  requireReadableMap,
  requireUser,
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
  change_summary: z.string().max(500).optional(),
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
    const map = await requireReadableMap(parsed.data.map_id, ownerId)
    if (!map) {
      res.json([])
      return
    }
    const items = await findMany<MapVersionRow>('map_versions', {
      where: [{ field: 'map_id', operator: '=', value: parsed.data.map_id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(items)
  } catch (error) {
    logger.error('versions.list', error)
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
    const [nodes, connections] = await Promise.all([
      findMany<NodeRow>('nodes', {
        where: [{ field: 'map_id', operator: '=', value: parsed.data.map_id }],
      }),
      findMany<ConnectionRow>('connections', {
        where: [{ field: 'map_id', operator: '=', value: parsed.data.map_id }],
      }),
    ])
    const result = await create<MapVersionRow>('map_versions', {
      map_id: parsed.data.map_id,
      snapshot: { nodes, connections },
      created_by: ownerId,
      change_summary: parsed.data.change_summary ?? '',
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('versions.create', error)
    internalError(res)
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const version = await findOne<MapVersionRow>('map_versions', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!version) {
      res
        .status(404)
        .json({ error: t('version.notFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    const map = await requireWritableMap(version.map_id, ownerId)
    if (!map) {
      res.status(404).json({ error: t('map.notFound', {}, { defaultValue: 'Map not found' }) })
      return
    }
    // Wipe live nodes + connections, re-insert from snapshot. We keep id
    // values from the snapshot so restored connections still reference
    // their original endpoints.
    await deleteMany('connections', [{ field: 'map_id', operator: '=', value: version.map_id }])
    await deleteMany('nodes', [{ field: 'map_id', operator: '=', value: version.map_id }])

    const snapshot = (
      typeof version.snapshot === 'string' ? JSON.parse(version.snapshot) : version.snapshot
    ) as { nodes: NodeRow[]; connections: ConnectionRow[] }
    for (const n of snapshot.nodes ?? []) {
      await create('nodes', {
        id: n.id,
        map_id: n.map_id,
        parent_id: n.parent_id,
        text: n.text,
        color: n.color,
        shape: n.shape,
        size: n.size,
        x: n.x,
        y: n.y,
        position: n.position,
        created_at: n.created_at,
        updated_at: new Date(),
      })
    }
    for (const c of snapshot.connections ?? []) {
      await create('connections', {
        id: c.id,
        map_id: c.map_id,
        source_node_id: c.source_node_id,
        target_node_id: c.target_node_id,
        label: c.label,
        style: c.style,
        created_at: c.created_at,
        updated_at: new Date(),
      })
    }
    await updateById('maps', version.map_id, { updated_at: new Date() })
    res.json({ restored_version_id: version.id, map_id: version.map_id })
  } catch (error) {
    logger.error('versions.restore', error)
    internalError(res)
  }
})

export default router
