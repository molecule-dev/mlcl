import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'

export function ThemeToggle() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('theme.toggle')}
      className={cm.themeToggleButton}
    >
      {mode === 'dark' ? (
        <Icon name="moon" size={20} />
      ) : (
        <Icon name="sun" size={20} />
      )}
    </button>
  )
}
