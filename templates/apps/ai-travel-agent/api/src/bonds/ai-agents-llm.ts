/**
 * AiAgentsLlm bond setup
 *
 * Wires @molecule/api-ai-agents-llm to @molecule/api-ai-agents: the tool-calling
 * loop the travel agent runs on. Needs an `ai` provider bonded first.
 */

import { setProvider } from '@molecule/api-ai-agents'
import { provider } from '@molecule/api-ai-agents-llm'

export function setupAiAgentsLlm(): void {
  setProvider(provider)
}
