import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAnalytics } from './app-analytics.js'
import { setupAppCommandPaletteCmdk } from './app-command-palette-cmdk.js'
import { setupAppKeyboardShortcutsHotkeys } from './app-keyboard-shortcuts-hotkeys.js'
import { setupAppRealtimeSocketio } from './app-realtime-socketio.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { authClient, setupAuthDefault } from './auth-default.js'
import { i18nProvider } from './i18n-default.js'

export { themeProvider } from './app-theme-css-variables.js'
export { authClient, i18nProvider }

/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 * Async because the realtime / command-palette / keyboard-shortcuts wiring
 * dynamic-imports its bond — `bootstrapApp` awaits this before the first
 * render, so pages can `connect()` from their first effect without racing
 * the bond.
 */
export async function setupProviders(): Promise<void> {
  setupAllDefaultBonds()
  setupAppThemeCssVariables()
  await setupAppCommandPaletteCmdk()
  await setupAppKeyboardShortcutsHotkeys()
  await setupAppRealtimeSocketio()
  setupAuthDefault()
  // Analytics: env-driven (VITE_POSTHOG_KEY) + auto-tracked auth/route/http
  // events. Silent no-op when no key is configured — never breaks the app.
  setupAppAnalytics()
}
