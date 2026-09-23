// Side-effect import: registers the app's feature bonds (markdown,
// virtual-scroll, data-table) with the bond registry. Without this the
// declarations in app-bonds.ts never run — the provider is declared but
// no provider is actually bonded at startup.
import './app-bonds.js'

import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAnalytics } from './app-analytics.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { authClient, setupAuthDefault } from './auth-default.js'
import { i18nProvider } from './i18n-default.js'

export { themeProvider } from './app-theme-css-variables.js'
export { authClient, i18nProvider }

/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 */
export function setupProviders(): void {
  setupAllDefaultBonds()
  setupAppThemeCssVariables()
  setupAuthDefault()
  // Analytics: env-driven (VITE_POSTHOG_KEY) + auto-tracked auth/route/http
  // events. Silent no-op when no key is configured — never breaks the app.
  setupAppAnalytics()
}
