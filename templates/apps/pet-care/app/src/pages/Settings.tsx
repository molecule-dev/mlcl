import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { SettingsPanel } from '../components/SettingsPanel.js'

/**
 * Full-page Settings route. Re-uses the SettingsPanel component that
 * powers the user-menu modal so all functional settings (email,
 * password, 2FA, push notifications, devices, billing, delete account)
 * stay in one place. Navigating away with the Close button takes the
 * user back to the dashboard.
 */
export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-settings">
      <div className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Manage your profile, security, billing, and notifications.' },
          )}
        </p>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.sp('mb', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm',
        )}
        data-mol-id="settings-language"
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <div className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}>
        <SettingsPanel onClose={() => navigate('/dashboard')} />
      </div>
    </div>
  )
}
