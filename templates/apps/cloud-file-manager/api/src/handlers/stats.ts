/**
 * Stats / dashboard summary handler.
 *
 * Aggregates owner-scoped totals for the dashboard hero (`/files`) — file
 * counts, folder counts, distinct collaborators (file_shares.created_by),
 * and aggregate bytes used. Read-only, owner-only via session.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface FileRow {
  id: string
  owner_id: string
  size: number
  is_trashed: boolean
  is_starred: boolean
  mime_type: string
}

interface ShareRow {
  id: string
  file_id: string
  created_by: string
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const [totalFiles, totalFolders, starredFiles, files] = await Promise.all([
      count('files', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'is_trashed', operator: '=', value: false },
      ]),
      count('folders', [{ field: 'owner_id', operator: '=', value: userId }]),
      count('files', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'is_trashed', operator: '=', value: false },
        { field: 'is_starred', operator: '=', value: true },
      ]),
      findMany<FileRow>('files', {
        where: [
          { field: 'owner_id', operator: '=', value: userId },
          { field: 'is_trashed', operator: '=', value: false },
        ],
      }),
    ])

    // Distinct collaborators = unique created_by on shares of files I own.
    const myFileIds = new Set(files.map((f) => f.id))
    const collaboratorIds = new Set<string>()
    if (myFileIds.size > 0) {
      const shares = await findMany<ShareRow>('file_shares', { where: [] })
      for (const s of shares) {
        if (myFileIds.has(s.file_id) && s.created_by !== userId) {
          collaboratorIds.add(s.created_by)
        }
      }
    }

    const usedBytes = files.reduce((sum, f) => sum + Number(f.size ?? 0), 0)

    res.json({
      totalFiles,
      totalFolders,
      starredFiles,
      collaborators: collaboratorIds.size,
      usedBytes,
    })
  } catch (error) {
    logger.error('stats.summary', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
