import { createTheme, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'

/**
 * Button that flips the wired theme bond between light and dark.
 *
 * Reads `mode` and `toggleTheme` from `createTheme()` and shows the
 * configured dark/light icon accordingly. Ships with molecule
 * conventions out of the box:
 *
 * - `data-mol-id="theme-toggle"` for AI-agent / e2e selection
 * - `data-mode={mode}` so tests can assert current state via DOM
 * - `aria-pressed={mode() === 'dark'}` for screen-reader state
 * - `aria-label` from the `theme.toggle` i18n key (default `"Toggle theme"`)
 */
export function ThemeToggle() {
  const cm = getClassMap()
  const t = useTranslate()
  const { mode, toggleTheme } = createTheme()

  return (
    <button
      type="button"
      data-mol-id="theme-toggle"
      data-mode={mode()}
      aria-pressed={mode() === 'dark'}
      aria-label={t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
      onClick={toggleTheme}
      class={cm.themeToggleButton}
    >
      {mode() === 'dark' ? <Icon name="moon" size={20} /> : <Icon name="sun" size={20} />}
    </button>
  )
}
