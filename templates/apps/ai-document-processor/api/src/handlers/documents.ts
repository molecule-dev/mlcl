/**
 * Documents CRUD handler.
 *
 * The DB schema (see `migrations/0010_*` and `0011_*`) uses
 * `documents.title / doc_class / status / size_bytes / language / s3_key`,
 * but the React pages (Documents.tsx, DocumentDetail.tsx, Dashboard.tsx)
 * speak the language of `original_name / document_type / processing_status /
 * file_size / detected_language / preview_url`.
 *
 * Rather than rename DB columns mid-flight (which would invalidate any
 * existing scaffolded copies), this handler centralises the DB → API
 * adapter in `serializeDocument()`. The upload handler in `./upload.ts`
 * also uses it so the response shape is identical between the
 * "POST /api/documents/upload" reply and a subsequent
 * "GET /api/documents/:id" — that means the front-end never needs to
 * branch on whether it just uploaded or is rehydrating from the list.
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
  getProvider as getUploadProvider,
  hasProvider as hasUploadProvider,
} from '@molecule/api-uploads'

import type { AiDocumentProcessorLimits } from '../tiers.js'

const router = Router()

const ALLOWED_DOC_CLASSES = [
  'invoice',
  'receipt',
  'contract',
  'form',
  'report',
  'identification',
  'letter',
  'other',
] as const

const ALLOWED_STATUSES = [
  'uploaded',
  'ocring',
  'extracting',
  'classifying',
  'ready',
  'failed',
] as const

const ALLOWED_SOURCE_TYPES = ['upload', 'email', 'api'] as const

// SECURITY: neither the object-storage key (`s3_key`) nor the stored MIME
// type is accepted from the client. A client-chosen `s3_key` would let an
// attacker create a row they own that points at ANY object in the shared
// bucket — the row-ownership check on /raw and /download is then vacuous
// (they own the row AND chose its key), giving cross-tenant S3 reads (IDOR).
// A client-chosen `mime` was echoed back as the inline Content-Type on /raw,
// which is a stored-XSS vector (declare `text/html`, get it rendered in our
// origin). The key is always minted server-side; the real byte-upload flow
// (`POST /api/documents/upload`) creates the row with the provider-minted key
// and a server-observed MIME.
const createDocumentSchema = z.object({
  title: z.string().min(1),
  source_type: z.enum(ALLOWED_SOURCE_TYPES).default('upload'),
  size_bytes: z.number().int().nonnegative().optional(),
  doc_class: z.enum(ALLOWED_DOC_CLASSES).optional(),
  language: z.string().optional(),
  page_count: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  folder_id: z.string().uuid().optional(),
})

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  doc_class: z.enum(ALLOWED_DOC_CLASSES).optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  summary_md: z.string().optional(),
  language: z.string().optional(),
  page_count: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  classification_reasoning: z.string().optional(),
  suggested_filing_path: z.string().nullable().optional(),
})

const STATUS_TO_FRONTEND: Record<string, string> = {
  uploaded: 'pending',
  ocring: 'processing',
  extracting: 'processing',
  classifying: 'classified',
  ready: 'complete',
  failed: 'error',
}

const toJsonNumber = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : null
}

/**
 * Allowlist of MIME types we are willing to serve INLINE (rendered by the
 * browser in our origin). Everything else is forced to download.
 *
 * This is the security boundary for the serve path. The stored `mime` was
 * originally a client-declared value (now server-observed), but on serve we
 * still NEVER echo it blindly as an inline Content-Type — a declared
 * `text/html` / `image/svg+xml` would execute in our origin (stored XSS).
 * Only the raster image types below (which browsers cannot execute as
 * same-origin script) and PDF are allowed inline; each maps to the single
 * safe Content-Type we emit. Anything not listed is served as an opaque
 * `application/octet-stream` attachment so it can never run in our origin.
 */
const SAFE_INLINE_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
  'image/avif': 'image/avif',
  'image/heic': 'image/heic',
  'image/heif': 'image/heif',
  'image/tiff': 'image/tiff',
  'application/pdf': 'application/pdf',
}

/**
 * Decide how to serve a stored object safely. Returns the validated
 * Content-Type and disposition. For anything not on the safe-inline
 * allowlist we force `attachment` + `application/octet-stream` so it can
 * never be rendered/executed in our origin. `nosniff` is applied by the
 * caller unconditionally regardless of the choice here.
 *
 * @param storedMime - the document's stored MIME type
 * @param preferInline - whether the route would like to serve inline (only
 *   honored for allowlisted types)
 */
function resolveServe(
  storedMime: unknown,
  preferInline: boolean,
): { contentType: string; inline: boolean } {
  const mime = typeof storedMime === 'string' ? storedMime.toLowerCase().split(';')[0].trim() : ''
  const safe = SAFE_INLINE_CONTENT_TYPES[mime]
  if (preferInline && safe) {
    return { contentType: safe, inline: true }
  }
  // Off-allowlist (or download route): opaque type + forced attachment.
  return { contentType: 'application/octet-stream', inline: false }
}

/**
 * Convert a `documents` row (plus pre-fetched fields/events) into the
 * shape the React pages expect. Exported so the upload handler can
 * use the same adapter and present a consistent reply.
 */
export function serializeDocument(
  doc: Record<string, unknown>,
  fields: Record<string, unknown>[],
  events: Record<string, unknown>[],
): Record<string, unknown> {
  const status = String(doc.status ?? 'uploaded')
  const docClass = doc.doc_class as string | null
  const fileSize = toJsonNumber(doc.size_bytes)

  return {
    id: doc.id,
    original_name: (doc.original_name as string | null) ?? (doc.title as string | null) ?? null,
    title: doc.title ?? null,
    document_type: docClass ?? null,
    doc_class: docClass ?? null,
    processing_status: STATUS_TO_FRONTEND[status] ?? status,
    status,
    classification_confidence: toJsonNumber(doc.classification_confidence),
    classification_reasoning: (doc.classification_reasoning as string | null) ?? null,
    suggested_filing_path: (doc.suggested_filing_path as string | null) ?? null,
    detected_language: (doc.language as string | null) ?? null,
    language: (doc.language as string | null) ?? null,
    page_count: toJsonNumber(doc.page_count),
    file_size: fileSize,
    size_bytes: fileSize,
    source_type: doc.source_type ?? null,
    mime: (doc.mime as string | null) ?? null,
    s3_key: (doc.s3_key as string | null) ?? null,
    summary: (doc.summary_md as string | null) ?? null,
    summary_md: (doc.summary_md as string | null) ?? null,
    folder_id: doc.folder_id ?? null,
    tags: parseTags(doc.tags_json),
    download_url: doc.s3_key ? `/api/documents/${doc.id}/download` : null,
    preview_url: doc.s3_key ? `/api/documents/${doc.id}/raw` : null,
    extracted_fields: fields.map((f) => ({
      id: f.id,
      field_name: f.key,
      field_value: (f.corrected_value as string | null) ?? (f.value as string | null) ?? '',
      confidence: toJsonNumber(f.confidence) ?? 0,
      group: (f.field_group as string | null) ?? 'Other',
      reviewed: Boolean(f.reviewed),
    })),
    events: events.map((ev) => ({
      id: ev.id,
      event_type: ev.kind,
      kind: ev.kind,
      actor: ev.user_id ?? 'system',
      details: stringifyEventDetail(ev.detail_json),
      created_at: ev.created_at,
    })),
    uploaded_at: doc.uploaded_at ?? doc.created_at ?? null,
    processed_at: doc.processed_at ?? null,
    created_at: doc.created_at ?? null,
  }
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (_error) {
      // Not valid JSON; treat raw string as a single tag is not the intent — return empty
      return []
    }
  }
  return []
}

function stringifyEventDetail(detail: unknown): string {
  if (detail == null) return ''
  if (typeof detail === 'string') {
    try {
      const parsed = JSON.parse(detail)
      return summarizeEventDetail(parsed)
    } catch (_error) {
      // Not valid JSON; return the raw string as-is
      return detail
    }
  }
  return summarizeEventDetail(detail)
}

function summarizeEventDetail(detail: unknown): string {
  if (detail == null) return ''
  if (typeof detail !== 'object') return String(detail)
  const d = detail as Record<string, unknown>
  if (typeof d.error === 'string' && d.error.length) return `Error: ${d.error}`
  const friendly: string[] = []
  if (typeof d.document_type === 'string') {
    const conf = toJsonNumber(d.classification_confidence)
    friendly.push(
      `Classified as "${d.document_type}"${
        conf != null ? ` (${Math.round(conf * 100)}% confidence)` : ''
      }`,
    )
  }
  if (typeof d.field_count === 'number') friendly.push(`${d.field_count} fields extracted`)
  if (typeof d.summary_chars === 'number')
    friendly.push(`Summary written (${d.summary_chars} chars)`)
  if (typeof d.filename === 'string') friendly.push(`Uploaded "${d.filename}"`)
  if (typeof d.steps === 'object' && Array.isArray((d as { steps?: unknown[] }).steps)) {
    friendly.push(`Reprocess steps: ${(d as { steps: string[] }).steps.join(', ')}`)
  }
  if (typeof d.field_id === 'string') friendly.push(`Field corrected: ${d.key ?? d.field_id}`)
  return friendly.length > 0 ? friendly.join(' · ') : JSON.stringify(detail)
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const documents = (await findMany('documents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'uploaded_at', direction: 'desc' }],
    })) as Record<string, unknown>[]

    res.json(documents.map((doc) => serializeDocument(doc, [], [])))
  } catch (error) {
    logger.error('documents.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const id = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', id)
    if (!doc || doc.user_id !== userId) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    const fields = (await findMany('document_fields', {
      where: [{ field: 'document_id', operator: '=', value: id }],
      orderBy: [{ field: 'key', direction: 'asc' }],
    })) as Record<string, unknown>[]

    const events = (await findMany('document_events', {
      where: [{ field: 'document_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })) as Record<string, unknown>[]

    res.json(serializeDocument(doc, fields, events))
  } catch (error) {
    logger.error('documents.read', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post(
  '/',
  enforceLimit<AiDocumentProcessorLimits>({
    limitType: 'maxDocuments',
    getLimit: (limits) => limits.maxDocuments,
    getCurrent: async (userId) =>
      count('documents', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDocumentSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
      return
    }

    try {
      const body = req.body as z.infer<typeof createDocumentSchema>

      const result = await create('documents', {
        user_id: userId,
        title: body.title,
        original_name: body.title,
        source_type: body.source_type,
        // Server-derived only — never client values (see schema comment).
        mime: 'application/octet-stream',
        size_bytes: body.size_bytes ?? null,
        s3_key: crypto.randomUUID(),
        doc_class: body.doc_class ?? null,
        status: 'uploaded',
        language: body.language ?? null,
        page_count: body.page_count ?? null,
        tags_json: JSON.stringify(body.tags ?? []),
        folder_id: body.folder_id ?? null,
        uploaded_at: new Date(),
        created_at: new Date(),
      })

      const created = (result as { data?: Record<string, unknown> }).data ?? result
      const createdId = (created as { id?: string }).id
      if (createdId) {
        await create('document_events', {
          document_id: createdId,
          user_id: userId,
          kind: 'uploaded',
          detail_json: JSON.stringify({ source_type: body.source_type }),
          created_at: new Date(),
        })
      }

      res.status(201).json(serializeDocument(created as Record<string, unknown>, [], []))
    } catch (error) {
      logger.error('documents.create', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.put('/:id', validateBody(updateDocumentSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('documents', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    const body = req.body as z.infer<typeof updateDocumentSchema>
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) {
      updates.title = body.title
      updates.original_name = body.title
    }
    if (body.doc_class !== undefined) updates.doc_class = body.doc_class
    if (body.status !== undefined) updates.status = body.status
    if (body.summary_md !== undefined) updates.summary_md = body.summary_md
    if (body.language !== undefined) updates.language = body.language
    if (body.page_count !== undefined) updates.page_count = body.page_count
    if (body.tags !== undefined) updates.tags_json = JSON.stringify(body.tags)
    if (body.folder_id !== undefined) updates.folder_id = body.folder_id
    if (body.classification_reasoning !== undefined)
      updates.classification_reasoning = body.classification_reasoning
    if (body.suggested_filing_path !== undefined)
      updates.suggested_filing_path = body.suggested_filing_path

    const result = await updateById('documents', id, updates)
    const updated = ((result as { data?: Record<string, unknown> }).data ?? result) as Record<
      string,
      unknown
    >

    const fields = (await findMany('document_fields', {
      where: [{ field: 'document_id', operator: '=', value: id }],
      orderBy: [{ field: 'key', direction: 'asc' }],
    })) as Record<string, unknown>[]
    const events = (await findMany('document_events', {
      where: [{ field: 'document_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })) as Record<string, unknown>[]

    res.json(serializeDocument(updated, fields, events))
  } catch (error) {
    logger.error('documents.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('documents', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    if (existing.s3_key && hasUploadProvider()) {
      try {
        await getUploadProvider().deleteFile(String(existing.s3_key))
      } catch (err) {
        logger.error('documents.delete: s3 cleanup failed', err)
      }
    }

    await deleteById('documents', id)
    res.status(204).end()
  } catch (error) {
    logger.error('documents.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

/**
 * Stream the original uploaded file back to the client. Used for the
 * "Download" button in `DocumentDetail` and as the preview source for
 * images. Files are scoped to the current user.
 */
router.get('/:id/raw', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const id = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', id)
    if (!doc || doc.user_id !== userId || !doc.s3_key) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    if (!hasUploadProvider()) {
      res.status(503).json({ error: 'Upload provider unavailable.' })
      return
    }

    const stream = await getUploadProvider().getFile?.(String(doc.s3_key))
    if (!stream) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    // SECURITY: always nosniff (so the browser never sniffs bytes to
    // text/html — the stored-XSS vector) and never echo the stored MIME
    // inline. Only allowlisted raster/PDF types serve inline; everything
    // else is forced to download as opaque bytes. /raw prefers inline (it
    // backs the <img> preview), but the allowlist is the real gate.
    const { contentType, inline } = resolveServe(doc.mime, true)
    const filename = encodeURIComponent(String(doc.original_name ?? doc.title ?? 'document'))
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', contentType)
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    )
    stream.pipe(res)
  } catch (error) {
    logger.error('documents.raw', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id/download', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const id = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', id)
    if (!doc || doc.user_id !== userId || !doc.s3_key) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    if (!hasUploadProvider()) {
      res.status(503).json({ error: 'Upload provider unavailable.' })
      return
    }

    const stream = await getUploadProvider().getFile?.(String(doc.s3_key))
    if (!stream) {
      res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
      return
    }

    // SECURITY: downloads are ALWAYS a forced attachment with nosniff and an
    // opaque Content-Type — never the stored MIME inline — so a malicious
    // document can never be rendered/executed in our origin.
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(String(doc.original_name ?? doc.title ?? 'document'))}"`,
    )
    stream.pipe(res)
  } catch (error) {
    logger.error('documents.download', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
