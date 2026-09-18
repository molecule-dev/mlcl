import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAudioHowler } from './app-audio-howler.js'
import { setupAppRealtimeSocketio } from './app-realtime-socketio.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { authClient, setupAuthDefault } from './auth-default.js'
import { i18nProvider } from './i18n-default.js'

export { themeProvider } from './app-theme-css-variables.js'
export { authClient, i18nProvider }

/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 */
export async function setupProviders(): Promise<void> {
  setupAllDefaultBonds()
  setupAppThemeCssVariables()
  setupAppAudioHowler()
  await setupAppRealtimeSocketio()
  setupAuthDefault()
}
