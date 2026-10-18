import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAnalytics } from './app-analytics.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { setupAppUiTailwind } from './app-ui-tailwind.js'
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
  // setupAllDefaultBonds() wires the default (blue) theme — override it with
  // this app's custom theme. Must run after setupAllDefaultBonds().
  setupAppThemeCssVariables()
  // Layer this app's generated visual-token (`fv*`) ClassMap on top of the
  // default bond's ClassMap — must run after setupAllDefaultBonds().
  setupAppUiTailwind()
  setupAuthDefault()
  await setupAppAnalytics()
}
