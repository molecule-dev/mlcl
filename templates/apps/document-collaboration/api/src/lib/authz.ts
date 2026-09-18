/**
 * Shared authorization helpers for the document-collaboration handler suite.
 *
 * Authorisation rules per INVENTORY:
 *   - documents — read by owner OR a `document_shares` row with
 *     shared_with_user_id = me; write by owner OR share role >= editor;
 *     delete by owner only.
 *   - document_versions — read inherits from parent doc; write only by
 *     internal handler code (no client-supplied versions).
 *   - document_comments — read inherits from parent doc; resolve/delete
 *     by author or doc owner.
 *   - document_shares — managed only by the document owner.
 *   - document_templates — system templates readable by all authed
 *     users; user templates readable by owner.
 *
 * Helpers walk the chain so each handler can answer "does this user have
 * the right access to this resource?" without re-implementing joins.
 */

import type { Response } from 'express'

import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { broadcast } from '@molecule/api-realtime'

export {
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

/**
 * Fire-and-forget realtime broadcast. The realtime provider throws when
 * the target room has not been opened by any subscribers (Socket.io
 * room registry), but writers must not be blocked by the absence of
 * listeners. Swallow the error so missing rooms or an unbonded provider
 * never bubble up as a 500 to the caller.
 */
export const safeBroadcast = async (
  roomId: string,
  event: string,
  data: unknown,
): Promise<void> => {
  try {
    await broadcast(roomId, event, data)
  } catch (_error) {
    // intentionally ignored — missing rooms or unbonded provider must not 500 the caller
  }
}

export type DocumentRole = 'viewer' | 'commenter' | 'editor'

const ROLE_RANK: Record<DocumentRole, number> = {
  viewer: 1,
  commenter: 2,
  editor: 3,
}

export interface DocumentRow {
  id: string
  owner_id: string
  template_id: string | null
  title: string
  content: Record<string, unknown>
  status: string
  is_template: boolean
  version: number
  trashed_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentVersionRow {
  id: string
  document_id: string
  author_id: string | null
  content: Record<string, unknown>
  version: number
  change_summary: string
  created_at: string
}

export interface DocumentCommentRow {
  id: string
  document_id: string
  author_id: string | null
  parent_id: string | null
  body: string
  anchor: Record<string, unknown>
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentShareRow {
  id: string
  document_id: string
  shared_by: string
  shared_with_user_id: string | null
  email: string | null
  role: DocumentRole
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentTemplateRow {
  id: string
  owner_id: string | null
  name: string
  description: string
  category: string
  content: Record<string, unknown>
  is_system: boolean
  created_at: string
  updated_at: string
}

/** Owns the document outright (ignores shares). */
export const requireOwnedDocument = async (
  documentId: string,
  ownerId: string,
): Promise<DocumentRow | null> => {
  return findOne<DocumentRow>('documents', [
    { field: 'id', operator: '=', value: documentId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

/**
 * Returns the document AND the user's effective role on it, or null if
 * the user has no read access.
 *
 * Owners get role `editor` (highest). Otherwise we look up an accepted
 * `document_shares` row.
 */
export const requireReadableDocument = async (
  documentId: string,
  ownerId: string,
): Promise<{ document: DocumentRow; role: DocumentRole } | null> => {
  const doc = await findOne<DocumentRow>('documents', [
    { field: 'id', operator: '=', value: documentId },
  ])
  if (!doc) return null
  if (doc.owner_id === ownerId) return { document: doc, role: 'editor' }
  const share = await findOne<DocumentShareRow>('document_shares', [
    { field: 'document_id', operator: '=', value: documentId },
    { field: 'shared_with_user_id', operator: '=', value: ownerId },
  ])
  if (!share) return null
  return { document: doc, role: share.role }
}

/** Convenience wrapper that enforces a minimum role for the given action. */
export const requireRole = async (
  documentId: string,
  ownerId: string,
  minimum: DocumentRole,
): Promise<{ document: DocumentRow; role: DocumentRole } | null> => {
  const access = await requireReadableDocument(documentId, ownerId)
  if (!access) return null
  if (ROLE_RANK[access.role] < ROLE_RANK[minimum]) return null
  return access
}

/** Read access for a comment via its parent document. */
export const requireCommentAccess = async (
  commentId: string,
  ownerId: string,
): Promise<{ comment: DocumentCommentRow; document: DocumentRow; role: DocumentRole } | null> => {
  const comment = await findOne<DocumentCommentRow>('document_comments', [
    { field: 'id', operator: '=', value: commentId },
  ])
  if (!comment) return null
  const access = await requireReadableDocument(comment.document_id, ownerId)
  if (!access) return null
  return { comment, document: access.document, role: access.role }
}

/** Share rows are owner-managed only. */
export const requireOwnedShare = async (
  shareId: string,
  ownerId: string,
): Promise<{ share: DocumentShareRow; document: DocumentRow } | null> => {
  const share = await findOne<DocumentShareRow>('document_shares', [
    { field: 'id', operator: '=', value: shareId },
  ])
  if (!share) return null
  const doc = await requireOwnedDocument(share.document_id, ownerId)
  if (!doc) return null
  return { share, document: doc }
}

/**
 * System templates are readable by every authenticated user; user
 * templates are readable only by their owner.
 */
export const requireReadableTemplate = async (
  templateId: string,
  ownerId: string,
): Promise<DocumentTemplateRow | null> => {
  const tpl = await findOne<DocumentTemplateRow>('document_templates', [
    { field: 'id', operator: '=', value: templateId },
  ])
  if (!tpl) return null
  if (tpl.is_system) return tpl
  if (tpl.owner_id !== ownerId) return null
  return tpl
}

/** Writable templates are user-owned; system templates can never be edited. */
export const requireWritableTemplate = async (
  templateId: string,
  ownerId: string,
): Promise<DocumentTemplateRow | null> => {
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
