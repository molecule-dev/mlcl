/**
 * Shared authorization helpers for the mind-mapping handler suite.
 *
 * Every domain entity (nodes, connections, map_versions, map_collaborators)
 * ultimately belongs to a `maps` row whose `owner_id` is the user, OR to
 * a map the user has been added to via `map_collaborators`. These helpers
 * walk the chain so each handler can ask "does this user own the map" /
 * "is this user a collaborator with the required role" without
 * re-implementing the join.
 *
 * Lives outside `handlers/` so the verify gate G5 (which scans
 * `handlers/*.ts` for zod imports) does not treat helpers as
 * unvalidated handlers.
 */

import type { Response } from 'express'

import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

export {
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

export type Role = 'viewer' | 'commenter' | 'editor'

export interface MapRow {
  id: string
  owner_id: string
  title: string
  description: string
  theme: string
  root_node_id: string | null
  is_template: boolean
  is_public: boolean
  public_slug: string | null
  trashed_at: string | null
  created_at: string
  updated_at: string
}

export interface NodeRow {
  id: string
  map_id: string
  parent_id: string | null
  text: string
  color: string
  shape: string
  size: string
  x: number
  y: number
  position: number
  created_at: string
  updated_at: string
}

export interface ConnectionRow {
  id: string
  map_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
  style: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MapVersionRow {
  id: string
  map_id: string
  snapshot: { nodes: unknown[]; connections: unknown[] }
  created_by: string | null
  change_summary: string
  created_at: string
}

export interface MapCollaboratorRow {
  id: string
  map_id: string
  user_id: string | null
  email: string | null
  role: Role
  accepted_at: string | null
  created_at: string
}

export interface MapTemplateRow {
  id: string
  owner_id: string | null
  name: string
  description: string
  snapshot: { nodes: unknown[]; connections: unknown[] }
  is_system: boolean
  created_at: string
}

const ROLE_RANK: Record<Role, number> = { viewer: 0, commenter: 1, editor: 2 }

/** Returns the map iff `ownerId` owns it; null otherwise. */
export const requireOwnedMap = async (mapId: string, ownerId: string): Promise<MapRow | null> => {
  return findOne<MapRow>('maps', [
    { field: 'id', operator: '=', value: mapId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

/** Lookup a map without ownership check (use for is_public-aware paths). */
export const findMap = async (mapId: string): Promise<MapRow | null> => {
  return findOne<MapRow>('maps', [{ field: 'id', operator: '=', value: mapId }])
}

/**
 * Returns the map iff the user can READ it: owner, accepted collaborator,
 * or the map has `is_public = true`.
 */
export const requireReadableMap = async (
  mapId: string,
  ownerId: string,
): Promise<MapRow | null> => {
  const map = await findMap(mapId)
  if (!map) return null
  if (map.owner_id === ownerId) return map
  if (map.is_public) return map
  const collab = await findOne<MapCollaboratorRow>('map_collaborators', [
    { field: 'map_id', operator: '=', value: mapId },
    { field: 'user_id', operator: '=', value: ownerId },
  ])
  if (collab && collab.accepted_at) return map
  return null
}

/**
 * Returns the map iff the user can WRITE: owner OR collaborator with role
 * >= editor. is_public alone does NOT confer write access.
 */
export const requireWritableMap = async (
  mapId: string,
  ownerId: string,
): Promise<MapRow | null> => {
  const map = await findMap(mapId)
  if (!map) return null
  if (map.owner_id === ownerId) return map
  const collab = await findOne<MapCollaboratorRow>('map_collaborators', [
    { field: 'map_id', operator: '=', value: mapId },
    { field: 'user_id', operator: '=', value: ownerId },
  ])
  if (collab && collab.accepted_at && ROLE_RANK[collab.role] >= ROLE_RANK.editor) return map
  return null
}

/** Returns the node iff `ownerId` can read its parent map. */
export const requireReadableNode = async (
  nodeId: string,
  ownerId: string,
): Promise<NodeRow | null> => {
  const node = await findOne<NodeRow>('nodes', [{ field: 'id', operator: '=', value: nodeId }])
  if (!node) return null
  const map = await requireReadableMap(node.map_id, ownerId)
  return map ? node : null
}

/** Returns the node iff `ownerId` can write to its parent map. */
export const requireWritableNode = async (
  nodeId: string,
  ownerId: string,
): Promise<NodeRow | null> => {
  const node = await findOne<NodeRow>('nodes', [{ field: 'id', operator: '=', value: nodeId }])
  if (!node) return null
  const map = await requireWritableMap(node.map_id, ownerId)
  return map ? node : null
}

/** Returns the connection iff `ownerId` can write to its parent map. */
export const requireWritableConnection = async (
  connectionId: string,
  ownerId: string,
): Promise<ConnectionRow | null> => {
  const conn = await findOne<ConnectionRow>('connections', [
    { field: 'id', operator: '=', value: connectionId },
  ])
  if (!conn) return null
  const map = await requireWritableMap(conn.map_id, ownerId)
  return map ? conn : null
}

/**
 * Templates: system templates are readable by everyone; user templates are
 * readable only by their owner.
 */
export const requireReadableTemplate = async (
  templateId: string,
  ownerId: string,
): Promise<MapTemplateRow | null> => {
  const tpl = await findOne<MapTemplateRow>('map_templates', [
    { field: 'id', operator: '=', value: templateId },
  ])
  if (!tpl) return null
  if (tpl.is_system) return tpl
  if (tpl.owner_id === ownerId) return tpl
  return null
}

/** Writable templates are user-owned; system templates can never be edited. */
export const requireWritableTemplate = async (
  templateId: string,
  ownerId: string,
): Promise<MapTemplateRow | null> => {
  const tpl = await requireReadableTemplate(templateId, ownerId)
  if (!tpl) return null
  if (tpl.is_system) return null
  return tpl
}

export const internalError = (res: Response): void => {
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}
