import { useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

import { applyTheme, getThemeMode } from '../lib/theme.js'

const cm = getClassMap()

type Mode = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('system')

  useEffect(() => {
    setMode(getThemeMode())
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
