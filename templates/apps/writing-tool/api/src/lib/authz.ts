/**
 * Shared authorization helpers for the writing-tool handler suite.
 *
 * Every domain entity (folders, documents, document_versions,
 * document_exports) carries an `owner_id` directly or chains back to one
 * via `document_id`. These helpers walk the chain so handlers can ask
 * "does this user own the resource?" without re-implementing the join.
 *
 * Pattern mirrors `note-taking/api/src/lib/authz.ts`.
 */

import type { Response } from 'express'

import {} from '@molecule/api-bonds-default-express'
import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

export { getUserId as sessionUserId } from '@molecule/api-bonds-default-express'
export { requireUser, validationError } from '@molecule/api-bonds-default-express'

export interface FolderRow {
  id: string
  owner_id: string
  parent_id: string | null
  name: string
  position: number
  created_at: string
  updated_at: string
}

export interface DocumentRow {
  id: string
  owner_id: string
  folder_id: string | null
  title: string
  body_md: string
  excerpt: string
  word_count: number
  character_count: number
  reading_time: number
  status: string
  pinned: boolean
  tags_json: unknown
  position: number
  trashed_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentVersionRow {
  id: string
  document_id: string
  version_number: number
  body_md: string
  snapshot_size: number
  created_at: string
}

export interface DocumentExportRow {
  id: string
  document_id: string
  format: string
  status: string
  s3_key: string | null
  created_at: string
}

/** Returns the folder iff `ownerId` owns it; otherwise null. */
export const requireFolder = async (
  folderId: string,
  ownerId: string,
): Promise<FolderRow | null> => {
  return findOne<FolderRow>('folders', [
    { field: 'id', operator: '=', value: folderId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

/** Returns the document iff `ownerId` owns it; otherwise null. */
export const requireDocument = async (
  documentId: string,
  ownerId: string,
): Promise<DocumentRow | null> => {
  return findOne<DocumentRow>('documents', [
    { field: 'id', operator: '=', value: documentId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

/**
 * Returns the version iff `ownerId` owns its parent document; otherwise null.
 */
export const requireVersion = async (
  versionId: string,
  ownerId: string,
): Promise<DocumentVersionRow | null> => {
  const version = await findOne<DocumentVersionRow>('document_versions', [
    { field: 'id', operator: '=', value: versionId },
  ])
  if (!version) return null
  const doc = await requireDocument(version.document_id, ownerId)
  return doc ? version : null
}

/**
 * Returns the export iff `ownerId` owns its parent document; otherwise null.
 */
export const requireExport = async (
  exportId: string,
  ownerId: string,
): Promise<DocumentExportRow | null> => {
  const exp = await findOne<DocumentExportRow>('document_exports', [
    { field: 'id', operator: '=', value: exportId },
  ])
  if (!exp) return null
  const doc = await requireDocument(exp.document_id, ownerId)
  return doc ? exp : null
}

export const internalError = (res: Response): void => {
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}
