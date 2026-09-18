/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 *
 * Persistence: the bond's `persistKey` only takes effect when the
 * provider is also given a `storage` adapter at construction time. The
 * @molecule/app-storage-localstorage bond sets up a global localStorage
 * provider, but that wires the `getProvider()` accessor — it does not
 * mutate this provider. We pass `globalThis.localStorage` directly so
 * theme selection survives a hard reload (the spec asserts this).
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

const themeStorage =
  typeof globalThis !== 'undefined' && globalThis.localStorage ? globalThis.localStorage : undefined

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-theme',
  storage: themeStorage,
})
export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
