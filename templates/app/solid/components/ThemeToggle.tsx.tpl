import { createTheme, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'

export function ThemeToggle() {
  const cm = getClassMap()
  const t = useTranslate()
  const { mode, toggleTheme } = createTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t('theme.toggle')}
      class={cm.themeToggleButton}
    >
      {mode() === 'dark' ? (
        <Icon name="moon" size={20} />
      ) : (
        <Icon name="sun" size={20} />
      )}
    </button>
  )
}
