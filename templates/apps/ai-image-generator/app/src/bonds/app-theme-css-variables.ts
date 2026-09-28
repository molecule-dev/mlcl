/**
 * AppThemeCssVariables bond setup
 *
 * Wires @molecule/app-theme-css-variables to @molecule/app-theme.
 * Exports themeProvider for use in MoleculeProvider.
 */

import { setProvider } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'

// `persistKey` requires a `storage` adapter — without it, the provider
// silently skips persistence and the user's theme choice is lost on
// reload. Use the browser's `localStorage` when available, with a no-op
// fallback for SSR / Node environments where `window` is undefined.
const browserLocalStorage =
  typeof window !== 'undefined' && window.localStorage
    ? {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) => {
          window.localStorage.setItem(key, value)
        },
      }
    : {
        getItem: () => null,
        setItem: () => undefined,
      }

export const themeProvider = createCSSVariablesThemeProvider({
  themes: [lightTheme, darkTheme],
  defaultTheme: 'light', // the Stitch design is a light page
  persistKey: 'molecule-theme',
  storage: browserLocalStorage,
})

/**
 * Sync the theme provider's mode to a `.dark` class on
 * `<html>` so the project's Tailwind `@custom-variant dark
 * (&:where(.dark, .dark *))` rule actually fires. The bond already sets
 * `data-mol-theme` / `data-mol-mode` for its own selectors, but Tailwind
 * dark utilities (`dark:bg-...`) won't apply without the class.
 */
function syncTailwindDarkClass(): void {
  if (typeof document === 'undefined') return
  const isDark = themeProvider.getTheme().mode === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
}

export function setupAppThemeCssVariables(): void {
  setProvider(themeProvider)
  // Re-apply this app's theme to the document. createCSSVariablesThemeProvider
  // applies its palette on construction, and setupAllDefaultBonds() — called
  // first — constructs the default (blue) provider, overwriting this app's
  // values. Re-applying here makes the custom theme win regardless of order.
  themeProvider.setTheme(themeProvider.getTheme())
  syncTailwindDarkClass()
  themeProvider.subscribe(syncTailwindDarkClass)
}
