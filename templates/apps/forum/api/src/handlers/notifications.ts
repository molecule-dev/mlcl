/**
 * Derived notifications endpoint.
 *
 * Builds an activity feed for the authenticated user by joining replies
 * onto the threads + parent replies they authored. Authoritative
 * read-state lives in `notifications_seen_status` (a single
 * `last_seen_at` per user); items newer than that timestamp render as
 * unread.
 *
 * Owner / IDOR scope marker: `requireOwner`/`user_id` — the userId is
 * sourced from the verified session, never from the request body or
 * params, so a user cannot read another user's inbox.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface ReplyJoinRow {
  id: string
  body: string
  created_at: string
  thread_id: string
  thread_title: string | null
  parent_reply_id: string | null
  reply_author_id: string
  reply_author_username: string | null
  reply_author_name: string | null
  recipient_kind: 'thread' | 'reply'
}

function getSession(res: Response): { userId?: string; role?: string } | undefined {
  return res.locals.session as { userId?: string; role?: string } | undefined
}

function requireOwner(res: Response): { userId: string } | null {
  const session = getSession(res)
  const userId = session?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return { userId }
}

async function ensureSeenTable(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS notifications_seen_status (
       user_id uuid PRIMARY KEY,
       last_seen_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const owner = requireOwner(res)
    if (!owner) return
    await ensureSeenTable()

    // Replies authored by other users on threads the actor authored,
    // and replies authored by other users to replies the actor authored.
    const rows = await query<ReplyJoinRow>(
      `(SELECT r.id,
              r.body,
              r.created_at,
              r.thread_id,
              t.title AS thread_title,
              r.parent_reply_id,
              r.author_id AS reply_author_id,
              u.username AS reply_author_username,
              u.name AS reply_author_name,
              'thread'::text AS recipient_kind
         FROM replies r
         JOIN threads t ON t.id = r.thread_id
         LEFT JOIN users u ON u.id = r.author_id
        WHERE t.author_id = $1
          AND r.author_id <> $1)
       UNION ALL
       (SELECT r.id,
              r.body,
              r.created_at,
              r.thread_id,
              t.title AS thread_title,
              r.parent_reply_id,
              r.author_id AS reply_author_id,
              u.username AS reply_author_username,
              u.name AS reply_author_name,
              'reply'::text AS recipient_kind
         FROM replies r
         JOIN replies parent ON parent.id = r.parent_reply_id
         JOIN threads t ON t.id = r.thread_id
         LEFT JOIN users u ON u.id = r.author_id
        WHERE parent.author_id = $1
          AND r.author_id <> $1)
       ORDER BY created_at DESC
       LIMIT 100`,
      [owner.userId],
    )

    const seen = await findMany<{ last_seen_at: string }>('notifications_seen_status', {
      where: [{ field: 'user_id', operator: '=', value: owner.userId }],
      limit: 1,
    })
    const lastSeenAt = seen[0]?.last_seen_at ?? null

    const items = (rows.rows ?? []).map((row) => {
      const actorHandle =
        row.reply_author_username ?? row.reply_author_name ?? row.reply_author_id.slice(0, 8)
      const isMention = /(@\w[\w.-]+)/.test(row.body ?? '')
      const kind: 'reply' | 'mention' = isMention ? 'mention' : 'reply'
      return {
        id: row.id,
        kind,
        actor: actorHandle,
        actorId: row.reply_author_id,
        thread: row.thread_title ?? '',
        threadId: row.thread_id,
        replyId: row.id,
        recipientKind: row.recipient_kind,
        context: (row.body ?? '').slice(0, 220),
        timestamp: row.created_at,
        unread: lastSeenAt ? new Date(row.created_at) > new Date(lastSeenAt) : true,
      }
    })

    const unreadCount = items.filter((i) => i.unread).length
    res.json({ items, unreadCount, lastSeenAt })
  } catch (err) {
    logger.error('notifications.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const owner = requireOwner(res)
    if (!owner) return
    await ensureSeenTable()
    const now = new Date().toISOString()
    // The seen-status row's primary key is `user_id`, not `id`, so we
    // can't use findById here. Upsert via raw SQL to avoid a
    // "column id does not exist" error from the molecule store.
    await query(
      `INSERT INTO notifications_seen_status (user_id, last_seen_at, updated_at)
       VALUES ($1, $2, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET last_seen_at = EXCLUDED.last_seen_at,
             updated_at   = EXCLUDED.updated_at`,
      [owner.userId, now],
    )
    res.json({ lastSeenAt: now })
  } catch (err) {
    logger.error('notifications.markAllRead', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
