import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { SettingsPanel } from '../components/SettingsPanel.js'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div data-mol-id="page-settings" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-primary)' }}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-3xl tracking-tight')}>
          {t('settings.title', {}, { defaultValue: 'Settings & preferences.' })}
        </h1>
        <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'max-w-2xl')}>
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue:
                'Tune notifications, security, devices, and data export — everything stays here, on your terms.',
            },
          )}
        </p>
      </header>

      <section
        style={{
          background: 'var(--color-surface, var(--mol-color-surface))',
          borderRadius: '20px',
          border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          overflow: 'hidden',
        }}
      >
        <SettingsPanel onClose={() => navigate('/dashboard')} />
      </section>
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
