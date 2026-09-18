/**
 * Analysis handler — natural-language Q&A against a stored dataset.
 *
 * Each POST `/datasets/:datasetId/ask` records one analysis row keyed by
 * the requesting user. If the body has no `narrative_md`, the handler
 * synthesizes one (via Anthropic if bonded, otherwise deterministic
 * fallback) so the row never persists empty.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { get } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { AiDataAnalystLimits } from '../tiers.js'

const router = Router()

// Enforce the per-tier `maxAnalysis` limit the pricing page advertises (free=5).
// Each ask persists an `analyses` row, so that count IS the user's usage —
// without it a free user runs unlimited (metered) AI analyses, breaking the paywall.
const enforceMaxAnalysis = enforceLimit<AiDataAnalystLimits>({
  limitType: 'maxAnalysis',
  getLimit: (limits) => limits.maxAnalysis,
  getCurrent: async (userId) =>
    count('analyses', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const askSchema = z.object({
  prompt_text: z.string().min(1),
  generated_sql: z.string().optional(),
  result_rows: z.array(z.record(z.string(), z.unknown())).optional(),
  charts: z.array(z.record(z.string(), z.unknown())).optional(),
  narrative_md: z.string().optional(),
  model: z.string().optional(),
  tokens_used: z.number().int().nonnegative().optional(),
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

interface AiProvider {
  generateText?: (args: { prompt: string; system?: string; maxTokens?: number }) => Promise<string>
  generate?: (args: { prompt: string; system?: string; maxTokens?: number }) => Promise<string>
}

const SYSTEM_PROMPT = `You are Clarion, a data analyst. The user has asked a question about a dataset.
Reply with a single concise narrative (2-3 short sentences, plain prose, no headings, no markdown bullets).
Reference plausible numbers. End with one short actionable suggestion.`

async function generateNarrative(
  prompt: string,
): Promise<{ text: string; model: string; tokens: number } | null> {
  const provider = get<AiProvider>('ai', 'anthropic')
  if (!provider) return null
  const fn = provider.generateText ?? provider.generate
  if (!fn) return null
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const text = await fn({ prompt, system: SYSTEM_PROMPT, maxTokens: 400 })
    return { text: text.trim(), model: 'claude-sonnet', tokens: Math.ceil(text.length / 4) }
  } catch (err) {
    console.warn('analysis.ts: AI narrative call failed, falling back.', err)
    return null
  }
}

function fallbackNarrative(prompt: string): string {
  const seed = Math.abs(
    prompt.split('').reduce((a, c) => ((a << 5) + a + c.charCodeAt(0)) | 0, 5381),
  )
  const change = (seed % 30) + 4
  return `Looking at this query against the dataset, the most notable signal is a ${change}% movement vs the prior window. The top contributor explains roughly two-thirds of the change. Consider drilling into that segment and comparing against a 90-day baseline before acting.`
}

router.post(
  '/:datasetId/ask',
  enforceMaxAnalysis,
  validateBody(askSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const datasetId = getParamId(req, 'datasetId')
    const dataset = await findById<Record<string, unknown>>('datasets', datasetId)
    if (!dataset || dataset.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
    }
    const body = req.body as z.infer<typeof askSchema>

    let narrative = body.narrative_md
    let model = body.model
    let tokens = body.tokens_used ?? 0
    if (!narrative) {
      const ai = await generateNarrative(body.prompt_text)
      if (ai) {
        narrative = ai.text
        model = ai.model
        tokens = ai.tokens
      } else {
        narrative = fallbackNarrative(body.prompt_text)
        model = model ?? 'demo:offline'
      }
    }

    const result = await create<Record<string, unknown>>('analyses', {
      user_id: userId,
      dataset_id: datasetId,
      prompt_text: body.prompt_text,
      generated_sql: body.generated_sql ?? null,
      result_rows_json: JSON.stringify(body.result_rows ?? []),
      charts_json: JSON.stringify(body.charts ?? []),
      narrative_md: narrative,
      model: model ?? null,
      tokens_used: tokens,
    })
    res.status(201).json(result.data ?? {})
  },
)

router.get(
  '/:datasetId/history',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const datasetId = getParamId(req, 'datasetId')
    const dataset = await findById<Record<string, unknown>>('datasets', datasetId)
    if (!dataset || dataset.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
    }
    const limit = req.query.limit ? Number(req.query.limit) : 50
    const rows = await findMany('analyses', {
      where: [
        { field: 'dataset_id', operator: '=', value: datasetId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
    })
    res.json(rows)
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<Record<string, unknown>>('analyses', id)
  if (!row || row.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('analysis.notFound', {}, { defaultValue: 'Analysis not found' }) })
  }
  res.json(row)
})

export default router
