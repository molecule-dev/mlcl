/**
 * Storage usage handler — total bytes used by the authenticated owner,
 * broken down by mime-type family (documents, images, video, archives,
 * code, other).
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
  size: number
  mime_type: string
  is_trashed: boolean
}

type Bucket = 'documents' | 'images' | 'videos' | 'archives' | 'code' | 'audio' | 'other'

function bucketFor(mime: string): Bucket {
  if (!mime) return 'other'
  if (mime.startsWith('image/')) return 'images'
  if (mime.startsWith('video/')) return 'videos'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime === 'application/zip' ||
    mime === 'application/x-tar' ||
    mime === 'application/x-7z-compressed' ||
    mime === 'application/gzip' ||
    mime === 'application/x-rar-compressed'
  )
    return 'archives'
  if (mime === 'application/pdf' || mime.startsWith('text/') || mime === 'application/rtf')
    return 'documents'
  if (
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime === 'application/typescript' ||
    mime === 'application/x-yaml'
  )
    return 'code'
  if (
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    mime.includes('opendocument')
  )
    return 'documents'
  return 'other'
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

    const files = await findMany<FileRow>('files', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'is_trashed', operator: '=', value: false },
      ],
    })

    const breakdown: Record<Bucket, number> = {
      documents: 0,
      images: 0,
      videos: 0,
      archives: 0,
      code: 0,
      audio: 0,
      other: 0,
    }
    let usedBytes = 0
    for (const f of files) {
      const size = Number(f.size ?? 0)
      usedBytes += size
      breakdown[bucketFor(f.mime_type)] += size
    }

    res.json({
      usedBytes,
      breakdown,
    })
  } catch (error) {
    logger.error('storage.usage', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
