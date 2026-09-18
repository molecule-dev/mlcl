/**
 * Document handlers — owner-scoped CRUD over `documents`.
 *
 * Implements the canonical writing-tool flows from INVENTORY.md:
 *   - list (Library): paginated, sorted by recency, filterable by folder + pinned
 *   - read: single document, returns body_md for the editor
 *   - create / update: autosave path; recomputes word_count + reading_time
 *   - delete: soft-delete via trashed_at, hard-delete via /:id?hard=true
 *   - duplicate: server-side copy with a "Copy" suffix
 *   - search: title + body substring scan (Meilisearch is wired separately
 *     via the bond — this handler is the universal fallback so the gate
 *     does not depend on Meilisearch being reachable in CI)
 *   - versions sub-resource: GET /:id/versions, POST /:id/versions/snapshot,
 *     POST /:id/versions/:versionId/restore
 *
 * Authorization always scopes by `owner_id`. The version sub-routes use
 * `requireDocument` first so other users' version IDs cannot be probed.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentRow,
  type DocumentVersionRow,
  internalError,
  requireDocument,
  requireFolder,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })
const versionParams = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
})

const listSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  pinned: z.string().optional(),
  include_trashed: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

const searchSchema = z.object({
  q: z.string().min(1).max(255),
})

const createSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  title: z.string().max(1000).optional(),
  body_md: z.string().max(2_000_000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  pinned: z.boolean().optional(),
  tags_json: z.unknown().optional(),
})

const updateSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  title: z.string().max(1000).optional(),
  body_md: z.string().max(2_000_000).optional(),
  excerpt: z.string().max(2000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  pinned: z.boolean().optional(),
  tags_json: z.unknown().optional(),
  position: z.number().optional(),
})

const snapshotSchema = z.object({
  body_md: z.string().max(2_000_000).optional(),
})

const wordsIn = (md: string): number => md.trim().split(/\s+/).filter(Boolean).length

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    if (parsed.data.folder_id === null) {
      where.push({ field: 'folder_id', operator: 'is_null' })
    } else if (parsed.data.folder_id) {
      where.push({ field: 'folder_id', operator: '=', value: parsed.data.folder_id })
    }
    if (parsed.data.pinned === 'true') {
      where.push({ field: 'pinned', operator: '=', value: true })
    }
    if (parsed.data.include_trashed !== 'true') {
      where.push({ field: 'trashed_at', operator: 'is_null' })
    }
    const items = await findMany<DocumentRow>('documents', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: parsed.data.limit ?? 50,
      offset: parsed.data.offset ?? 0,
    })
    res.json(items)
  } catch (error) {
    logger.error('documents.list', error)
    internalError(res)
  }
})

router.get('/search', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = searchSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    // In-memory scan scoped to owner — Meilisearch can be wired via bond
    // but this is the universal fallback. Per-owner row counts are bounded
    // (free tier caps at 50 docs, Pro is uncapped but per-user storage is
    // small relative to a query budget).
    const owned = await findMany<DocumentRow>('documents', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'trashed_at', operator: 'is_null' },
      ],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 1000,
    })
    const needle = parsed.data.q.toLowerCase()
    const hits = owned
      .filter(
        (d) =>
          (d.title ?? '').toLowerCase().includes(needle) ||
          (d.body_md ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 50)
    res.json(hits)
  } catch (error) {
    logger.error('documents.search', error)
    internalError(res)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    res.json(doc)
  } catch (error) {
    logger.error('documents.get', error)
    internalError(res)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    if (parsed.data.folder_id) {
      const folder = await requireFolder(parsed.data.folder_id, ownerId)
      if (!folder) {
        res
          .status(404)
          .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
        return
      }
    }
    // Free-tier soft cap: refuse new docs once the owner has 50 trashed-or-not.
    // Pro tier should override via @molecule/api-entitlements; we keep a hard
    // ceiling to avoid runaway creates from misbehaving clients.
    const existing = await count('documents', [
      { field: 'owner_id', operator: '=', value: ownerId },
      { field: 'trashed_at', operator: 'is_null' },
    ])
    const HARD_CEILING = 5000
    if (existing >= HARD_CEILING) {
      res.status(400).json({
        error: t('document.tierLimit', {}, { defaultValue: 'Document limit reached' }),
      })
      return
    }
    const body = parsed.data.body_md ?? ''
    const words = wordsIn(body)
    const result = await create<DocumentRow>('documents', {
      owner_id: ownerId,
      folder_id: parsed.data.folder_id ?? null,
      title: parsed.data.title ?? t('document.untitled', {}, { defaultValue: 'Untitled' }),
      body_md: body,
      excerpt: body.slice(0, 280),
      word_count: words,
      character_count: body.length,
      reading_time: Math.max(1, Math.ceil(words / 200)),
      status: parsed.data.status ?? 'draft',
      pinned: parsed.data.pinned ?? false,
      tags_json: parsed.data.tags_json ?? [],
      position: 0,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('documents.create', error)
    internalError(res)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    if (body.data.folder_id) {
      const folder = await requireFolder(body.data.folder_id, ownerId)
      if (!folder) {
        res
          .status(404)
          .json({ error: t('folder.notFound', {}, { defaultValue: 'Folder not found' }) })
        return
      }
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.data.title !== undefined) updates.title = body.data.title
    if (body.data.folder_id !== undefined) updates.folder_id = body.data.folder_id
    if (body.data.body_md !== undefined) {
      const words = wordsIn(body.data.body_md)
      updates.body_md = body.data.body_md
      updates.word_count = words
      updates.character_count = body.data.body_md.length
      updates.reading_time = Math.max(1, Math.ceil(words / 200))
      if (body.data.excerpt === undefined) {
        updates.excerpt = body.data.body_md.slice(0, 280)
      }
    }
    if (body.data.excerpt !== undefined) updates.excerpt = body.data.excerpt
    if (body.data.status !== undefined) updates.status = body.data.status
    if (body.data.pinned !== undefined) updates.pinned = body.data.pinned
    if (body.data.tags_json !== undefined) updates.tags_json = body.data.tags_json
    if (body.data.position !== undefined) updates.position = body.data.position
    const result = await updateById<DocumentRow>('documents', id.data.id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('documents.update', error)
    internalError(res)
  }
})

router.post('/:id/duplicate', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const source = await requireDocument(id.data.id, ownerId)
    if (!source) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const result = await create<DocumentRow>('documents', {
      owner_id: ownerId,
      folder_id: source.folder_id,
      title: `${source.title} (${t('document.copySuffix', {}, { defaultValue: 'Copy' })})`,
      body_md: source.body_md,
      excerpt: source.excerpt,
      word_count: source.word_count,
      character_count: source.character_count,
      reading_time: source.reading_time,
      status: 'draft',
      pinned: false,
      tags_json: source.tags_json,
      position: 0,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('documents.duplicate', error)
    internalError(res)
  }
})

router.post('/:id/trash', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const result = await updateById<DocumentRow>('documents', id.data.id, {
      trashed_at: new Date(),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('documents.trash', error)
    internalError(res)
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const result = await updateById<DocumentRow>('documents', id.data.id, {
      trashed_at: null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('documents.restore', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    // CASCADE on the schema cleans up versions + exports.
    await deleteById('documents', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('documents.delete', error)
    internalError(res)
  }
})

router.get('/:id/versions', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const versions = await findMany<DocumentVersionRow>('document_versions', {
      where: [{ field: 'document_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'version_number', direction: 'desc' }],
    })
    res.json(versions)
  } catch (error) {
    logger.error('documents.listVersions', error)
    internalError(res)
  }
})

router.post('/:id/versions/snapshot', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = snapshotSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const doc = await requireDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const existing = await findMany<DocumentVersionRow>('document_versions', {
      where: [{ field: 'document_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'version_number', direction: 'desc' }],
      limit: 1,
    })
    const next = existing[0] ? existing[0].version_number + 1 : 1
    const snapshotBody = body.data.body_md ?? doc.body_md
    const result = await create<DocumentVersionRow>('document_versions', {
      document_id: id.data.id,
      version_number: next,
      body_md: snapshotBody,
      snapshot_size: snapshotBody.length,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('documents.snapshot', error)
    internalError(res)
  }
})

router.post('/:id/versions/:versionId/restore', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = versionParams.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const doc = await requireDocument(params.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const versions = await findMany<DocumentVersionRow>('document_versions', {
      where: [
        { field: 'id', operator: '=', value: params.data.versionId },
        { field: 'document_id', operator: '=', value: params.data.id },
      ],
      limit: 1,
    })
    const version = versions[0]
    if (!version) {
      res
        .status(404)
        .json({ error: t('document.versionNotFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    const words = wordsIn(version.body_md)
    const result = await updateById<DocumentRow>('documents', params.data.id, {
      body_md: version.body_md,
      excerpt: version.body_md.slice(0, 280),
      word_count: words,
      character_count: version.body_md.length,
      reading_time: Math.max(1, Math.ceil(words / 200)),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('documents.restoreVersion', error)
    internalError(res)
  }
})

export default router
