/**
 * Generate handler — wraps the bonded AI provider's chat() with high-level
 * "compose / continue / rewrite / summarize / titles / seo" calls. The
 * actual vendor SDK only enters via the bond at startup. Each route
 * validates input via zod, scopes by the authenticated user, and persists
 * the round-trip in `ai_suggestions` for analytics & quota auditing.
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { type AIProvider, getProviderByName } from '@molecule/api-ai'
import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { AiWritingStudioLimits } from '../tiers.js'

const router = Router()

// Every AI generation logs an `ai_suggestions` row, so that count IS the user's
// generation usage. Gate all generate endpoints by the per-tier `maxGenerate`
// limit the pricing page advertises (free=5) — without it a free user gets
// unlimited AI generations (unbounded LLM cost + broken paywall). Mirrors how
// documents.ts gates `maxDocuments`.
const enforceMaxGenerate = enforceLimit<AiWritingStudioLimits>({
  limitType: 'maxGenerate',
  getLimit: (limits) => limits.maxGenerate,
  getCurrent: async (userId) =>
    count('ai_suggestions', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

interface AiResult {
  text: string
  inputTokens: number
  outputTokens: number
}

// Multiple AI providers may be bonded under names ('anthropic', 'openai').
// Prefer Anthropic Claude (better long-form prose) but fall back to OpenAI
// when the Anthropic key is absent. Throwing here surfaces the configuration
// problem rather than silently producing empty content.
function pickAiProvider(): AIProvider {
  const anthropic = getProviderByName('anthropic')
  if (anthropic) return anthropic
  const openai = getProviderByName('openai')
  if (openai) return openai
  throw new Error('No AI provider bonded. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY.')
}

async function aiGenerate({
  system,
  prompt,
  maxTokens = 1024,
}: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<AiResult> {
  const provider = pickAiProvider()
  const stream = provider.chat({
    messages: [{ role: 'user', content: prompt }],
    system,
    maxTokens,
  })
  let text = ''
  let inputTokens = 0
  let outputTokens = 0
  for await (const event of stream) {
    if (event.type === 'text') text += event.content
    if (event.type === 'done') {
      inputTokens = event.usage?.inputTokens ?? 0
      outputTokens = event.usage?.outputTokens ?? 0
    }
  }
  return { text, inputTokens, outputTokens }
}

async function recordSuggestion(
  userId: string,
  documentId: string | null,
  kind: string,
  inputText: string,
  outputText: string,
  tokensUsed: number,
): Promise<void> {
  try {
    await create('ai_suggestions', {
      user_id: userId,
      document_id: documentId,
      kind,
      input_text: inputText,
      output_text: outputText,
      accepted: false,
      tokens_used: tokensUsed,
      created_at: new Date(),
    })
  } catch (_error) {
    // Suggestion logging failures are non-fatal — the AI response should
    // still reach the user.
  }
}

const composeSchema = z.object({
  prompt: z.string().min(1),
  tone: z.string().optional(),
  length: z.string().optional(),
  format: z.enum(['markdown', 'html']).optional(),
  document_id: z.string().optional(),
})

router.post(
  '/content',
  enforceMaxGenerate,
  validateBody(composeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof composeSchema>
      // Default the tone to the user's saved "Default tone preset" (Settings →
      // user_preferences.default_tone) when the request doesn't specify one.
      const tone = body.tone ?? (await resolveDefaultTone(userId))
      const result = await aiGenerate({
        system: buildSystemPrompt({ tone, length: body.length, format: body.format }),
        prompt: body.prompt,
      })
      await recordSuggestion(
        userId,
        body.document_id ?? null,
        'continue',
        body.prompt,
        result.text,
        result.inputTokens + result.outputTokens,
      )
      res.json({
        content: result.text,
        usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      })
    } catch (error) {
      console.error('generate/content failed:', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

const rewriteSchema = z.object({
  content: z.string().min(1),
  instruction: z.string().optional(),
  document_id: z.string().optional(),
})

router.post(
  '/rewrite',
  enforceMaxGenerate,
  validateBody(rewriteSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof rewriteSchema>
      // Apply the user's saved default tone to refinements too (Settings →
      // user_preferences.default_tone), so the preset governs the rewrite.
      const tone = await resolveDefaultTone(userId)
      const result = await aiGenerate({
        system:
          'You are an expert editor. Rewrite or improve the provided text according to the user instruction.' +
          (tone ? ` Write in a ${tone} tone.` : '') +
          ' Return only the improved text without explanation.',
        prompt: `Instruction: ${body.instruction ?? 'Improve clarity and readability'}\n\nText:\n${body.content}`,
      })
      await recordSuggestion(
        userId,
        body.document_id ?? null,
        'rewrite',
        body.content,
        result.text,
        result.inputTokens + result.outputTokens,
      )
      res.json({
        content: result.text,
        usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      })
    } catch (error) {
      console.error('generate/rewrite failed:', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

const summarizeSchema = z.object({
  content: z.string().min(1),
  maxLength: z.number().int().positive().optional(),
  document_id: z.string().optional(),
})

router.post(
  '/summarize',
  enforceMaxGenerate,
  validateBody(summarizeSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof summarizeSchema>
      const result = await aiGenerate({
        system: `You are an expert summarizer. Produce a concise summary (~${body.maxLength ?? 200} characters max). Return only the summary, no preamble.`,
        prompt: body.content,
        maxTokens: 512,
      })
      await recordSuggestion(
        userId,
        body.document_id ?? null,
        'shorten',
        body.content,
        result.text,
        result.inputTokens + result.outputTokens,
      )
      res.json({ summary: result.text })
    } catch (error) {
      console.error('generate/summarize failed:', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

const titlesSchema = z.object({
  content: z.string().min(1),
  count: z.number().int().min(1).max(10).optional(),
})

router.post(
  '/titles',
  enforceMaxGenerate,
  validateBody(titlesSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof titlesSchema>
      const result = await aiGenerate({
        system: `Generate exactly ${body.count ?? 5} title suggestions for the given content. Return them as a JSON array of strings — no markdown code fence, no preamble, no explanation. Just the array.`,
        prompt: body.content,
      })
      const titles = parseTitlesPayload(result.text)
      res.json({ titles })
    } catch (error) {
      console.error('generate/titles failed:', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

const seoSchema = z.object({
  content: z.string().min(1),
  title: z.string().optional(),
  document_id: z.string().optional(),
})

router.post(
  '/seo',
  enforceMaxGenerate,
  validateBody(seoSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof seoSchema>
      const result = await aiGenerate({
        system:
          'Generate SEO metadata for the given content. Return a JSON object with keys: metaTitle (string), metaDescription (string), keywords (array of strings), slug (string). Output ONLY the JSON — no markdown code fence, no preamble, no trailing prose.',
        prompt: `Title: ${body.title ?? ''}\n\nContent:\n${body.content}`,
      })
      const seo = parseSeoPayload(result.text)
      await recordSuggestion(
        userId,
        body.document_id ?? null,
        'seo',
        body.content.slice(0, 1000),
        result.text,
        result.inputTokens + result.outputTokens,
      )
      res.json(seo)
    } catch (error) {
      console.error('generate/seo failed:', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

/**
 * Strip a leading ```json fence and trailing ``` from an LLM payload, then
 * extract the first JSON value (array or object) by balancing brackets so a
 * trailing explanatory paragraph from the model doesn't poison JSON.parse.
 */
function extractJsonPayload(raw: string): string {
  let s = raw.trim()
  s = s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  // Scan for first balanced object/array. Handles strings + escapes so a
  // brace inside a quoted value doesn't break the count.
  for (let i = 0; i < s.length; i++) {
    const start = s[i]
    if (start !== '[' && start !== '{') continue
    const close = start === '[' ? ']' : '}'
    let depth = 0
    let inStr = false
    let escape = false
    for (let j = i; j < s.length; j++) {
      const ch = s[j]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inStr = !inStr
        continue
      }
      if (inStr) continue
      if (ch === start) depth++
      else if (ch === close) {
        depth--
        if (depth === 0) return s.slice(i, j + 1)
      }
    }
  }
  return s
}

function parseTitlesPayload(raw: string): string[] {
  const cleaned = extractJsonPayload(raw)
  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed.map(String).filter((s) => s.length > 0)
  } catch (_error) {
    // fall through — invalid JSON, use line-split fallback below
  }
  // Fallback: split on newlines / numbered list markers.
  return raw
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length < 200)
}

interface SeoPayload {
  metaTitle?: string
  metaDescription?: string
  keywords?: string[]
  slug?: string
  raw?: string
}

function parseSeoPayload(raw: string): SeoPayload {
  const cleaned = extractJsonPayload(raw)
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    if (parsed && typeof parsed === 'object') {
      const result: SeoPayload = {}
      if (typeof parsed.metaTitle === 'string') result.metaTitle = parsed.metaTitle
      if (typeof parsed.metaDescription === 'string')
        result.metaDescription = parsed.metaDescription
      if (Array.isArray(parsed.keywords)) result.keywords = parsed.keywords.map(String)
      if (typeof parsed.slug === 'string') result.slug = parsed.slug
      // If we got nothing typed, fall back to raw.
      if (Object.keys(result).length === 0) return { raw }
      return result
    }
  } catch (_error) {
    // fall through — invalid JSON from model, return raw string below
  }
  return { raw }
}

/** The user's saved default tone preset (Settings → user_preferences.default_tone), if set. */
async function resolveDefaultTone(userId: string): Promise<string | undefined> {
  const rows = await findMany<{ default_tone?: string }>('user_preferences', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  const tone = rows[0]?.default_tone
  return typeof tone === 'string' && tone.length > 0 ? tone : undefined
}

function buildSystemPrompt(options: { tone?: string; length?: string; format?: string }): string {
  const parts = ['You are an expert content writer.']
  if (options.tone) parts.push(`Write in a ${options.tone} tone.`)
  if (options.length) parts.push(`Target approximately ${options.length} words.`)
  if (options.format === 'html') {
    parts.push('Format the output as clean HTML.')
  } else {
    parts.push('Format the output as Markdown with appropriate headings, lists, and emphasis.')
  }
  return parts.join(' ')
}

export default router
