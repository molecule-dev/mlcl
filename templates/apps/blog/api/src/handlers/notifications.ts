import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

/**
 * Notifications endpoint — surfaces a unified feed of moderation, engagement
 * and account events derived from existing tables (comments, reactions,
 * bookmarks). The blog app does not have a dedicated `notifications` table;
 * we synthesise a feed on demand so the UI has real, server-derived rows
 * even on a fresh install.
 *
 * Strictly scoped to the current user: only surfaces events that targeted
 * one of the user's own posts (i.e. comments, reactions, and bookmarks
 * whose `resourceId` references a post owned by the authenticated user).
 * Self-actions (commenting/reacting/bookmarking on your own post) are
 * excluded so the feed reflects activity from other users only.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    type Row = {
      id: string
      createdAt: string
      body: string | null
      type: string | null
      resourceType: string
      resourceId: string
      kind: 'comment' | 'reaction' | 'bookmark'
    }

    const sql = `
      SELECT c.id::text AS id, c."createdAt" AS "createdAt", c.body, NULL::text AS type,
             c."resourceType" AS "resourceType", c."resourceId" AS "resourceId", 'comment' AS kind
        FROM comments c JOIN posts p ON p.id::text = c."resourceId"
       WHERE p.author_id = $1 AND c."userId" <> $1
      UNION ALL
      SELECT r.id::text, r."createdAt", NULL::text, r.type::text,
             r."resourceType", r."resourceId", 'reaction'
        FROM reactions r JOIN posts p ON p.id::text = r."resourceId"
       WHERE p.author_id = $1 AND r."userId" <> $1
      UNION ALL
      SELECT b.id::text, b."createdAt", NULL::text, NULL::text,
             b."resourceType", b."resourceId", 'bookmark'
        FROM bookmarks b JOIN posts p ON p.id::text = b."resourceId"
       WHERE p.author_id = $1 AND b."userId" <> $1
       ORDER BY "createdAt" DESC
       LIMIT 20
    `
    const result = await query<Row>(sql, [userId]).catch(() => null)
    const rows: Row[] = result?.rows ?? []
    const items = rows.map((row) => ({
      id: `${row.kind}:${row.id}`,
      kind: row.kind,
      body: row.body ?? undefined,
      type: row.type ?? undefined,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      createdAt: row.createdAt,
    }))
    res.json({ data: items, total: items.length })
  } catch (error) {
    logger.error('notifications.list failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
