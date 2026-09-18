/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 *
 * `storage` is wired in explicitly here (not in the package default) so
 * that the user's selected theme survives a full page reload — without
 * a storage adapter the provider keeps `persistKey` as a no-op.
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

const browserStorage =
  typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
    ? globalThis.localStorage
    : undefined

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-theme',
  storage: browserStorage,
})
export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
