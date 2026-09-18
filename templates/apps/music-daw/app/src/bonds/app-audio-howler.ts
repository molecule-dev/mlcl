/**
 * AppAudioHowler bond setup
 *
 * Wires @molecule/app-audio-howler to @molecule/app-audio
 */

import { setProvider } from '@molecule/app-audio'
import { provider } from '@molecule/app-audio-howler'

export function setupAppAudioHowler(): void {
  setProvider(provider)
}
