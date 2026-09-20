// Light helper to apply the user's theme preference to the document.
//
// Saved theme lives in `users.oauthData.preferences.theme` and is read on
// every Settings page load. The actual DOM application is delegated to the
// theme bond (`themeProvider.setTheme(...)`), which owns BOTH dark-mode
// surfaces consistently:
//   - <html data-mol-mode="light|dark"> (the CSS-variable token block)
//   - <html class="dark">              (Tailwind `dark:` variants)
// Hand-toggling only one of those (the old behavior) left the UI half-dark.
//
// We additionally mirror the *unresolved* preference onto
// <html data-theme="light|dark|system"> so the Settings picker can render
// the saved "system" choice correctly on reload.
//
// `system` resolves to `prefers-color-scheme` at apply time.

import { themeProvider } from '../bonds/app-theme-css-variables.js'

export type ThemeValue = 'light' | 'dark' | 'system'

export function applyThemeAttribute(theme: ThemeValue): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = theme
  let resolved: 'light' | 'dark' = 'light'
  if (theme === 'dark') resolved = 'dark'
  else if (theme === 'system') {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    resolved = mql?.matches ? 'dark' : 'light'
  }
  root.dataset.themeResolved = resolved
  themeProvider.setTheme(resolved)
}
