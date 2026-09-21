import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAnalytics } from './app-analytics.js'
import { setupAppCommandPaletteCmdk } from './app-command-palette-cmdk.js'
import { setupAppKeyboardShortcutsHotkeys } from './app-keyboard-shortcuts-hotkeys.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { authClient, setupAuthDefault } from './auth-default.js'
import { i18nProvider } from './i18n-default.js'

export { themeProvider } from './app-theme-css-variables.js'
export { authClient, i18nProvider }

/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 *
 * Async: `setupAppCommandPaletteCmdk` / `setupAppKeyboardShortcutsHotkeys` lazy-load
 * their libraries, so they MUST be awaited — `bootstrapApp` awaits this before
 * mounting. (They were previously called without await, a fire-and-forget race
 * that could mount before the providers were bonded.)
 */
export async function setupProviders(): Promise<void> {
  setupAllDefaultBonds()
  setupAppThemeCssVariables()
  setupAuthDefault()
  await Promise.all([setupAppCommandPaletteCmdk(), setupAppKeyboardShortcutsHotkeys()])
  // Analytics: env-driven (VITE_POSTHOG_KEY) + auto-tracked auth/route/http
  // events. Silent no-op when no key is configured — never breaks the app.
  setupAppAnalytics()
}
