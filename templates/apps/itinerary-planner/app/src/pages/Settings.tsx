/**
 * Settings — sectioned profile / preferences page rendered as the route
 * for `/settings`. Wraps the existing bespoke `<SettingsPanel>` (which
 * already contains email, password, 2FA, devices, billing, push, delete
 * account) inside a brand-led editorial header so /settings is a
 * full-fledged page rather than only a drawer.
 *
 * The drawer flavor of SettingsPanel (opened from UserMenu) calls
 * `onClose` to close the drawer; on the standalone page, "close" routes
 * back to the dashboard.
 *
 * Translated layout from crm/Settings (sectioned card list + brand
 * header) and project-management/UserSettings (route-based settings).
 */

import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { SettingsPanel } from '../components/SettingsPanel.js'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={cm.cn(
        cm.maxW('5xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Account & preferences' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
        >
          {t('settings.heading', {}, { defaultValue: 'Settings & profile.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('base'),
            cm.sp('mt', 2),
            cm.maxW('2xl'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'settings.subheading',
            {},
            {
              defaultValue:
                'Connected services, currency, push notifications, and the credentials you sign in with.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
        )}
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

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t('common.toggleLightDark', {}, { defaultValue: 'Toggle between light and dark mode.' })}
        </p>
        <ThemeToggle />
      </section>
      <section
        className={cm.cn(
          'bg-surface rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
        )}
      >
        <SettingsPanel onClose={() => navigate('/dashboard')} />
      </section>
    </div>
  )
}
