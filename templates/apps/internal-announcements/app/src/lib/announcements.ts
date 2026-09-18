/**
 * Helpers for fetching and mapping internal-announcements data.
 *
 * The backend stores announcements with priority='low'|'normal'|'high'
 * plus an `is_pinned` boolean. The frontend renders four priority
 * variants ('urgent' | 'pinned' | 'normal' | 'fyi') because the design
 * folds "pinned" into the priority dimension. These helpers translate
 * between the two so the UI keeps its four-bucket vocabulary while the
 * DB keeps its orthogonal priority + is_pinned columns.
 *
 * Categories play the role the design calls "channels" — a colored,
 * named tag attached to each announcement. The defaults (company /
 * product / security / people / culture / remote) are seeded by the
 * backend the first time a user GETs /api/categories with zero rows.
 *
 * @module
 */
import { t } from '@molecule/app-i18n'

import type { AnnouncementCardData } from '../components/AnnouncementCard.js'
import type { AnnouncementPriority } from '../components/PriorityPill.js'

export interface ApiAnnouncement {
  id: string
  title: string
  body: string
  body_html: string | null
  category_id: string | null
  author_id: string
  audience: { kind: string; targets?: string[] }
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

export interface ApiCategory {
  id: string
  name: string
  color: string | null
  icon: string | null
  created_by: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface ApiAcknowledgment {
  id: string
  announcement_id: string
  user_id: string
  acknowledged_at: string
  ip: string | null
  created_at: string
  updated_at: string
}

export interface ApiComment {
  id: string
  announcement_id: string
  parent_id: string | null
  author_id: string
  body: string
  edited_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiUser {
  id: string
  name: string | null
  email: string | null
  username: string | null
  oauthData?: Record<string, unknown> | null
  planKey?: string | null
}

/** Frontend priority bucket from backend priority + is_pinned. */
export function toCardPriority(
  a: Pick<ApiAnnouncement, 'priority' | 'is_pinned'>,
): AnnouncementPriority {
  if (a.is_pinned) return 'pinned'
  if (a.priority === 'high') return 'urgent'
  if (a.priority === 'low') return 'fyi'
  return 'normal'
}

/** Backend (priority, is_pinned) tuple from frontend bucket. */
export function fromCardPriority(p: AnnouncementPriority): {
  priority: 'low' | 'normal' | 'high'
  is_pinned: boolean
} {
  switch (p) {
    case 'urgent':
      return { priority: 'high', is_pinned: false }
    case 'pinned':
      return { priority: 'normal', is_pinned: true }
    case 'fyi':
      return { priority: 'low', is_pinned: false }
    default:
      return { priority: 'normal', is_pinned: false }
  }
}

// Channel colors render BOTH as small text on light chips (#f1f5f9) and as
// chip backgrounds under white text, so each must clear 4.5:1 both ways.
// product/culture/remote/security were one shade too light (2.2-4.4:1, axe
// serious on /feed) — stepped each to the same hue one shade darker.
const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  company: '#4f46e5',
  product: '#0e7490', // was #06b6d4 (2.21:1); cyan-700 = 4.9:1 text / 5.4:1 inverse
  security: '#b91c1c', // was #dc2626 (4.4:1); red-700 = 5.9:1 text / 6.5:1 inverse
  people: '#7c3aed',
  culture: '#b45309', // was #d97706 (2.9:1); amber-700 = 4.6:1 text / 5.0:1 inverse
  remote: '#047857', // was #059669 (3.43:1); emerald-700 = 5.0:1 text / 5.5:1 inverse
  default: '#4f46e5',
}

export function categoryColor(c: ApiCategory | null | undefined): string {
  if (!c) return DEFAULT_CATEGORY_COLORS.default
  if (c.color && c.color !== '#0088cc' && c.color !== 'null') return c.color
  return DEFAULT_CATEGORY_COLORS[c.name?.toLowerCase() ?? ''] ?? DEFAULT_CATEGORY_COLORS.default
}

export function categorySlug(c: ApiCategory | null | undefined): string {
  if (!c) return 'general'
  return c.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'general'
}

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffSec = Math.round((t - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 60) return RTF.format(diffSec, 'second')
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86_400) return RTF.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 604_800) return RTF.format(Math.round(diffSec / 86_400), 'day')
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface AuthorIndex {
  byId: Record<string, ApiUser>
}

export function buildCardData(
  announcement: ApiAnnouncement,
  options: {
    categories: ApiCategory[]
    users: AuthorIndex
    ackCount?: number
    ackTotal?: number
    hasAcknowledged?: boolean
    commentCount?: number
    viewCount?: number
    unread?: boolean
  },
): AnnouncementCardData {
  const cat = options.categories.find((c) => c.id === announcement.category_id) ?? null
  const author = options.users.byId[announcement.author_id]
  const authorName =
    author?.name?.trim() ||
    author?.email?.split('@')[0] ||
    t('announcements.unknownAuthor', {}, { defaultValue: 'Unknown author' })
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    author: {
      name: authorName,
      role: undefined,
    },
    channel: {
      slug: categorySlug(cat),
      name: cat?.name ?? 'general',
      color: categoryColor(cat),
    },
    priority: toCardPriority(announcement),
    publishedAt: formatRelative(announcement.published_at ?? announcement.created_at),
    acknowledged: options.ackCount ?? 0,
    ackTotal: options.ackTotal ?? 0,
    hasAcknowledged: options.hasAcknowledged ?? false,
    commentCount: options.commentCount ?? 0,
    viewCount: options.viewCount,
    unread: options.unread,
  }
}
