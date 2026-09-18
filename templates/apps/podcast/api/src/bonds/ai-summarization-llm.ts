import { provider } from '@molecule/api-ai-summarization-llm'
import { bond } from '@molecule/api-bond'

/**
 * Bond the default LLM summarization provider so `summarize()` actually runs.
 *
 * The summarizer has no vendor of its own — it composes whatever chat model is
 * bonded under `ai`, so `setupAiAnthropic()` (or any `ai` provider) MUST be
 * wired first. Without this, `getProvider('ai-summarization')` is null and the
 * episode "AI show notes" silently fall back to a truncated transcript.
 */
export function setupAiSummarizationLlm(): void {
  bond('ai-summarization', provider)
}
