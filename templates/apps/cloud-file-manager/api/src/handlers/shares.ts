/**
 * File-share handler — owner-only create/list/revoke + a single
 * unauthenticated public-token route.
 *
 * The public route is mounted on a separate router exported from this
 * module so the consumer can wire it BEFORE auth middleware.
 *
 * @module
 */

import crypto from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import {
  getProvider as getUploadsProvider,
  hasProvider as hasUploadsProvider,
} from '@molecule/api-uploads'

import type { CloudFileManagerLimits } from '../tiers.js'

const router = Router()
export const publicRouter = Router()

interface ShareRow {
  id: string
  file_id: string
  token: string
  permission: 'view' | 'edit'
  created_by: string
  expires_at: Date | null
  created_at: Date
}

interface FileRow {
  id: string
  owner_id: string
  name: string
  mime_type: string
  size: number
  storage_key: string
  is_trashed: boolean
}

const createShareSchema = z.object({
  file_id: z.string().uuid(),
  permission: z.enum(['view', 'edit']).default('view'),
  expires_at: z.string().datetime().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const fileIdRaw = req.query.file_id
    const fileId = Array.isArray(fileIdRaw)
      ? String(fileIdRaw[0])
      : fileIdRaw
        ? String(fileIdRaw)
        : null

    if (fileId) {
      const file = await findById<FileRow>('files', fileId)
      if (!file || file.owner_id !== userId) {
        res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
        return
      }
      const shares = await findMany<ShareRow>('file_shares', {
        where: [{ field: 'file_id', operator: '=', value: fileId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      res.json(shares)
      return
    }

    // No file_id → return every share I've created.
    const shares = await findMany<ShareRow>('file_shares', {
      where: [{ field: 'created_by', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(shares)
  } catch (err) {
    logger.error('[shares.list]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<CloudFileManagerLimits>({
    limitType: 'maxShares',
    getLimit: (limits) => limits.maxShares,
    getCurrent: async (userId) =>
      count('file_shares', [{ field: 'created_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createShareSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
        return
      }

      const { file_id, permission, expires_at } = req.body as z.infer<typeof createShareSchema>

      const file = await findById<FileRow>('files', file_id)
      if (!file || file.owner_id !== userId) {
        res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
        return
      }

      const token = crypto.randomBytes(32).toString('hex')

      const result = await create<ShareRow>('file_shares', {
        file_id,
        token,
        permission,
        created_by: userId,
        expires_at: expires_at ? new Date(expires_at) : null,
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (err) {
      logger.error('[shares.create]', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<ShareRow>('file_shares', id)
    if (!existing || existing.created_by !== userId) {
      res.status(404).json({ error: t('share.notFound', {}, { defaultValue: 'Share not found' }) })
      return
    }

    await deleteById('file_shares', id)
    res.status(204).end()
  } catch (err) {
    logger.error('[shares.delete]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function resolveShareToken(
  token: string,
): Promise<{ file: FileRow; share: ShareRow } | null> {
  const share = await findOne<ShareRow>('file_shares', [
    { field: 'token', operator: '=', value: token },
  ])
  if (!share) return null
  if (share.expires_at && new Date(share.expires_at) < new Date()) return null
  const file = await findById<FileRow>('files', share.file_id)
  if (!file || file.is_trashed) return null
  return { file, share }
}

publicRouter.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token ?? '')
    const resolved = await resolveShareToken(token)
    if (!resolved) {
      res.status(404).json({
        error: t('share.notFound', {}, { defaultValue: 'Share link not found or expired' }),
      })
      return
    }
    const { file, share } = resolved
    res.json({
      file: { id: file.id, name: file.name, mime_type: file.mime_type, size: file.size },
      permission: share.permission,
      expires_at: share.expires_at,
      download_path: `/api/shares/public/${share.token}/download`,
    })
  } catch (err) {
    logger.error('[shares.public]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

publicRouter.get('/public/:token/download', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token ?? '')
    const resolved = await resolveShareToken(token)
    if (!resolved) {
      res.status(404).json({
        error: t('share.notFound', {}, { defaultValue: 'Share link not found or expired' }),
      })
      return
    }
    const { file } = resolved

    if (!hasUploadsProvider()) {
      res.status(503).json({
        error: t(
          'uploads.error.noProvider',
          {},
          { defaultValue: 'Upload provider not configured.' },
        ),
      })
      return
    }
    const provider = getUploadsProvider()
    if (!provider.getFile) {
      res.status(501).json({
        error: t(
          'uploads.error.noDownload',
          {},
          { defaultValue: 'Provider does not support downloads.' },
        ),
      })
      return
    }

    const stream = await provider.getFile(file.storage_key)
    if (!stream) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    // [M4-2] nosniff on the PUBLIC (unauthenticated) share download — mime_type is client-declared;
    // parity with the sibling serve paths + the upload-bond contract (blocklist is on the spoofable type).
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')
    if (file.size) res.setHeader('Content-Length', String(file.size))
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`)
    stream.on('error', (err) => {
      logger.error('[shares.public.download.stream]', err)
      if (!res.headersSent) res.status(500).end()
      else res.end()
    })
    stream.pipe(res)
  } catch (err) {
    logger.error('[shares.public.download]', err)
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  }
})

export default router
