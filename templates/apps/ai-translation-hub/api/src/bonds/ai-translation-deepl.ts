/**
 * AiTranslationDeepl bond setup
 *
 * Wires @molecule/api-ai-translation-deepl to @molecule/api-ai-translation
 */

import { setProvider } from '@molecule/api-ai-translation'
import { createProvider } from '@molecule/api-ai-translation-deepl'

export function setupAiTranslationDeepl(): void {
  setProvider(createProvider())
}
