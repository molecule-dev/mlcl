import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import { SettingsPanel } from '../components/SettingsPanel.js'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const displayName = useMemo(() => {
    const raw = (user as { name?: string; email?: string } | null | undefined)?.name?.trim()
    if (raw) return raw
    const email = (user as { email?: string } | null | undefined)?.email
    if (email) return email.split('@')[0]
    return t('settings.identity.fallbackName', {}, { defaultValue: 'Account holder' })
  }, [user, t])

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  const email = (user as { email?: string } | null | undefined)?.email ?? ''

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('settings.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('nav.settings', {}, { defaultValue: 'Settings' }) },
      ]}
      showSearch={false}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.maxW('4xl'),
          'mx-auto w-full',
        )}
        data-mol-id="settings-page"
      >
        <section
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-gradient-to-br from-primary-container/15 to-tertiary-container/15 border border-outline-variant/15',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'text-2xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary shrink-0',
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.identity.eyebrow', {}, { defaultValue: 'Signed in as' })}
            </p>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
              {displayName}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {email || t('settings.identity.noEmail', {}, { defaultValue: 'No email on file' })}
            </p>
          </div>
        </section>

        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden',
          )}
        >
          <SettingsPanel onClose={() => navigate('/files')} />
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15',
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
      </div>
    </NimbusFilesLayout>
  )
}

export default Settings
