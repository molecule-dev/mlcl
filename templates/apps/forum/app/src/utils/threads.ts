/**
 * Helpers for converting API thread/category/author shapes to the
 * `ThreadRowData` expected by the `ThreadRow` component used across
 * Feed, Categories, Search, and ThreadView.
 *
 * Keeping the conversion in one place means swapping field names on
 * either side (DB column rename, API decoration shape) only requires
 * one update.
 */

import type { ThreadRowData, ThreadStatus } from '../components/ThreadRow.js'
import type { VoteState } from '../components/VoteColumn.js'

export interface ApiCategorySummary {
  id: string
  slug: string
  name: string
  color?: string | null
  icon?: string | null
}

export interface ApiAuthorSummary {
  id: string
  username?: string | null
  name?: string | null
  role?: string | null
  reputation?: number | null
  avatar_url?: string | null
}

export interface ApiThread {
  id: string
  slug?: string | null
  title: string
  body?: string | null
  body_markdown?: string | null
  category_id: string
  author_id: string
  tags?: string[] | null
  vote_score?: number | null
  reply_count?: number | null
  view_count?: number | null
  is_pinned?: boolean | null
  is_locked?: boolean | null
  status?: string | null
  last_reply_at?: string | null
  edited_at?: string | null
  created_at: string
  updated_at?: string | null
  category?: ApiCategorySummary | null
  author?: ApiAuthorSummary | null
}

export interface ApiReply {
  id: string
  thread_id: string
  parent_reply_id: string | null
  body: string
  body_markdown?: string | null
  author_id: string
  vote_score?: number | null
  edited_at?: string | null
  created_at: string
  updated_at?: string | null
  author?: ApiAuthorSummary | null
}

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  const ms = Math.max(0, Date.now() - date.getTime())
  if (ms < MINUTE_MS) return 'just now'
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`
  if (ms < 30 * DAY_MS) return `${Math.floor(ms / DAY_MS)}d`
  if (ms < 365 * DAY_MS) return `${Math.floor(ms / (30 * DAY_MS))}mo`
  return `${Math.floor(ms / (365 * DAY_MS))}y`
}

export function authorDisplayName(author?: ApiAuthorSummary | null, authorId?: string): string {
  if (author?.username) return author.username
  if (author?.name) return author.name
  if (author?.id) return author.id.slice(0, 8)
  if (authorId) return authorId.slice(0, 8)
  return 'unknown'
}

/**
 * URL-safe slug for the author's profile route. Prefers username (since
 * the profile handler resolves it via exact match), falls back to the
 * UUID prefix the handler also supports via id::text LIKE. Avoids
 * passing display names with spaces or punctuation as URL paths.
 */
export function authorSlug(author?: ApiAuthorSummary | null, authorId?: string): string {
  if (author?.username) return author.username
  if (author?.id) return author.id.slice(0, 8)
  if (authorId) return authorId.slice(0, 8)
  return 'unknown'
}

export function deriveThreadStatus(thread: ApiThread): ThreadStatus {
  if (thread.is_pinned) return 'pinned'
  if (thread.is_locked) return 'locked'
  const status = (thread.status ?? '').toLowerCase()
  if (status === 'resolved') return 'resolved'
  if (status === 'flagged') return 'flagged'
  if (status === 'hot') return 'hot'
  return 'open'
}

export function authorBadgeFor(author?: ApiAuthorSummary | null): ThreadRowData['authorBadge'] {
  const role = (author?.role ?? '').toLowerCase()
  if (role === 'admin') return 'admin'
  if (role === 'moderator') return 'mod'
  return null
}

/**
 * Build an excerpt from a markdown body. Strips fences and headings so
 * the feed-row preview reads cleanly even when the body uses formatting.
 */
export function buildExcerpt(body: string | null | undefined, max = 220): string | undefined {
  if (!body) return undefined
  const text = body
    .replace(/^#+\s+/gm, '')
    .replace(/`{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export function decorateApiThreadToRow(
  thread: ApiThread,
  voteState: VoteState = null,
): ThreadRowData {
  const author = authorDisplayName(thread.author, thread.author_id)
  return {
    id: thread.id,
    title: thread.title,
    author,
    authorSlug: authorSlug(thread.author, thread.author_id),
    authorBadge: authorBadgeFor(thread.author),
    category: thread.category?.name ?? thread.category_id.slice(0, 8),
    categorySlug: thread.category?.slug ?? thread.category_id,
    categoryColor: thread.category?.color ?? undefined,
    flair: null,
    timestamp: formatRelativeTime(thread.created_at),
    commentCount: thread.reply_count ?? 0,
    score: thread.vote_score ?? 0,
    voteState,
    status: deriveThreadStatus(thread),
    excerpt: buildExcerpt(thread.body_markdown ?? thread.body),
    thumbnail: null,
  }
}
