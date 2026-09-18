/**
 * Shared authorization helpers for the clipboard-manager handler suite.
 *
 * Every domain entity (clips, categories) is owned directly by a user
 * via `owner_id`. These helpers walk that single hop so each handler
 * can ask "does this user own this row?" with one DataStore call and a
 * `null` return on miss → 404 (no existence leakage).
 */

import { findOne } from '@molecule/api-database'

export {
  internalError,
  requireUser,
  getUserId as userId,
  validationError,
} from '@molecule/api-bonds-default-express'

export interface ClipRow {
  id: string
  owner_id: string
  category_id: string | null
  title: string
  content: string | null
  encrypted_content: string | null
  type: 'text' | 'image' | 'link' | 'code'
  source_app: string | null
  is_pinned: boolean
  is_favorite: boolean
  is_sensitive: boolean
  created_at: string
  updated_at: string
}

export interface CategoryRow {
  id: string
  owner_id: string
  name: string
  icon: string | null
  color: string | null
  position: number
  created_at: string
  updated_at: string
}

/** Returns the clip if `ownerId` owns it; otherwise null. */
export const requireClip = async (clipId: string, ownerId: string): Promise<ClipRow | null> => {
  return findOne<ClipRow>('clips', [
    { field: 'id', operator: '=', value: clipId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

/** Returns the category if `ownerId` owns it; otherwise null. */
export const requireCategory = async (
  categoryId: string,
  ownerId: string,
): Promise<CategoryRow | null> => {
  return findOne<CategoryRow>('categories', [
    { field: 'id', operator: '=', value: categoryId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}
