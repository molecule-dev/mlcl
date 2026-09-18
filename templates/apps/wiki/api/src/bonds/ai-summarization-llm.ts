import { provider } from '@molecule/api-ai-summarization-llm'
import { bond } from '@molecule/api-bond'

/**
 * Bond the default LLM summarization provider so `summarize()` actually runs.
 *
 * The summarizer has no vendor of its own — it composes whatever chat model is
 * bonded under `ai`, so `setupAiAnthropic()` (or any `ai` provider) MUST be
 * wired first. Without this, `hasProvider('ai-summarization')` is false and the
 * page "Summarize" endpoint returns 503 instead of a real summary.
 */
export function setupAiSummarizationLlm(): void {
  bond('ai-summarization', provider)
}
