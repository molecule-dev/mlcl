import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { chunkText, deleteChunksForDocument, indexDocumentChunks } from '../lib/chunking.js'
import { resolveRagSettings, type UserWithRag } from '../lib/rag-settings.js'
import type { RagKnowledgeBaseLimits } from '../tiers.js'

const router = Router()

/**
 * Express 5 auto-forwards a rejected handler to the error middleware (the
 * request still 500s), but nothing would LOG the failure with a domain tag.
 * This wrapper keeps the document endpoints' failures observable under the
 * fleet's `<domain>.<action>` logging convention.
 */
function logged(name: string, handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (error) {
      logger.error(name, error)
      next(error)
    }
  }
}

const ALLOWED_INGEST_STATUSES = ['pending', 'chunking', 'embedding', 'ready', 'failed'] as const

function deriveFileType(mime: string | null | undefined, title: string): string {
  if (!mime) {
    const ext = title.split('.').pop()?.toLowerCase() ?? ''
    if (['md', 'txt', 'pdf', 'docx', 'csv', 'html', 'json'].includes(ext)) return ext
    return 'txt'
  }
  if (mime.includes('markdown')) return 'md'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('html')) return 'html'
  if (mime.includes('csv')) return 'csv'
  if (mime.includes('json')) return 'json'
  if (mime.startsWith('text/')) return 'txt'
  return 'txt'
}

function shape(doc: Record<string, unknown>, chunkCount?: number): Record<string, unknown> {
  return {
    ...doc,
    file_type: deriveFileType(doc.mime as string | null, String(doc.title ?? '')),
    chunk_count: chunkCount ?? (doc.chunk_count as number | null) ?? 0,
    status: doc.ingest_status,
  }
}

const createDocumentSchema = z.object({
  title: z.string().min(1),
  collection_id: z.string().uuid().optional(),
  source_id: z.string().uuid().optional(),
  body_md: z.string().optional(),
  source_url: z.string().url().optional(),
  mime: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  // NOTE: `s3_key` is NOT accepted from the client. A client-chosen object key
  // defeats server-minted UUID keys — a future document download/preview route
  // streaming getFile(<client key>) would let one user address another user's
  // object (cross-tenant read IDOR). The key must be minted server-side when an
  // upload-receipt flow is added; until then a document carries no s3_key.
  page_count: z.number().int().positive().optional(),
})

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  body_md: z.string().optional(),
  ingest_status: z.enum(ALLOWED_INGEST_STATUSES).optional(),
  collection_id: z.string().uuid().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  page_count: z.number().int().positive().optional(),
})

router.get(
  '/',
  logged('documents.list', async (_req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const documents = await findMany<Record<string, unknown>>('documents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(documents.map((d) => shape(d)))
  }),
)

router.get(
  '/:id',
  logged('documents.get', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', id)
    if (!doc || doc.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }

    const chunks = await findMany('document_chunks', {
      where: [{ field: 'document_id', operator: '=', value: id }],
      orderBy: [{ field: 'chunk_index', direction: 'asc' }],
    })

    res.json({ ...shape(doc, chunks.length), chunks })
  }),
)

/**
 * Create a document from JSON body. Used both directly and as the
 * persistence layer for the multipart upload route below. When
 * `body_md` is non-empty we synchronously chunk + index the text into
 * `document_chunks` so the very first /qa/ask after creation can
 * retrieve from it (no background queue needed at this scale).
 */
router.post(
  '/',
  enforceLimit<RagKnowledgeBaseLimits>({
    limitType: 'maxDocuments',
    getLimit: (limits) => limits.maxDocuments,
    getCurrent: async (userId) =>
      count('documents', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDocumentSchema),
  logged('documents.create', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createDocumentSchema>
    const text = (body.body_md ?? '').trim()
    // Honor the user's stored chunk size (Settings → oauthData.rag.chunkSize); ingest hardcoded 350
    // words, so changing it did nothing.
    const chunkUser = await findById<UserWithRag>('users', userId)
    const { chunkSize, chunkOverlap } = resolveRagSettings(chunkUser)
    const chunks = text ? chunkText(text, chunkSize, chunkOverlap) : []
    const now = new Date()
    const result = await create('documents', {
      user_id: userId,
      collection_id: body.collection_id ?? null,
      source_id: body.source_id ?? null,
      title: body.title,
      body_md: body.body_md ?? null,
      source_url: body.source_url ?? null,
      mime: body.mime ?? null,
      size_bytes: body.size_bytes ?? (text ? Buffer.byteLength(text, 'utf8') : null),
      // Storage key is never taken from the client (cross-tenant read IDOR);
      // minted server-side only when an upload-receipt flow exists.
      s3_key: null,
      page_count: body.page_count ?? null,
      chunk_count: chunks.length,
      ingest_status: chunks.length ? 'ready' : 'pending',
      created_at: now,
      updated_at: now,
    })
    const created = ((result as { data?: Record<string, unknown> }).data ?? result) as Record<
      string,
      unknown
    >
    const documentId = String(created.id)
    if (chunks.length) {
      await indexDocumentChunks(documentId, userId, chunks)
    }
    res.status(201).json(shape(created, chunks.length))
  }),
)

router.put(
  '/:id',
  validateBody(updateDocumentSchema),
  logged('documents.update', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('documents', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateDocumentSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.title !== undefined) updates.title = body.title
    if (body.body_md !== undefined) updates.body_md = body.body_md
    if (body.ingest_status !== undefined) updates.ingest_status = body.ingest_status
    if (body.collection_id !== undefined) updates.collection_id = body.collection_id
    if (body.source_url !== undefined) updates.source_url = body.source_url
    if (body.page_count !== undefined) updates.page_count = body.page_count

    // If body_md changed, re-chunk + reindex synchronously so the next
    // /qa/ask reflects the edit.
    let chunkCount: number | undefined
    if (body.body_md !== undefined) {
      await deleteChunksForDocument(id)
      const text = body.body_md.trim()
      const chunkUser = await findById<UserWithRag>('users', userId)
      const { chunkSize, chunkOverlap } = resolveRagSettings(chunkUser)
      const chunks = text ? chunkText(text, chunkSize, chunkOverlap) : []
      if (chunks.length) {
        await indexDocumentChunks(id, userId, chunks)
      }
      chunkCount = chunks.length
      updates.chunk_count = chunkCount
      updates.ingest_status = chunkCount ? 'ready' : 'pending'
    }

    const result = await updateById('documents', id, updates)
    const updated = ((result as { data?: Record<string, unknown> }).data ?? result) as Record<
      string,
      unknown
    >
    res.json(shape(updated, chunkCount))
  }),
)

router.delete(
  '/:id',
  logged('documents.delete', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('documents', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }
    await deleteChunksForDocument(id)
    await deleteById('documents', id)
    res.status(204).end()
  }),
)

export default router
