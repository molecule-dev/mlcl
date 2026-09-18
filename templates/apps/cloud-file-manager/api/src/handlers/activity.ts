/**
 * Activity feed handler — derives a chronological list of recent file
 * touch-points for the authenticated user from the `files` and
 * `file_shares` tables (created_at / updated_at / share creation).
 *
 * No separate audit-log table; the activity feed is computed on the fly
 * so it stays consistent with the rest of the storage state without an
 * extra write path. Suitable for dashboard cards (top N entries).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface FileRow {
  id: string
  owner_id: string
  name: string
  mime_type: string
  size: number
  is_trashed: boolean
  trashed_at: Date | null
  created_at: Date
  updated_at: Date
}

interface ShareRow {
  id: string
  file_id: string
  created_by: string
  created_at: Date
  permission: string
}

type ActivityKind = 'edit' | 'share' | 'upload' | 'restore' | 'delete'

interface ActivityEntry {
  id: string
  kind: ActivityKind
  fileId: string
  fileName: string
  mimeType: string
  timestamp: string
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const limitRaw = Number(req.query.limit ?? 20)
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 20

    const [files, shares] = await Promise.all([
      findMany<FileRow>('files', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
      }),
      findMany<ShareRow>('file_shares', {
        where: [{ field: 'created_by', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
    ])

    const events: ActivityEntry[] = []

    for (const f of files) {
      const created = f.created_at ? new Date(f.created_at).getTime() : 0
      const updated = f.updated_at ? new Date(f.updated_at).getTime() : 0
      events.push({
        id: `upload-${f.id}`,
        kind: 'upload',
        fileId: f.id,
        fileName: f.name,
        mimeType: f.mime_type,
        timestamp: f.created_at ? new Date(f.created_at).toISOString() : new Date().toISOString(),
      })
      if (updated && updated > created + 1000) {
        events.push({
          id: `edit-${f.id}-${updated}`,
          kind: f.is_trashed ? 'delete' : 'edit',
          fileId: f.id,
          fileName: f.name,
          mimeType: f.mime_type,
          timestamp: new Date(updated).toISOString(),
        })
      }
    }

    for (const s of shares) {
      const f = files.find((file) => file.id === s.file_id)
      if (!f) continue
      events.push({
        id: `share-${s.id}`,
        kind: 'share',
        fileId: s.file_id,
        fileName: f.name,
        mimeType: f.mime_type,
        timestamp: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
      })
    }

    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    res.json({ data: events.slice(0, limit) })
  } catch (error) {
    logger.error('activity.feed', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
