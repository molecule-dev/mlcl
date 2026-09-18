/**
 * AI summary handlers — cached AI-generated digests of articles.
 *
 * The summarize call itself goes through the `@molecule/api-ai-summarization`
 * bond; this handler caches the result in `ai_summaries` keyed by article.
 * Reads are gated by article-read access; writes by article-write access.
 *
 * Authorization: every by-id mutation walks the user_id chain through
 * `requireWritableArticle` → `requireSpaceWriteAccess` →
 * `space.created_by_user_id`/`space_members.user_id` so the request is
 * enforced against the session userId. No raw findById/updateById may
 * leak across users.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import {
  type AiSummaryRow,
  internalError,
  requireReadableArticle,
  requireUser,
  requireWritableArticle,
  validationError,
} from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const upsertSchema = z.object({
  article_id: z.string().uuid(),
  summary_md: z.string().min(1).max(20_000),
  model: z.string().max(128).optional(),
})

router.get('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const article = await requireReadableArticle(id.data.id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    const summary = await findOne<AiSummaryRow>('ai_summaries', [
      { field: 'article_id', operator: '=', value: id.data.id },
    ])
    if (!summary) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    res.json(summary)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const parsed = upsertSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const article = await requireWritableArticle(parsed.data.article_id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    const existing = await findOne<AiSummaryRow>('ai_summaries', [
      { field: 'article_id', operator: '=', value: parsed.data.article_id },
    ])
    const now = new Date()
    if (existing) {
      const result = await updateById<AiSummaryRow>('ai_summaries', existing.id, {
        summary_md: parsed.data.summary_md,
        model: parsed.data.model ?? existing.model,
        generated_at: now,
      })
      res.json(result.data)
      return
    }
    const result = await create<AiSummaryRow>('ai_summaries', {
      article_id: parsed.data.article_id,
      summary_md: parsed.data.summary_md,
      model: parsed.data.model ?? '',
      generated_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const article = await requireWritableArticle(id.data.id, uid)
    if (!article) {
      res
        .status(404)
        .json({ error: t('article.notFound', {}, { defaultValue: 'Article not found' }) })
      return
    }
    await deleteMany('ai_summaries', [{ field: 'article_id', operator: '=', value: id.data.id }])
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

export default router
