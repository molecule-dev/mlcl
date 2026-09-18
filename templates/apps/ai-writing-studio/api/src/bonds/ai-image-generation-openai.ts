/**
 * AiImageGenerationOpenai bond setup
 *
 * Wires @molecule/api-ai-image-generation-openai to @molecule/api-ai-image-generation.
 *
 * Quality defaulting:
 *
 *   - Explicit `OPENAI_IMAGE_QUALITY` env var wins if set. Valid values
 *     per the gpt-image-1 spec: `auto`, `high`, `medium`, `low`.
 *   - Otherwise, non-production (`NODE_ENV !== 'production'`) defaults
 *     to `low` because every other use of the bond — smoke runs, audits,
 *     dev iteration, CI — neither needs nor benefits from
 *     production-grade images. `low` is ~272 output tokens
 *     (~$0.011/image at $40/1M) vs `auto/high`'s ~4,160 tokens
 *     (~$0.166/image, ~15× more) and `auto` is OpenAI's default when
 *     nothing is passed.
 *   - Production (`NODE_ENV === 'production'`) passes `undefined` so
 *     OpenAI's own default takes over (currently `auto`). No silent
 *     downgrade for real user-facing generations.
 */

import { setProvider } from '@molecule/api-ai-image-generation'
import { createProvider } from '@molecule/api-ai-image-generation-openai'

function defaultImageQuality(): string | undefined {
  if (process.env.OPENAI_IMAGE_QUALITY) return process.env.OPENAI_IMAGE_QUALITY
  if (process.env.NODE_ENV !== 'production') return 'low'
  return undefined
}

export function setupAiImageGenerationOpenai(): void {
  setProvider(createProvider({ defaultQuality: defaultImageQuality() }))
}
