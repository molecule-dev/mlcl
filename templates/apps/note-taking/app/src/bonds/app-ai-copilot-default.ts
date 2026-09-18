/**
 * AppAiCopilotDefault bond setup
 *
 * Wires @molecule/app-ai-copilot-default to @molecule/app-ai-copilot
 */

import { setProvider } from '@molecule/app-ai-copilot'
import { createProvider } from '@molecule/app-ai-copilot-default'

export function setupAppAiCopilotDefault(): void {
  setProvider(createProvider())
}
