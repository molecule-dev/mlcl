/**
 * SEO analysis handler — runs a local heuristic over a document's body
 * and persists the latest analysis row in `seo_analyses`. Per
 * INVENTORY's "open questions / decisions deferred":
 *   > SEO analysis depth: keyword density only (cheap) vs full
 *   > search-engine simulation (expensive). Default to local heuristic;
 *   > defer external SERP queries.
 *
 * Heuristic = keyword density + Flesch-style readability + basic length
 * checks. No external HTTP calls.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const analyzeSchema = z.object({
  target_keywords: z.array(z.string().min(1)).default([]),
})

interface SeoSuggestion {
  kind: 'keyword' | 'length' | 'readability' | 'structure'
  message: string
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+\s|[.!?]+$/g)
  return matches ? matches.length : 1
}

function fleschReadingEase(text: string): number {
  const words = countWords(text) || 1
  const sentences = countSentences(text) || 1
  const syllables = (text.match(/[aeiouAEIOU]+/g) ?? []).length || 1
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
}

function densityFor(text: string, keyword: string): number {
  const lower = text.toLowerCase()
  const k = keyword.toLowerCase()
  if (!k) return 0
  const words = countWords(text)
  if (words === 0) return 0
  const matches = lower.split(k).length - 1
  return matches / words
}

interface AnalysisResult {
  score: number
  suggestions: SeoSuggestion[]
}

function analyze(content: string, title: string, targetKeywords: string[]): AnalysisResult {
  const wordCount = countWords(content)
  const flesch = Math.max(0, Math.min(100, fleschReadingEase(content)))
  const suggestions: SeoSuggestion[] = []

  let score = 100

  if (wordCount < 300) {
    score -= 25
    suggestions.push({
      kind: 'length',
      message: 'Article is below 300 words. Aim for 800+ for stronger SEO.',
    })
  } else if (wordCount < 800) {
    score -= 10
    suggestions.push({
      kind: 'length',
      message: 'Article is below 800 words. Long-form content tends to rank higher.',
    })
  }

  if (!title || title.trim().length < 10) {
    score -= 15
    suggestions.push({
      kind: 'structure',
      message: 'Title is short. Aim for 40-60 characters with the primary keyword near the front.',
    })
  }

  if (flesch < 50) {
    score -= 10
    suggestions.push({
      kind: 'readability',
      message: 'Readability is low (Flesch < 50). Shorten sentences and prefer common words.',
    })
  }

  if (targetKeywords.length === 0) {
    score -= 10
    suggestions.push({
      kind: 'keyword',
      message: 'No target keywords provided. Pick 1–3 phrases your audience would search for.',
    })
  } else {
    for (const kw of targetKeywords) {
      const density = densityFor(content, kw)
      if (density === 0) {
        score -= 8
        suggestions.push({
          kind: 'keyword',
          message: `Keyword "${kw}" never appears in the body. Use it 2–4 times for solid relevance signals.`,
        })
      } else if (density > 0.04) {
        score -= 5
        suggestions.push({
          kind: 'keyword',
          message: `Keyword "${kw}" density (${(density * 100).toFixed(1)}%) is high — risk of keyword stuffing.`,
        })
      }
    }
  }

  return { score: Math.max(0, score), suggestions }
}

router.post(
  '/documents/:id/analyze',
  validateParams(idParamSchema),
  validateBody(analyzeSchema),
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
      const body = req.body as z.infer<typeof analyzeSchema>
      const result = analyze(
        String(doc.content ?? ''),
        String(doc.title ?? ''),
        body.target_keywords,
      )
      const row = await create('seo_analyses', {
        user_id: userId,
        document_id: id,
        target_keywords: JSON.stringify(body.target_keywords),
        score: result.score,
        suggestions: JSON.stringify(result.suggestions),
        analyzed_at: new Date(),
        created_at: new Date(),
      })
      res.status(201).json(row.data)
    } catch (error) {
      logger.error('seo.analyze', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get(
  '/documents/:id/analyses',
  validateParams(idParamSchema),
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
      const rows = await findMany('seo_analyses', {
        where: [{ field: 'document_id', operator: '=', value: id }],
        orderBy: [{ field: 'analyzed_at', direction: 'desc' }],
        limit: 50,
      })
      res.json(rows)
    } catch (error) {
      logger.error('seo.analyses.list', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
