import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { applyTheme, getThemeMode, initThemeListener } from '../lib/theme.js'

const cm = getClassMap()

type Mode = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('system')

  useEffect(() => {
    setMode(getThemeMode())
    // The OS-theme listener this slice documents: `initThemeListener()`
    // re-applies the theme whenever the OS preference changes while the mode is
    // 'system' ("Toggle to System + change OS theme → app follows along without
    // reload", README → Verify). Nothing called it — the helper, and the
    // `matchMedia` change subscription inside it, were dead code — so choosing
    // System and then flipping the OS theme left the page on the old palette
    // until a reload. Idempotent: it applies the saved preference once and a
    // second call is a no-op.
    initThemeListener()
  }, [])

  function pick(next: Mode): void {
    setMode(next)
    applyTheme(next)
  }

  return (
    <div
      className={cm.flex({ direction: 'row', gap: 'xs' })}
      role="radiogroup"
      aria-label={t('theme.label', undefined, { defaultValue: 'Theme' })}
    >
      <button
        onClick={() => pick('light')}
        className={cm.button({ variant: mode === 'light' ? 'solid' : 'outline', size: 'sm' })}
        aria-pressed={mode === 'light'}
      >
        {t('theme.light', undefined, { defaultValue: 'Light' })}
      </button>
      <button
        onClick={() => pick('dark')}
        className={cm.button({ variant: mode === 'dark' ? 'solid' : 'outline', size: 'sm' })}
        aria-pressed={mode === 'dark'}
      >
        {t('theme.dark', undefined, { defaultValue: 'Dark' })}
      </button>
      <button
        onClick={() => pick('system')}
        className={cm.button({ variant: mode === 'system' ? 'solid' : 'outline', size: 'sm' })}
        aria-pressed={mode === 'system'}
      >
        {t('theme.system', undefined, { defaultValue: 'System' })}
      </button>
    </div>
  )
}
