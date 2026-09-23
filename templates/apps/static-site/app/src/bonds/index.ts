import { setupAppAnalytics } from './app-analytics.js'
import { setupAppFontsArimo } from './app-fonts-arimo.js'
import { setupAppIconsMolecule } from './app-icons-molecule.js'
import { setupAppMarkdownMarked } from './app-markdown-marked.js'
import { setupAppRoutingReactRouter } from './app-routing-react-router.js'
import { setupAppStorageLocalstorage } from './app-storage-localstorage.js'
import { setupAppStylingTailwind } from './app-styling-tailwind.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { setupAppUiTailwind } from './app-ui-tailwind.js'
import { setupI18nDefault } from './i18n-default.js'

export { themeProvider } from './app-theme-css-variables.js'
export { i18nProvider } from './i18n-default.js'

/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 */
export function setupProviders(): void {
  setupAppFontsArimo()
  setupAppIconsMolecule()
  setupAppMarkdownMarked()
  setupAppRoutingReactRouter()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupI18nDefault()
  // Last: it reads the routing bond wired above (getRouter) and captures the
  // analytics provider once at setup time.
  setupAppAnalytics()
}
