/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 *
 * A first-time visitor gets whatever their OS prefers (`systemDefault`), and
 * only an explicit toggle (persisted under `molecule-theme`) pins a choice.
 * A render without a window — the build's prerender, the dev server's — has
 * neither and starts on `defaultTheme`; the hydrating client renders that
 * same theme first (`useTheme()` reads the provider's `getServerTheme()`
 * while hydrating), then switches to the persisted or preferred one.
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
  persistKey: 'molecule-theme',
})
export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
}
