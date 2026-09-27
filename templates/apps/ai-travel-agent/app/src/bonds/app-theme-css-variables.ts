/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 *
 * The storage adapter is supplied so that the chosen theme rehydrates
 * across reloads — without it `persistKey` is a no-op.
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

const storage =
  typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
    ? globalThis.localStorage
    : undefined

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
  persistKey: 'molecule-theme',
  storage,
})

export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
