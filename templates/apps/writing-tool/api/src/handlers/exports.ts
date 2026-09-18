/**
 * Export handlers — list + create + download export artifacts.
 *
 * Each row in `document_exports` records one user-requested export. We
 * render the artifact synchronously at POST time (these are
 * page-of-text exports, not multi-megabyte binaries) and return the
 * content inline so the browser can immediately deliver a real
 * `<a download>`. The row is also marked `status='completed'` so the
 * audit trail is honest about what happened.
 *
 * Authorization scopes by walking back to the owning document — never by
 * direct id, so no IDOR.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentExportRow,
  type DocumentRow,
  internalError,
  requireDocument,
  requireExport,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

// `document_id` is optional so the UI can show a per-user "all exports"
// audit trail without picking a specific document first.
const listSchema = z.object({
  document_id: z.string().uuid().optional(),
})

type ExportFormat = 'md' | 'txt' | 'html'

const createSchema = z.object({
  document_id: z.string().uuid(),
  format: z.enum(['md', 'txt', 'html']).optional(),
})

const FORMAT_CONTENT_TYPE: Record<ExportFormat, string> = {
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8',
}

const FORMAT_EXTENSION: Record<ExportFormat, string> = {
  md: 'md',
  txt: 'txt',
  html: 'html',
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const stripMarkdown = (md: string): string =>
  md
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*>\s+/gm, '')

const renderExport = (doc: DocumentRow, format: ExportFormat): string => {
  if (format === 'md') {
    const title = doc.title?.trim() ? `# ${doc.title}\n\n` : ''
    return title + (doc.body_md ?? '')
  }
  if (format === 'txt') {
    const title = doc.title?.trim() ? `${doc.title}\n${'='.repeat(doc.title.length)}\n\n` : ''
    return title + stripMarkdown(doc.body_md ?? '')
  }
  // html
  const title = escapeHtml(doc.title || 'Untitled')
  const bodyHtml = escapeHtml(doc.body_md ?? '')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>body{font-family:Charter,Georgia,serif;max-width:760px;margin:3rem auto;padding:0 1rem;line-height:1.7;font-size:18px;color:#1a1a1a;}h1{font-size:2.4rem;margin-bottom:1.2rem;}pre{white-space:pre-wrap;font-family:inherit;font-size:1rem;}</style>
</head>
<body>
<h1>${title}</h1>
<pre>${bodyHtml}</pre>
</body>
</html>`
}

const safeFilename = (title: string, extension: string): string => {
  const base = (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
  return `${base || 'untitled'}.${extension}`
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const targetDocId = parsed.data.document_id
    if (targetDocId) {
      const doc = await requireDocument(targetDocId, ownerId)
      if (!doc) {
        res.json([])
        return
      }
      const items = await findMany<DocumentExportRow>('document_exports', {
        where: [{ field: 'document_id', operator: '=', value: targetDocId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      res.json(items)
      return
    }
    // Owner-scoped audit of every export across every owned document.
    const ownedDocs = await findMany<DocumentRow>('documents', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
      limit: 5000,
    })
    if (ownedDocs.length === 0) {
      res.json([])
      return
    }
    const items = await findMany<DocumentExportRow>('document_exports', {
      where: [{ field: 'document_id', operator: 'in', value: ownedDocs.map((d) => d.id) }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (error) {
    logger.error('exports.list', error)
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
    const exp = await requireExport(id.data.id, ownerId)
    if (!exp) {
      res
        .status(404)
        .json({ error: t('export.notFound', {}, { defaultValue: 'Export not found' }) })
      return
    }
    res.json(exp)
  } catch (error) {
    logger.error('exports.get', error)
    internalError(res)
  }
})

router.get('/:id/download', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const exp = await requireExport(id.data.id, ownerId)
    if (!exp) {
      res
        .status(404)
        .json({ error: t('export.notFound', {}, { defaultValue: 'Export not found' }) })
      return
    }
    const doc = await requireDocument(exp.document_id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const fmt = (exp.format as ExportFormat) ?? 'md'
    const content = renderExport(doc, fmt)
    const filename = safeFilename(doc.title, FORMAT_EXTENSION[fmt])
    res.setHeader('Content-Type', FORMAT_CONTENT_TYPE[fmt])
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.status(200).send(content)
  } catch (error) {
    logger.error('exports.download', error)
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
    const doc = await requireDocument(parsed.data.document_id, ownerId)
    if (!doc) {
      res
        .status(404)
        .json({ error: t('document.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const fmt: ExportFormat = parsed.data.format ?? 'md'
    const content = renderExport(doc, fmt)
    const result = await create<DocumentExportRow>('document_exports', {
      document_id: parsed.data.document_id,
      format: fmt,
      status: 'completed',
      s3_key: null,
      created_at: new Date(),
    })
    if (result.data?.id) {
      // Mark complete on the freshly-inserted row so the row reflects
      // the synchronous render (the resource layer's defaults stamp
      // 'pending' regardless of what we passed in some configurations;
      // an explicit update keeps the audit trail honest).
      await updateById<DocumentExportRow>('document_exports', result.data.id, {
        status: 'completed',
      })
    }
    const filename = safeFilename(doc.title, FORMAT_EXTENSION[fmt])
    res.status(201).json({
      ...(result.data ?? {}),
      status: 'completed',
      content,
      contentType: FORMAT_CONTENT_TYPE[fmt],
      filename,
      download_url: result.data?.id ? `/api/exports/${result.data.id}/download` : null,
    })
  } catch (error) {
    logger.error('exports.create', error)
    internalError(res)
  }
})

export default router
