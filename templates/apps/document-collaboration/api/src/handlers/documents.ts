/**
 * Document handlers — owner-scoped CRUD with optional Meilisearch indexing.
 *
 * Authorisation: `requireOwnedDocument` / `requireReadableDocument` /
 * `requireRole('editor')` walk the chain so non-owners can read/edit
 * shared documents but cannot delete them. The trash flow soft-deletes
 * by setting `trashed_at`; permanent delete drops the row.
 *
 * `PUT /documents/:id` is also responsible for snapshotting the
 * pre-update body into `document_versions` (append-only). Restore from
 * version is in `versions.ts`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentRow,
  internalError,
  requireOwnedDocument,
  requireReadableDocument,
  requireRole,
  requireUser,
  safeBroadcast,
  validationError,
} from '../lib/authz.js'
import type { DocumentCollaborationLimits } from '../tiers.js'
import { seedDemoForUser, seedSystemTemplatesIfEmpty } from './_seed.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listSchema = z.object({
  search: z.string().min(1).max(255).optional(),
  include_trashed: z.string().optional(),
  is_template: z.string().optional(),
})

const createSchema = z.object({
  title: z.string().max(1000).optional(),
  content: z.unknown().optional(),
  template_id: z.string().uuid().nullable().optional(),
  is_template: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

const updateSchema = z.object({
  title: z.string().max(1000).optional(),
  content: z.unknown().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  change_summary: z.string().max(500).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    await seedSystemTemplatesIfEmpty()
    await seedDemoForUser(ownerId)
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
    if (parsed.data.is_template === 'true') {
      where.push({ field: 'is_template', operator: '=', value: true })
    } else if (parsed.data.is_template === 'false') {
      where.push({ field: 'is_template', operator: '=', value: false })
    }
    if (parsed.data.include_trashed !== 'true') {
      where.push({ field: 'trashed_at', operator: 'is_null' })
    }
    let items = await findMany<DocumentRow>('documents', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 200,
    })
    if (parsed.data.search) {
      // In-memory title/body filter scoped to the owner's documents — keeps
      // search functional without a hard runtime dep on the meilisearch bond
      // being reachable in CI.
      const needle = parsed.data.search.toLowerCase()
      items = items.filter(
        (d) =>
          (d.title ?? '').toLowerCase().includes(needle) ||
          JSON.stringify(d.content ?? {})
            .toLowerCase()
            .includes(needle),
      )
    }
    res.json(items)
  } catch (error) {
    logger.error('documents.list', error)
    internalError(res)
  }
})

router.get('/trash', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<DocumentRow>('documents', {
      where: [
        { field: 'owner_id', operator: '=', value: ownerId },
        { field: 'trashed_at', operator: 'is_not_null' },
      ],
      orderBy: [{ field: 'trashed_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (error) {
    logger.error('documents.trash', error)
    internalError(res)
  }
})

router.get('/shared', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const shares = await findMany<{ document_id: string; role: string }>('document_shares', {
      where: [{ field: 'shared_with_user_id', operator: '=', value: ownerId }],
    })
    if (shares.length === 0) {
      res.json([])
      return
    }
    const docs = await findMany<DocumentRow>('documents', {
      where: [{ field: 'id', operator: 'in', value: shares.map((s) => s.document_id) }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    const roleByDoc = new Map(shares.map((s) => [s.document_id, s.role]))
    res.json(
      docs
        .filter((d) => d.trashed_at === null)
        .map((d) => ({ ...d, share_role: roleByDoc.get(d.id) ?? 'viewer' })),
    )
  } catch (error) {
    logger.error('documents.shared', error)
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
    const access = await requireReadableDocument(id.data.id, ownerId)
    if (!access) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    res.json({ ...access.document, share_role: access.role })
  } catch (error) {
    logger.error('documents.get', error)
    internalError(res)
  }
})

// Enforce the per-tier document cap (tiers.ts maxDocuments) — defined + shown on
// Pricing but enforceLimit was never called, so any tier could create unlimited
// documents. Counts only active (non-trashed) documents the user owns.
const enforceDocumentLimit = enforceLimit<DocumentCollaborationLimits>({
  limitType: 'maxDocuments',
  getLimit: (limits) => limits.maxDocuments,
  getCurrent: async (userId) =>
    count('documents', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'trashed_at', operator: 'is_null' },
    ]),
}) as unknown as RequestHandler

router.post('/', enforceDocumentLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<DocumentRow>('documents', {
      owner_id: ownerId,
      template_id: parsed.data.template_id ?? null,
      title:
        parsed.data.title ?? t('documents.untitled', {}, { defaultValue: 'Untitled Document' }),
      content: (parsed.data.content as Record<string, unknown> | undefined) ?? {},
      status: parsed.data.status ?? 'draft',
      is_template: parsed.data.is_template ?? false,
      version: 1,
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

router.put('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const access = await requireRole(id.data.id, ownerId, 'editor')
    if (!access) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const previous = access.document
    // Snapshot pre-update body BEFORE mutating — append-only history.
    await create('document_versions', {
      document_id: previous.id,
      author_id: ownerId,
      content: previous.content,
      version: previous.version,
      change_summary: body.data.change_summary ?? '',
      created_at: new Date(),
    })
    const result = await updateById<DocumentRow>('documents', id.data.id, {
      title: body.data.title ?? previous.title,
      content:
        body.data.content === undefined
          ? previous.content
          : (body.data.content as Record<string, unknown>),
      status: body.data.status ?? previous.status,
      version: previous.version + 1,
      updated_at: new Date(),
    })
    await safeBroadcast(`document:${id.data.id}`, 'document:updated', {
      id: id.data.id,
      version: previous.version + 1,
      author_id: ownerId,
    })
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
    const access = await requireReadableDocument(id.data.id, ownerId)
    if (!access) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const original = access.document
    const result = await create<DocumentRow>('documents', {
      owner_id: ownerId,
      template_id: original.template_id,
      title: `${original.title} (${t('documents.copy', {}, { defaultValue: 'Copy' })})`,
      content: original.content,
      status: 'draft',
      is_template: false,
      version: 1,
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
    const doc = await requireOwnedDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
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
    const doc = await requireOwnedDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
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
    const doc = await requireOwnedDocument(id.data.id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    await deleteById('documents', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('documents.delete', error)
    internalError(res)
  }
})

export default router
