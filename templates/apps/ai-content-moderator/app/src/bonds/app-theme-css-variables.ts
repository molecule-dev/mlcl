/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 *
 * The molecule theme provider sets `data-mol-mode` on `<html>` when the
 * theme switches, but the app's theme.css and Playwright specs reach for
 * the more conventional `data-theme` attribute. Subscribe to theme
 * changes and mirror the current mode onto `data-theme` so CSS toggles
 * and the e2e theme spec see the change immediately.
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

// localStorage adapter — without this the persistKey is a no-op and the
// theme always resets to defaultTheme on reload.
const browserStorage =
  typeof window !== 'undefined'
    ? {
        getItem: (key: string) => {
          try {
            return window.localStorage.getItem(key)
          } catch (_error) {
            // localStorage may be disabled (private mode or restrictive browser policy)
            return null
          }
        },
        setItem: (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value)
          } catch (_error) {
            // localStorage may be disabled (private mode or restrictive browser policy)
          }
        },
      }
    : undefined

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'dark',
  persistKey: 'molecule-theme',
  storage: browserStorage,
})

function mirrorThemeAttr(): void {
  if (typeof document === 'undefined') return
  const apply = (mode: 'light' | 'dark'): void => {
    document.documentElement.setAttribute('data-theme', mode)
  }
  apply(themeProvider.getTheme().mode)
  themeProvider.subscribe((theme): void => apply(theme.mode))
}

export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
  mirrorThemeAttr()
}
