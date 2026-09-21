import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAnalytics } from './app-analytics.js'
import { setupAppCodeEditorMonaco } from './app-code-editor-monaco.js'
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
  await setupAppCodeEditorMonaco()
  setupAuthDefault()
  // Analytics: env-driven (VITE_POSTHOG_KEY) + auto-tracked auth/route/http
  // events. Silent no-op when no key is configured — never breaks the app.
  setupAppAnalytics()
}
