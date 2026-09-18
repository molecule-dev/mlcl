/**
 * Files handler — file metadata CRUD plus star, trash, restore.
 *
 * Storage byte-streaming is intentionally NOT in this handler. Real
 * scaffolded apps mount `@molecule/api-uploads` middleware to handle
 * multipart streams and write to S3; here we expose JSON metadata
 * endpoints (the UI calls `POST /files` with `{ name, mime_type, size,
 * storage_key }` after the upload completes). E2E tests exercise the
 * metadata path against real Postgres; storage-side IO is covered by
 * the upload bond's own tests.
 *
 * @module
 */

import crypto from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
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

interface FileRow {
  id: string
  owner_id: string
  folder_id: string | null
  name: string
  storage_key: string
  mime_type: string
  size: number
  is_starred: boolean
  is_trashed: boolean
  trashed_at: Date | null
  version: number
  created_at: Date
  updated_at: Date
}

// Postgres returns the `size` bigint column as a STRING (pg leaves OID 20
// unparsed). Normalize it back to a JSON number at the response boundary so
// the wire shape matches the declared `FileRow.size: number` — without this,
// the frontend's formatSize() and the "POST back what you GET" round-trip both
// see a string. (stats.ts / storage.ts already Number()-coerce for the same
// reason.)
function normalizeFileRow<T extends { size?: unknown } | null | undefined>(row: T): T {
  if (row && row.size !== undefined && row.size !== null) {
    return { ...row, size: Number(row.size) }
  }
  return row
}

// SECURITY: the object-storage key is NEVER accepted from the client. A
// client-chosen `storage_key` would let an attacker create a row they own
// that points at ANY object in the shared bucket — the row-ownership check
// on download is then vacuous (they own the row AND chose its key), giving
// cross-tenant S3 reads (IDOR). The key is always minted server-side, and
// the real byte-upload flow (`POST /api/uploads`) creates the row itself
// with the provider-minted key + the authenticated owner.
const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(255).optional(),
  // `size` is coerced because the canonical client round-trip is "POST back what
  // GET returned": Postgres returns the `bigint` size column as a STRING (pg
  // leaves OID 20 unparsed), so /api/uploads + GET /api/files echo size as a
  // numeric string. z.coerce.number() accepts both that and a real JSON number
  // (the Upload page sends File.size) while still rejecting non-numeric input
  // and enforcing int + nonnegative.
  size: z.coerce.number().int().nonnegative(),
  folder_id: z.string().uuid().nullable().optional(),
})

const renameSchema = z.object({
  name: z.string().min(1).max(255),
})

const moveSchema = z.object({
  folder_id: z.string().uuid().nullable(),
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

    const { folder_id, starred, trash, sort_by, sort_order, q } = req.query

    const where: Array<{ field: string; operator: '=' | 'is_null' | 'ilike'; value?: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]

    if (trash === 'true') {
      where.push({ field: 'is_trashed', operator: '=', value: true })
    } else {
      where.push({ field: 'is_trashed', operator: '=', value: false })
      if (starred === 'true') {
        where.push({ field: 'is_starred', operator: '=', value: true })
      }
      if (folder_id) {
        where.push({ field: 'folder_id', operator: '=', value: String(folder_id) })
      } else if (folder_id === '') {
        where.push({ field: 'folder_id', operator: 'is_null' })
      }
    }

    const allowedSorts = new Set(['name', 'size', 'updated_at', 'created_at'])
    const field = allowedSorts.has(String(sort_by)) ? String(sort_by) : 'name'
    const direction = sort_order === 'desc' ? 'desc' : 'asc'

    const files = await findMany<FileRow>('files', {
      where,
      orderBy: [{ field, direction }],
    })

    // Optional case-insensitive substring filter — applied in-process
    // because the database adapter's where clause types vary across
    // providers and a `q=foo` query needs to work even when the SQL
    // driver doesn't expose `ilike` directly. The filtered set is
    // typically small (per-user library), so this is fine.
    const term = typeof q === 'string' ? q.trim().toLowerCase() : ''
    const filtered = term ? files.filter((f) => (f.name ?? '').toLowerCase().includes(term)) : files

    res.json(filtered.map(normalizeFileRow))
  } catch (error) {
    logger.error('files.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const file = await findById<FileRow>('files', id)
    if (!file || file.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    res.json({
      ...normalizeFileRow(file),
      download_path: `/api/files/${file.id}/download`,
    })
  } catch (err) {
    logger.error('[files.read]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const file = await findById<FileRow>('files', id)
    if (!file || file.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

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

    // [M4-2] nosniff: mime_type is client-declared, so stop the browser sniffing bytes into an
    // active type — parity with the sibling serve paths (ai-document-processor, photo-sharing) and
    // the upload-bond contract (its MIME blocklist is keyed on the spoofable declared type).
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')
    if (file.size) res.setHeader('Content-Length', String(file.size))
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`)
    stream.on('error', (err) => {
      logger.error('[files.download.stream]', err)
      if (!res.headersSent) res.status(500).end()
      else res.end()
    })
    stream.pipe(res)
  } catch (err) {
    logger.error('[files.download]', err)
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  }
})

router.post(
  '/',
  enforceLimit<CloudFileManagerLimits>({
    limitType: 'maxFiles',
    getLimit: (limits) => limits.maxFiles,
    getCurrent: async (userId) =>
      count('files', [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'is_trashed', operator: '=', value: false },
      ]),
  }) as unknown as RequestHandler,
  validateBody(createFileSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
        return
      }

      const { name, mime_type, size, folder_id } = req.body as z.infer<typeof createFileSchema>

      if (folder_id) {
        const folder = await findById<{ owner_id: string }>('folders', folder_id)
        if (!folder || folder.owner_id !== userId) {
          res
            .status(404)
            .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
          return
        }
      }

      const result = await create<FileRow>('files', {
        owner_id: userId,
        folder_id: folder_id ?? null,
        name,
        // Always server-minted — never a client value (see schema comment).
        storage_key: crypto.randomUUID(),
        mime_type: mime_type ?? 'application/octet-stream',
        size,
        is_starred: false,
        is_trashed: false,
        trashed_at: null,
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(normalizeFileRow(result.data))
    } catch (error) {
      logger.error('files.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.patch('/:id', validateBody(renameSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FileRow>('files', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    const result = await updateById<FileRow>('files', id, {
      name: (req.body as z.infer<typeof renameSchema>).name,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('files.rename', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/move', validateBody(moveSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FileRow>('files', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    const { folder_id } = req.body as z.infer<typeof moveSchema>
    if (folder_id) {
      const folder = await findById<{ owner_id: string }>('folders', folder_id)
      if (!folder || folder.owner_id !== userId) {
        res
          .status(404)
          .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
        return
      }
    }

    const result = await updateById<FileRow>('files', id, {
      folder_id: folder_id ?? null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('files.move', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/star', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FileRow>('files', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    const next = !existing.is_starred
    await updateById('files', id, { is_starred: next, updated_at: new Date() })
    res.json({ id, is_starred: next })
  } catch (error) {
    logger.error('files.star', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      return
    }

    const id = getParamId(req)
    const existing = await findById<FileRow>('files', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    const result = await updateById<FileRow>('files', id, {
      is_trashed: false,
      trashed_at: null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('files.restore', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

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
    const existing = await findById<FileRow>('files', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('file.notFound', {}, { defaultValue: 'File not found' }) })
      return
    }

    if (!existing.is_trashed) {
      // First delete = move to trash (soft).
      await updateById('files', id, {
        is_trashed: true,
        trashed_at: new Date(),
        updated_at: new Date(),
      })
      res.status(200).json({ id, is_trashed: true })
      return
    }

    // Already in trash → permanent delete. Best-effort scrub of S3 bytes —
    // a leftover S3 object would silently consume quota, but a failed
    // S3 call shouldn't keep the metadata row alive (the user expects
    // the file to be gone from their listing).
    if (hasUploadsProvider() && existing.storage_key) {
      try {
        await getUploadsProvider().deleteFile(existing.storage_key)
      } catch (err) {
        logger.warn('[files.delete] storage cleanup failed', err)
      }
    }
    await deleteById('files', id)
    res.status(204).end()
  } catch (err) {
    logger.error('[files.delete]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
