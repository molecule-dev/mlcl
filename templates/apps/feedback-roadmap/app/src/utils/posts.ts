/**
 * API view-models + helpers for the feedback surfaces.
 *
 * Keeping the API-shape interfaces and row conversions in one place means
 * swapping field names on either side (DB column rename, API decoration
 * shape) only requires one update.
 */

export interface ApiBoardSummary {
  id: string
  slug: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  post_count?: number | null
}

export interface ApiAuthorSummary {
  id: string
  username?: string | null
  name?: string | null
  role?: string | null
}

export interface ApiPost {
  id: string
  slug?: string | null
  title: string
  body?: string | null
  board_id: string
  author_id: string
  status: string
  admin_response?: string | null
  admin_responded_at?: string | null
  merged_into_id?: string | null
  merged_into?: { id: string; title: string; slug?: string | null } | null
  vote_count?: number | null
  comment_count?: number | null
  roadmap_label?: string | null
  shipped_at?: string | null
  created_at: string
  updated_at?: string | null
  board?: ApiBoardSummary | null
  author?: ApiAuthorSummary | null
  viewer_voted?: boolean
  comments?: ApiComment[]
}

export interface ApiComment {
  id: string
  post_id: string
  author_id: string
  body: string
  created_at: string
  author?: ApiAuthorSummary | null
}

/** Display name for a post author — username, falling back to name/id. */
export function authorName(author: ApiAuthorSummary | null | undefined, fallback = '?'): string {
  if (!author) return fallback
  return author.username || author.name || author.id.slice(0, 8)
}

/** "3h ago" style relative time from an ISO timestamp. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

/** Locale-formatted date for changelog entries and shipped stamps. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Post status as the UI sees it — merged duplicates report their own badge. */
export function displayStatus(
  post: ApiPost,
): 'open' | 'planned' | 'in_progress' | 'shipped' | 'declined' | 'merged' {
  if (post.merged_into_id) return 'merged'
  switch (post.status) {
    case 'planned':
    case 'in_progress':
    case 'shipped':
    case 'declined':
      return post.status
    default:
      return 'open'
  }
}

/** Excerpt helper — plain first slice of the body for list rows. */
export function excerptOf(post: ApiPost, max = 160): string {
  const body = (post.body ?? '').trim()
  if (body.length <= max) return body
  return `${body.slice(0, max).trimEnd()}…`
}
