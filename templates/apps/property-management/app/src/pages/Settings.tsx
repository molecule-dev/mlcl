import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from '../components/SettingsPanel.js'

const SECTIONS = [
  {
    key: 'company',
    icon: 'business',
    defaultLabel: 'Account',
    defaultBody: 'Email, password, two-factor, sessions, push notifications, and account deletion.',
    defaultAction: 'Open account settings',
    target: 'panel',
  },
  {
    key: 'billing',
    icon: 'credit_card',
    defaultLabel: 'Billing',
    defaultBody: 'View available plans, upgrade or downgrade, and manage your subscription.',
    defaultAction: 'View plans',
    target: '/pricing',
  },
  {
    key: 'notifications',
    icon: 'notifications',
    defaultLabel: 'Notifications',
    defaultBody: 'See activity across your portfolio and mark notifications as read.',
    defaultAction: 'Open notifications',
    target: '/notifications',
  },
  {
    key: 'reports',
    icon: 'insights',
    defaultLabel: 'Reports',
    defaultBody: 'Portfolio-wide KPIs, occupancy, revenue, and breakdowns by property.',
    defaultAction: 'Open reports',
    target: '/reports',
  },
  {
    key: 'finances',
    icon: 'account_balance',
    defaultLabel: 'Finances',
    defaultBody: 'Rent roll, payments collected, outstanding amounts, and CSV export.',
    defaultAction: 'Open finances',
    target: '/finances',
  },
  {
    key: 'maintenance',
    icon: 'build',
    defaultLabel: 'Maintenance',
    defaultBody: 'Track work orders, vendor messages, and ticket history.',
    defaultAction: 'Open maintenance',
    target: '/maintenance',
  },
] as const

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [panelOpen, setPanelOpen] = useState(false)

  const handleClick = (target: string) => {
    if (target === 'panel') setPanelOpen(true)
    else navigate(target)
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Configure {{appName}} for your portfolio, your team, and your tenants.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
        {SECTIONS.map((s) => (
          <section
            key={s.key}
            className={cm.cn(
              cm.sp('p', 6),
              cm.flex({ direction: 'col', gap: 'md' }),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  'bg-primary/10 text-primary',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{s.icon}</span>
              </span>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t(`settings.section.${s.key}.title`, {}, { defaultValue: s.defaultLabel })}
              </h2>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(`settings.section.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
            </p>
            <button
              type="button"
              onClick={() => handleClick(s.target)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                cm.flex({ align: 'center', gap: 'xs' }),
                'self-start bg-primary text-on-primary hover:bg-primary/90',
              )}
            >
              {t(`settings.section.${s.key}.action`, {}, { defaultValue: s.defaultAction })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </section>
        ))}
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('settings.language.title', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-surface-container-lowest rounded-2xl border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.toggleLightDark', {}, { defaultValue: 'Toggle between light and dark mode.' })}
        </p>
        <ThemeToggle />
      </section>
      {panelOpen && <SettingsPanel onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
