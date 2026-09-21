import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import SettingsNotificationsSection from '../components/SettingsNotificationsSection.js'
import SettingsProfileForm from '../components/SettingsProfileForm.js'

export function SettingsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
      className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6 max-w-4xl')}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.subtitle',
              {},
              { defaultValue: 'Manage your profile and notification preferences.' },
            )}
          </p>
        </div>
        <Link
          to="/pricing"
          data-mol-id="settings-pricing-link"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-lg border border-outline-variant/30 hover:bg-surface-container-low',
          )}
        >
          {t('settings.viewPricing', {}, { defaultValue: 'View pricing' })}
        </Link>
      </header>
      <SettingsProfileForm />
      <SettingsNotificationsSection />
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
        </div>
        <LanguagePicker />
      </section>
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
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
    </div>
  )
}

export default SettingsPage
export { SettingsPage as Settings }
