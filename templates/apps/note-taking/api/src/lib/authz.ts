/**
 * Shared authorization helpers for the note-taking handler suite.
 *
 * Every domain entity (pages, blocks, databases, database_rows, page_templates)
 * ultimately belongs to a `workspaces` row whose `owner_id` is the user. These
 * helpers walk the chain so each handler can ask "does this user own the
 * workspace that owns this resource?" without re-implementing the join.
 */

import { findOne } from '@molecule/api-database'

export {
  internalError,
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

export interface WorkspaceRow {
  id: string
  owner_id: string
  name: string
  icon: string | null
  created_at: string
  updated_at: string
}

export interface PageRow {
  id: string
  workspace_id: string
  parent_id: string | null
  template_id: string | null
  created_by: string | null
  title: string
  icon: string | null
  cover_image: string | null
  position: number
  is_favorited: boolean
  is_template: boolean
  trashed_at: string | null
  created_at: string
  updated_at: string
}

export interface BlockRow {
  id: string
  page_id: string
  parent_block_id: string | null
  type: string
  content: Record<string, unknown>
  properties: Record<string, unknown>
  position: number
  created_at: string
  updated_at: string
}

export interface NoteDatabaseRow {
  id: string
  workspace_id: string
  page_id: string | null
  created_by: string | null
  name: string
  schema: Record<string, unknown>
  view_type: string
  created_at: string
  updated_at: string
}

export interface DatabaseRow {
  id: string
  database_id: string
  values: Record<string, unknown>
  position: number
  created_at: string
  updated_at: string
}

export interface PageTemplateRow {
  id: string
  workspace_id: string | null
  created_by: string | null
  name: string
  description: string
  category: string
  icon: string | null
  content: { blocks?: Array<Record<string, unknown>> }
  is_system: boolean
  created_at: string
  updated_at: string
}

/** Returns the workspace if `ownerId` owns it; otherwise null. */
export const requireWorkspace = async (
  workspaceId: string,
  ownerId: string,
): Promise<WorkspaceRow | null> => {
  return findOne<WorkspaceRow>('workspaces', [
    { field: 'id', operator: '=', value: workspaceId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

/** Returns the page if `ownerId` owns its workspace; otherwise null. */
export const requirePage = async (pageId: string, ownerId: string): Promise<PageRow | null> => {
  const page = await findOne<PageRow>('pages', [{ field: 'id', operator: '=', value: pageId }])
  if (!page) return null
  const ws = await requireWorkspace(page.workspace_id, ownerId)
  return ws ? page : null
}

/** Returns the block if `ownerId` owns its workspace; otherwise null. */
export const requireBlock = async (blockId: string, ownerId: string): Promise<BlockRow | null> => {
  const block = await findOne<BlockRow>('blocks', [{ field: 'id', operator: '=', value: blockId }])
  if (!block) return null
  const page = await requirePage(block.page_id, ownerId)
  return page ? block : null
}

/** Returns the database if `ownerId` owns its workspace; otherwise null. */
export const requireDatabase = async (
  databaseId: string,
  ownerId: string,
): Promise<NoteDatabaseRow | null> => {
  const db = await findOne<NoteDatabaseRow>('note_databases', [
    { field: 'id', operator: '=', value: databaseId },
  ])
  if (!db) return null
  const ws = await requireWorkspace(db.workspace_id, ownerId)
  return ws ? db : null
}

/** Returns the row if `ownerId` owns the database's workspace; otherwise null. */
export const requireDatabaseRow = async (
  rowId: string,
  ownerId: string,
): Promise<DatabaseRow | null> => {
  const row = await findOne<DatabaseRow>('database_rows', [
    { field: 'id', operator: '=', value: rowId },
  ])
  if (!row) return null
  const db = await requireDatabase(row.database_id, ownerId)
  return db ? row : null
}

/**
 * System templates are readable by every authenticated user; user templates
 * are readable only by the user who owns the template's workspace.
 */
export const requireReadableTemplate = async (
  templateId: string,
  ownerId: string,
): Promise<PageTemplateRow | null> => {
  const tpl = await findOne<PageTemplateRow>('page_templates', [
    { field: 'id', operator: '=', value: templateId },
  ])
  if (!tpl) return null
  if (tpl.is_system) return tpl
  if (!tpl.workspace_id) return null
  const ws = await requireWorkspace(tpl.workspace_id, ownerId)
  return ws ? tpl : null
}

/** Writable templates are user-owned; system templates can never be edited. */
export const requireWritableTemplate = async (
  templateId: string,
  ownerId: string,
): Promise<PageTemplateRow | null> => {
  const tpl = await requireReadableTemplate(templateId, ownerId)
  if (!tpl) return null
  if (tpl.is_system) return null
  return tpl
}
