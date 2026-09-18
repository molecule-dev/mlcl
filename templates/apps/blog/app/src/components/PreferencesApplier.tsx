import { useEffect } from 'react'

import { useAuth, useHttpClient } from '@molecule/app-react'

interface ProfileResponse {
  id: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    fontSize: 'small' | 'medium' | 'large'
  }
}

function applyThemeAndFontSize(
  theme: 'light' | 'dark' | 'system',
  fontSize: 'small' | 'medium' | 'large',
) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme
  root.dataset.theme = resolved
  root.dataset.fontSize = fontSize
}

/**
 * Loads the current user's saved preferences (theme/font size) and
 * applies them to <html> on every authenticated session start so the
 * setting actually persists across reloads.
 */
export function PreferencesApplier() {
  const http = useHttpClient()
  const { user } = useAuth()
  const userId = (user as { id?: string } | null)?.id ?? null

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    http
      .get<ProfileResponse>('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        const p = payload?.preferences
        if (!p) return
        applyThemeAndFontSize(p.theme, p.fontSize)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, userId])

  return null
}

export default PreferencesApplier
