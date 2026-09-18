/**
 * Shared authorization helpers for the internal-knowledge-base handler suite.
 *
 * Every domain entity (articles, attachments, ai_summaries, comments,
 * article_versions) ultimately belongs to a `spaces` row whose
 * `created_by_user_id` is the user who owns it. `space_members` augments
 * this with role-based access (admin/editor/viewer). These helpers walk
 * the chain so each handler can ask "does this user have access to the
 * space that owns this resource?" without re-implementing the join.
 */

import { findOne } from '@molecule/api-database'

export {
  internalError,
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

export interface SpaceRow {
  id: string
  created_by_user_id: string
  key: string
  name: string
  description: string
  icon: string | null
  color: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface SpaceMemberRow {
  id: string
  space_id: string
  user_id: string
  role: 'admin' | 'editor' | 'viewer' | string
  added_at: string
}

export interface ArticleRow {
  id: string
  space_id: string
  parent_article_id: string | null
  author_user_id: string | null
  last_edited_by_user_id: string | null
  title: string
  slug: string
  body_md: string
  body_html: string
  status: 'draft' | 'published' | string
  position: number
  helpful_count: number
  published_at: string | null
  last_edited_at: string | null
  created_at: string
  updated_at: string
}

export interface ArticleVersionRow {
  id: string
  article_id: string
  edited_by_user_id: string | null
  body_md: string
  body_html: string
  change_summary: string
  edited_at: string
}

export interface AttachmentRow {
  id: string
  article_id: string
  uploaded_by_user_id: string | null
  s3_key: string
  filename: string
  content_type: string
  size_bytes: number
  uploaded_at: string
}

export interface AiSummaryRow {
  id: string
  article_id: string
  summary_md: string
  model: string
  generated_at: string
}

export interface NotificationRow {
  id: string
  user_id: string
  kind: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

/**
 * Returns the space if `userId` either created it OR is a member; otherwise
 * null. Used by all read paths.
 */
export const requireSpaceMembership = async (
  spaceId: string,
  uid: string,
): Promise<SpaceRow | null> => {
  const space = await findOne<SpaceRow>('spaces', [{ field: 'id', operator: '=', value: spaceId }])
  if (!space) return null
  if (space.created_by_user_id === uid) return space
  const member = await findOne<SpaceMemberRow>('space_members', [
    { field: 'space_id', operator: '=', value: spaceId },
    { field: 'user_id', operator: '=', value: uid },
  ])
  return member ? space : null
}

/**
 * Returns the space + role if `userId` may write to it (creator or
 * admin/editor member); otherwise null.
 */
export const requireSpaceWriteAccess = async (
  spaceId: string,
  uid: string,
): Promise<{ space: SpaceRow; role: 'admin' | 'editor' | 'viewer' } | null> => {
  const space = await findOne<SpaceRow>('spaces', [{ field: 'id', operator: '=', value: spaceId }])
  if (!space) return null
  if (space.created_by_user_id === uid) return { space, role: 'admin' }
  const member = await findOne<SpaceMemberRow>('space_members', [
    { field: 'space_id', operator: '=', value: spaceId },
    { field: 'user_id', operator: '=', value: uid },
  ])
  if (!member) return null
  if (member.role === 'admin' || member.role === 'editor') {
    return { space, role: member.role as 'admin' | 'editor' }
  }
  return null
}

/** Admin-only: only the space creator or a member with role=admin. */
export const requireSpaceAdminAccess = async (
  spaceId: string,
  uid: string,
): Promise<SpaceRow | null> => {
  const space = await findOne<SpaceRow>('spaces', [{ field: 'id', operator: '=', value: spaceId }])
  if (!space) return null
  if (space.created_by_user_id === uid) return space
  const member = await findOne<SpaceMemberRow>('space_members', [
    { field: 'space_id', operator: '=', value: spaceId },
    { field: 'user_id', operator: '=', value: uid },
  ])
  return member && member.role === 'admin' ? space : null
}

/** Returns the article if `userId` has read access to its space. */
export const requireReadableArticle = async (
  articleId: string,
  uid: string,
): Promise<ArticleRow | null> => {
  const article = await findOne<ArticleRow>('articles', [
    { field: 'id', operator: '=', value: articleId },
  ])
  if (!article) return null
  const space = await requireSpaceMembership(article.space_id, uid)
  return space ? article : null
}

/** Returns the article if `userId` has write access to its space. */
export const requireWritableArticle = async (
  articleId: string,
  uid: string,
): Promise<ArticleRow | null> => {
  const article = await findOne<ArticleRow>('articles', [
    { field: 'id', operator: '=', value: articleId },
  ])
  if (!article) return null
  const access = await requireSpaceWriteAccess(article.space_id, uid)
  return access ? article : null
}

/** Returns the attachment if `userId` may read its article's space. */
export const requireReadableAttachment = async (
  attachmentId: string,
  uid: string,
): Promise<AttachmentRow | null> => {
  const att = await findOne<AttachmentRow>('attachments', [
    { field: 'id', operator: '=', value: attachmentId },
  ])
  if (!att) return null
  const article = await requireReadableArticle(att.article_id, uid)
  return article ? att : null
}
