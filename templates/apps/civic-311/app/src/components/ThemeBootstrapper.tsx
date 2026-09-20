import { useEffect } from 'react'

import { useAuth, useHttpClient } from '@molecule/app-react'

import { applyThemeAttribute, type ThemeValue } from '../lib/theme.js'

/**
 * Fetches the user's saved appearance preferences once after sign-in and
 * applies the saved theme to <html data-theme>. Without this, the theme
 * picker on /settings only takes effect inside that page — a reload of
 * /my-reports or /explore would silently fall back to the unsaved default.
 *
 * Keeping the helper at the layout level (rendered inside AuthGuard) means
 * it runs exactly when an authed user is present and re-runs on login,
 * which is when the saved preference becomes meaningful.
 */
export function ThemeBootstrapper() {
  const { user } = useAuth()
  const http = useHttpClient()
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<{
          preferences?: { theme?: ThemeValue }
        }>('/api/users/me')
        if (cancelled) return
        const me =
          (res as unknown as { data?: { preferences?: { theme?: ThemeValue } } })?.data ??
          (res as unknown as { preferences?: { theme?: ThemeValue } })
        const theme = me?.preferences?.theme
        if (theme) applyThemeAttribute(theme)
        // Failure to load saved theme is safe to ignore — the default theme stays applied
      } catch (_error) {
        // intentional noop — default theme remains in place
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, http])
  return null
}

export default ThemeBootstrapper
