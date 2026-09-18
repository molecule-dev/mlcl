/**
 * Notifications handler — synthesises an activity feed for the caller from
 * real persisted events on their owned recordings (comments + views) plus
 * any pending workspace invites. There is no separate notifications table
 * because every entry derives from data the user already created or
 * received via the other handlers.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const toIsoDate = (raw: unknown): string => {
  if (raw instanceof Date) return raw.toISOString()
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

interface NotificationItem {
  id: string
  kind: 'comment' | 'view' | 'invite'
  actor: string
  actor_initials: string
  recording_id: string | null
  recording_title: string | null
  excerpt: string | null
  created_at: string
  unread: boolean
  link: string | null
}

const initialOf = (label: string | null | undefined): string => {
  const text = (label ?? '').trim()
  if (!text) return '?'
  const parts = text.split(/[\s_@.-]+/).filter(Boolean)
  if (parts.length === 0) return text.slice(0, 1).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const router = Router()

router.use(requireAuth)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string

    // Fetch ID set of the caller's recordings up-front so we don't pull
    // every comment in the system. recording_comments / recording_views
    // already carry owner_id so we filter by that directly.
    const ownedRecordings = await findMany<Record<string, unknown>>('recordings', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    const titleById = new Map<string, string>()
    for (const rec of ownedRecordings) {
      titleById.set(String(rec.id), String(rec.title ?? 'Untitled recording'))
    }

    const comments = await findMany<Record<string, unknown>>('recording_comments', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    const views = await findMany<Record<string, unknown>>('recording_views', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })

    let invites: Record<string, unknown>[] = []
    try {
      invites = await findMany<Record<string, unknown>>('workspace_members', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'invited_by', operator: '!=', value: userId },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 50,
      })
    } catch (_error) {
      // invited_by may not exist on legacy schemas — ignore and proceed with empty invites
    }

    // Resolve actor display names from the users table
    const actorIds = new Set<string>()
    for (const c of comments) {
      const uid = String(c.user_id ?? '')
      if (uid && uid !== userId) actorIds.add(uid)
    }
    for (const v of views) {
      const uid = String(v.viewer_user_id ?? '')
      if (uid && uid !== userId) actorIds.add(uid)
    }
    for (const inv of invites) {
      const uid = String(inv.invited_by ?? '')
      if (uid && uid !== userId) actorIds.add(uid)
    }
    const nameById = new Map<string, string>()
    if (actorIds.size > 0) {
      try {
        const users = await findMany<Record<string, unknown>>('users', {
          where: [{ field: 'id', operator: 'in', value: Array.from(actorIds) }],
          limit: actorIds.size,
        })
        for (const u of users) {
          const id = String(u.id ?? '')
          const display = String(u.name ?? u.email ?? '').trim()
          if (id && display) nameById.set(id, display)
        }
      } catch (_error) {
        // user name lookup failed — actor display falls back to id
      }
    }

    const items: NotificationItem[] = []

    for (const c of comments) {
      const recordingId = String(c.recording_id ?? '')
      const authorId = String(c.user_id ?? '')
      // hide self-authored notifications — they're not useful to the owner
      if (authorId === userId) continue
      const actor = String(c.name ?? nameById.get(authorId) ?? authorId ?? 'Someone')
      items.push({
        id: `comment:${String(c.id)}`,
        kind: 'comment',
        actor,
        actor_initials: initialOf(actor),
        recording_id: recordingId || null,
        recording_title: recordingId ? (titleById.get(recordingId) ?? null) : null,
        excerpt: typeof c.content === 'string' ? c.content.slice(0, 240) : null,
        created_at: toIsoDate(c.created_at),
        unread: true,
        link: recordingId ? `/recordings/${recordingId}` : null,
      })
    }

    for (const v of views) {
      const recordingId = String(v.recording_id ?? '')
      const viewerId = String(v.viewer_user_id ?? '')
      if (viewerId === userId) continue
      const actor = String(v.viewer_email ?? nameById.get(viewerId) ?? viewerId ?? 'A viewer')
      items.push({
        id: `view:${String(v.id)}`,
        kind: 'view',
        actor,
        actor_initials: initialOf(actor),
        recording_id: recordingId || null,
        recording_title: recordingId ? (titleById.get(recordingId) ?? null) : null,
        excerpt: null,
        created_at: toIsoDate(v.created_at),
        unread: true,
        link: recordingId ? `/recordings/${recordingId}` : null,
      })
    }

    for (const inv of invites) {
      const inviterId = String(inv.invited_by ?? '')
      const inviter = nameById.get(inviterId) ?? inviterId ?? 'A teammate'
      items.push({
        id: `invite:${String(inv.id)}`,
        kind: 'invite',
        actor: inviter,
        actor_initials: initialOf(inviter),
        recording_id: null,
        recording_title: null,
        excerpt: null,
        created_at: toIsoDate(inv.created_at),
        unread: true,
        link: '/team',
      })
    }

    items.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))

    res.json(items)
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({
      error: t('notifications.listError', undefined, {
        defaultValue: 'Failed to load notifications',
      }),
    })
  }
})

export default router
