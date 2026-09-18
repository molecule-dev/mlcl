/**
 * Documents handler — owns the document CRUD lifecycle plus version-history
 * helpers. Uses the abstract DataStore (`@molecule/api-database`) for
 * persistence; Vendor SDKs never appear here. Ownership is enforced on
 * every read/write — non-owner reads return 404, not 403, to avoid
 * leaking existence (per INVENTORY's authorization rules).
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { AiWritingStudioLimits } from '../tiers.js'

const router = Router()

const tagsList = z.array(z.string()).default([])
const outlineList = z.array(z.unknown()).default([])

const createDocumentSchema = z.object({
  title: z.string().default(''),
  slug: z.string().optional(),
  content: z.string().default(''),
  body_html: z.string().optional(),
  outline: outlineList,
  summary: z.string().optional(),
  tags: tagsList,
  format: z.enum(['markdown', 'html', 'plain']).default('markdown'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  cover_image_url: z.string().url().optional(),
})

// NOTE: do NOT reuse `tagsList` / `outlineList` here. Those have
// `.default([])` so a PUT that omits the field still resolves the value to
// `[]`, which would silently clobber tags/outline that the caller wasn't
// trying to change. For PUT, the field must remain `undefined` when absent.
const updateDocumentSchema = z.object({
  title: z.string().optional(),
  slug: z.string().nullish(),
  content: z.string().optional(),
  body_html: z.string().nullish(),
  outline: z.array(z.unknown()).optional(),
  summary: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  format: z.enum(['markdown', 'html', 'plain']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  cover_image_url: z.string().url().nullish(),
  is_public: z.boolean().optional(),
  seo_score: z.number().int().min(0).max(100).nullish(),
})

const computeWordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

const computeReadingMinutes = (wordCount: number): number => Math.max(1, Math.ceil(wordCount / 200))

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const docs = await findMany('documents', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(docs)
  } catch (error) {
    logger.error('documents.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', id)
    if (!doc || doc.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    res.json(doc)
  } catch (error) {
    logger.error('documents.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<AiWritingStudioLimits>({
    limitType: 'maxDocuments',
    getLimit: (limits) => limits.maxDocuments,
    getCurrent: async (userId) =>
      count('documents', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createDocumentSchema>
      const wordCount = computeWordCount(body.content)
      const result = await create('documents', {
        user_id: userId,
        title: body.title || t('documents.untitled', {}, { defaultValue: 'Untitled Document' }),
        slug: body.slug ?? null,
        content: body.content,
        body_html: body.body_html ?? null,
        outline: JSON.stringify(body.outline),
        summary: body.summary ?? null,
        tags: JSON.stringify(body.tags),
        format: body.format,
        status: body.status,
        word_count: wordCount,
        reading_minutes: computeReadingMinutes(wordCount),
        cover_image_url: body.cover_image_url ?? null,
        last_edited_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('documents.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('documents', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateDocumentSchema>
      const updates: Record<string, unknown> = {
        updated_at: new Date(),
        last_edited_at: new Date(),
      }
      if (body.title !== undefined) updates.title = body.title
      if (body.slug !== undefined) updates.slug = body.slug
      if (body.content !== undefined) {
        updates.content = body.content
        const wordCount = computeWordCount(body.content)
        updates.word_count = wordCount
        updates.reading_minutes = computeReadingMinutes(wordCount)
      }
      if (body.body_html !== undefined) updates.body_html = body.body_html
      if (body.outline !== undefined) updates.outline = JSON.stringify(body.outline)
      if (body.summary !== undefined) updates.summary = body.summary
      if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
      if (body.format !== undefined) updates.format = body.format
      if (body.status !== undefined) updates.status = body.status
      if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
      if (body.is_public !== undefined) updates.is_public = body.is_public
      if (body.seo_score !== undefined) updates.seo_score = body.seo_score
      const result = await updateById('documents', id, updates)
      res.json(result.data)
    } catch (error) {
      logger.error('documents.update', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('documents', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    await deleteById('documents', id)
    res.status(204).end()
  } catch (error) {
    logger.error('documents.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/* ----------------------------- Version history ---------------------------- */

const versionSchema = z.object({})

router.post(
  '/:id/versions',
  validateParams(idParamSchema),
  validateBody(versionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const doc = await findById<Record<string, unknown>>('documents', id)
      if (!doc || doc.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
        return
      }
      const versions = await findMany<Record<string, unknown>>('document_versions', {
        where: [{ field: 'document_id', operator: '=', value: id }],
        orderBy: [{ field: 'version_number', direction: 'desc' }],
        limit: 1,
      })
      const latest = versions[0]
      const nextNumber = latest ? Number(latest.version_number ?? 0) + 1 : 1
      const body = String(doc.content ?? '')
      const result = await create('document_versions', {
        document_id: id,
        user_id: userId,
        version_number: nextNumber,
        body_md: body,
        snapshot_size: body.length,
        created_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('documents.versions.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/:id/versions', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', id)
    if (!doc || doc.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
      return
    }
    const versions = await findMany('document_versions', {
      where: [{ field: 'document_id', operator: '=', value: id }],
      orderBy: [{ field: 'version_number', direction: 'desc' }],
    })
    res.json(versions)
  } catch (error) {
    logger.error('documents.versions.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const restoreSchema = z.object({ version_id: z.string().min(1) })

router.post(
  '/:id/versions/restore',
  validateParams(idParamSchema),
  validateBody(restoreSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const doc = await findById<Record<string, unknown>>('documents', id)
      if (!doc || doc.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('documents.notFound', {}, { defaultValue: 'Document not found' }) })
        return
      }
      const { version_id } = req.body as z.infer<typeof restoreSchema>
      const version = await findById<Record<string, unknown>>('document_versions', version_id)
      if (!version || version.document_id !== id) {
        res
          .status(404)
          .json({ error: t('documents.notFound', {}, { defaultValue: 'Version not found' }) })
        return
      }
      const body = String(version.body_md ?? '')
      const wordCount = computeWordCount(body)
      const result = await updateById('documents', id, {
        content: body,
        word_count: wordCount,
        reading_minutes: computeReadingMinutes(wordCount),
        last_edited_at: new Date(),
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (error) {
      logger.error('documents.versions.restore', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
