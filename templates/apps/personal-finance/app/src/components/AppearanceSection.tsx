import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function AppearanceSection() {
  const cm = getClassMap()
  const { themeName, setTheme } = useTheme()
  const { t } = useTranslation()
  const activeClass = cm.cn(
    cm.flex1,
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.sp('py', 3),
    cm.fontWeight('bold'),
    cm.textSize('sm'),
    'bg-surface text-success rounded-lg shadow-sm',
  )
  const inactiveClass = cm.cn(
    cm.flex1,
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.sp('py', 3),
    cm.fontWeight('bold'),
    cm.textSize('sm'),
    'text-foreground-secondary hover:text-success rounded-lg transition-all',
  )
  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'text-success')}
      >
        {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
      </h2>
      <div className={cm.cn(cm.flex({}), cm.sp('p', 1), 'bg-surface-container-low rounded-xl')}>
        <button
          className={themeName === 'light' ? activeClass : inactiveClass}
          onClick={() => setTheme('light')}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            data-icon="light_mode"
          >
            light_mode
          </span>

          {t('appearanceSection.lightMode', {}, { defaultValue: 'Light' })}
        </button>
        <button
          className={themeName === 'dark' ? activeClass : inactiveClass}
          onClick={() => setTheme('dark')}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            data-icon="dark_mode"
          >
            dark_mode
          </span>

          {t('appearanceSection.darkMode', {}, { defaultValue: 'Dark' })}
        </button>
        <button
          className={themeName === 'system' ? activeClass : inactiveClass}
          onClick={() => setTheme('system')}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            data-icon="settings_brightness"
          >
            settings_brightness
          </span>

          {t('appearanceSection.systemMode', {}, { defaultValue: 'System' })}
        </button>
      </div>
    </section>
  )
}

export default AppearanceSection
export { AppearanceSection }
