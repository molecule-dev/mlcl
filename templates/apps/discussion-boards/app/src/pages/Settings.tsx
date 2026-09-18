import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { SettingsPanel } from '../components/SettingsPanel.js'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.stack(6), 'mx-auto w-full max-w-[820px]')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue:
                'Profile, security, notifications, devices, and danger-zone controls — all in one place.',
            },
          )}
        </p>
      </header>
      <div
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
      >
        <SettingsPanel onClose={() => {}} />
      </div>
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'settings.appearance.description',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  )
}

export default Settings
