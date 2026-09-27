/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 *
 * `persistKey` only takes effect when paired with a `storage` adapter —
 * without one the provider silently skips persistence and every reload
 * resets to `defaultTheme`. We point at `window.localStorage` when it is
 * available and fall back to a no-op shim for SSR / Node environments.
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

const browserLocalStorage =
  typeof window !== 'undefined' && window.localStorage
    ? {
        getItem: (key: string): string | null => {
          try {
            return window.localStorage.getItem(key)
          } catch (_error) {
            // localStorage unavailable (private mode, storage quota) — fall back to null.
            return null
          }
        },
        setItem: (key: string, value: string): void => {
          try {
            window.localStorage.setItem(key, value)
          } catch (_error) {
            // Quota or privacy mode — silently ignore.
          }
        },
      }
    : undefined

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light',
  systemDefault: true,
  persistKey: 'molecule-theme',
  storage: browserLocalStorage,
})
export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
}
