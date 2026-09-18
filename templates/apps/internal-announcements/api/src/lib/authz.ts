/**
 * Shared authorization helpers for the internal-announcements handler suite.
 *
 * Every domain entity (announcements, comments, acknowledgments, categories)
 * is owned by an authenticated user (author or, for acks, the acknowledger
 * themselves). These helpers walk the chain so each handler can ask
 * "does this user own this resource?" or "is this acknowledgment self-owned?"
 * without re-implementing the join.
 */

import type { Response } from 'express'

import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

export {
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

export interface AnnouncementRow {
  id: string
  title: string
  body: string
  body_html: string | null
  category_id: string | null
  author_id: string
  user_id: string
  audience: { kind: string; targets?: string[] } | Record<string, unknown>
  priority: 'low' | 'normal' | 'high'
  status: 'draft' | 'scheduled' | 'published' | 'archived'
  is_pinned: boolean
  requires_acknowledgment: boolean
  publish_at: string | null
  published_at: string | null
  archived_at: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface AnnouncementCategoryRow {
  id: string
  name: string
  color: string | null
  icon: string | null
  created_by: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface AnnouncementCommentRow {
  id: string
  announcement_id: string
  parent_id: string | null
  author_id: string
  user_id: string
  body: string
  edited_at: string | null
  created_at: string
  updated_at: string
}

export interface AcknowledgmentRow {
  id: string
  announcement_id: string
  user_id: string
  acknowledged_at: string
  ip: string | null
  created_at: string
  updated_at: string
}

export interface UserRow {
  id: string
  email: string | null
  username: string | null
  name: string | null
  oauthData?: Record<string, unknown> | null
  planKey?: string | null
}

/** Returns the announcement if `ownerId` authored it; otherwise null. */
export const requireOwnedAnnouncement = async (
  announcementId: string,
  ownerId: string,
): Promise<AnnouncementRow | null> => {
  return findOne<AnnouncementRow>('announcements', [
    { field: 'id', operator: '=', value: announcementId },
    { field: 'author_id', operator: '=', value: ownerId },
  ])
}

/** Returns the announcement (no owner check) — for read-only flows. */
export const findAnnouncement = async (announcementId: string): Promise<AnnouncementRow | null> => {
  return findOne<AnnouncementRow>('announcements', [
    { field: 'id', operator: '=', value: announcementId },
  ])
}

/** Returns the comment if `ownerId` authored it; otherwise null. */
export const requireOwnedComment = async (
  commentId: string,
  ownerId: string,
): Promise<AnnouncementCommentRow | null> => {
  return findOne<AnnouncementCommentRow>('announcement_comments', [
    { field: 'id', operator: '=', value: commentId },
    { field: 'author_id', operator: '=', value: ownerId },
  ])
}

/** Returns the category if `ownerId` created it; otherwise null. */
export const requireOwnedCategory = async (
  categoryId: string,
  ownerId: string,
): Promise<AnnouncementCategoryRow | null> => {
  return findOne<AnnouncementCategoryRow>('announcement_categories', [
    { field: 'id', operator: '=', value: categoryId },
    { field: 'created_by', operator: '=', value: ownerId },
  ])
}

export const internalError = (res: Response): void => {
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}
