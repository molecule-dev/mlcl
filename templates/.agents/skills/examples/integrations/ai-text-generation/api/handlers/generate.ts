import { Router } from 'express'
import { z } from 'zod'

import { type AIProvider, getProviderByName } from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import { consume } from '@molecule/api-rate-limit'

const logger = getLogger()

/**
 * `POST /generate { prompt, mode? }` — runs ONE AI text generation and returns
 * `{ text }`. This is the canonical way to add any LLM feature (generate,
 * summarize, rewrite, explain) to an existing app. The model is reached ONLY
 * through the bonded `@molecule/api-ai` provider — never a vendor SDK — so
 * swapping Anthropic for OpenAI is a one-line bond change and this handler is
 * untouched.
 *
 * For a full token-by-token streaming chat assistant, use the
 * `@molecule/app-ai-chat` feature package instead of hand-rolling one here.
 */

const generateSchema = z.object({
  prompt: z.string().min(1).max(8000),
  mode: z.enum(['generate', 'summarize', 'rewrite']).optional(),
})

// A short system instruction per mode. These live SERVER-SIDE so the model's
// behavior is a product decision the client cannot rewrite (a client-supplied
// system prompt is a prompt-injection / jailbreak vector on a metered call).
const SYSTEM_BY_MODE: Record<string, string> = {
  generate: 'You are a helpful writing assistant. Produce clear, well-structured prose.',
  summarize: 'Summarize the text in 3-5 concise sentences. No preamble.',
  rewrite: 'Rewrite the text to be clearer and more concise while preserving its meaning.',
}

// AI is a NAMED, multi-provider bond category. Prefer Anthropic; fall back to
// OpenAI when only that key is wired. Throwing surfaces the misconfiguration
// instead of silently returning empty text.
function pickAiProvider(): AIProvider {
  const anthropic = getProviderByName('anthropic')
  if (anthropic) return anthropic
  const openai = getProviderByName('openai')
  if (openai) return openai
  throw new Error(
    'No AI provider bonded. Call setupAiAnthropic() (or setupAiOpenai()) in bonds.ts.',
  )
}

const router = Router()

router.post('/', async (req, res) => {
  const parsed = generateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('ai.invalidPrompt', undefined, { defaultValue: 'A prompt is required.' }) })
  }

  // An LLM call is METERED and slow. Throttle per user BEFORE dispatching so a
  // runaway loop or abuse can't run up the token bill or exhaust capacity for
  // everyone. Key by userId behind auth; fall back to IP when unauthenticated.
  // (For a hard per-plan cap — "20 generations/month on free" — wrap the route in
  // `enforceLimit` from `@molecule/api-entitlements` instead; see the README.)
  const key = res.locals?.session?.userId ?? req.ip ?? 'unknown'
  const rl = await consume(`ai-generate:${key}`)
  if (!rl.allowed) {
    return res.status(429).json({
      error: t('ai.rateLimited', undefined, {
        defaultValue: 'Too many requests — try again shortly.',
      }),
      retryAfter: rl.retryAfter,
    })
  }

  const { prompt, mode = 'generate' } = parsed.data

  // Cancel the upstream call if the client disconnects — otherwise the provider
  // keeps generating (and billing) tokens nobody will read.
  const controller = new AbortController()
  req.on('close', () => controller.abort())

  try {
    const provider = pickAiProvider()

    // provider.chat() ALWAYS returns an async iterable of ChatEvent — even for a
    // one-shot completion. Accumulate 'text' events; read final token usage off
    // the 'done' event; a 'error' event means the provider failed mid-stream.
    const stream = provider.chat({
      system: SYSTEM_BY_MODE[mode],
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1024,
      signal: controller.signal,
    })

    let text = ''
    let outputTokens = 0
    for await (const event of stream) {
      if (event.type === 'text') text += event.content
      if (event.type === 'error') throw new Error(event.message)
      if (event.type === 'done') outputTokens = event.usage?.outputTokens ?? 0
    }

    // `outputTokens` is the hook for metering/billing — record it against the
    // user here if you charge for usage. Logged so spend is at least traceable.
    logger.debug('ai.generate completed', { mode, outputTokens })

    return res.json({ text })
  } catch (error) {
    logger.error('ai.generate failed', { error })
    return res.status(502).json({
      error: t('ai.failed', undefined, {
        defaultValue: 'The AI request failed. Please try again.',
      }),
    })
  }
})

export default router
