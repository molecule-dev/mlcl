/**
 * Document version handlers — append-only history with restore.
 *
 * Versions are written exclusively by the documents handler on PUT and
 * by the restore endpoint here. Clients cannot create versions
 * directly. Read access mirrors the parent document; restore requires
 * editor role on the doc.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import {
  type DocumentRow,
  type DocumentVersionRow,
  internalError,
  requireReadableDocument,
  requireRole,
  requireUser,
  validationError,
} from '../lib/authz.js'

const router = Router()

const docParam = z.object({ documentId: z.string().uuid() })
const versionParam = z.object({
  documentId: z.string().uuid(),
  versionId: z.string().uuid(),
})

router.get('/:documentId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = docParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireReadableDocument(params.data.documentId, ownerId)
    if (!access) {
      res.json([])
      return
    }
    const versions = await findMany<DocumentVersionRow>('document_versions', {
      where: [{ field: 'document_id', operator: '=', value: params.data.documentId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(versions)
  } catch (error) {
    logger.error('versions.list', error)
    internalError(res)
  }
})

router.get('/:documentId/:versionId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = versionParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireReadableDocument(params.data.documentId, ownerId)
    if (!access) {
      res
        .status(404)
        .json({ error: t('versions.notFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    const version = await findOne<DocumentVersionRow>('document_versions', [
      { field: 'id', operator: '=', value: params.data.versionId },
      { field: 'document_id', operator: '=', value: params.data.documentId },
    ])
    if (!version) {
      res
        .status(404)
        .json({ error: t('versions.notFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    res.json(version)
  } catch (error) {
    logger.error('versions.get', error)
    internalError(res)
  }
})

router.post('/:documentId/restore/:versionId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = versionParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const access = await requireRole(params.data.documentId, ownerId, 'editor')
    if (!access) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const version = await findOne<DocumentVersionRow>('document_versions', [
      { field: 'id', operator: '=', value: params.data.versionId },
      { field: 'document_id', operator: '=', value: params.data.documentId },
    ])
    if (!version) {
      res
        .status(404)
        .json({ error: t('versions.notFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    const previous = access.document
    // Snapshot CURRENT body before overwriting — the restore itself is
    // a versioned change like any other PUT.
    await create('document_versions', {
      document_id: previous.id,
      author_id: ownerId,
      content: previous.content,
      version: previous.version,
      change_summary: t(
        'versions.restoreSummary',
        { version: version.version },
        { defaultValue: 'Restored from version {{version}}' },
      ),
      created_at: new Date(),
    })
    const result = await updateById<DocumentRow>('documents', params.data.documentId, {
      content: version.content,
      version: previous.version + 1,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('versions.restore', error)
    internalError(res)
  }
})

export default router
