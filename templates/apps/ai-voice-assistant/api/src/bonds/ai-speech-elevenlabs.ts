/**
 * AiSpeechElevenlabs bond setup
 *
 * Wires @molecule/api-ai-speech-elevenlabs to @molecule/api-ai-speech
 */

import { setProvider } from '@molecule/api-ai-speech'
import { provider } from '@molecule/api-ai-speech-elevenlabs'

export function setupAiSpeechElevenlabs(): void {
  setProvider(provider)
}
