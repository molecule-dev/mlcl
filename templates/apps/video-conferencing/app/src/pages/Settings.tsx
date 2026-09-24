import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface UserProfile {
  id: string
  name?: string
  email?: string
  username?: string
}

const SECTIONS: ReadonlyArray<{
  id: string
  icon: string
  titleKey: string
  defaultTitle: string
}> = [
  { id: 'profile', icon: 'person', titleKey: 'settings.profile', defaultTitle: 'Profile' },
  { id: 'devices', icon: 'tune', titleKey: 'settings.devices', defaultTitle: 'Devices & quality' },
  {
    id: 'notifications',
    icon: 'notifications',
    titleKey: 'settings.notifications',
    defaultTitle: 'Notifications',
  },
  { id: 'language', icon: 'translate', titleKey: 'settings.language', defaultTitle: 'Language' },
  {
    id: 'integrations',
    icon: 'extension',
    titleKey: 'settings.integrations',
    defaultTitle: 'Integrations',
  },
]

const INTEGRATIONS: ReadonlyArray<{ name: string; description: string; connected: boolean }> = [
  {
    name: 'Google Calendar',
    description: `Auto-create ${APP_NAME} links on every event.`,
    connected: true,
  },
  { name: 'Slack', description: 'Post recordings + transcripts to a channel.', connected: true },
  {
    name: 'Notion',
    description: 'Sync transcripts to your meeting notes database.',
    connected: false,
  },
  { name: 'HubSpot', description: 'Log calls + transcripts to deal records.', connected: false },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<UserProfile>()
  const [active, setActive] = useState('profile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setUsername(user.username ?? '')
    }
  }, [user])

  const saveProfile = useCallback(async () => {
    if (!user?.id) return
    setSaving(true)
    setSaveStatus('idle')
    setSaveError(null)
    try {
      await http.patch(`/api/users/${user.id}`, {
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        username: username.trim() || undefined,
      })
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [email, http, name, user?.id, username])

  return (
    <div className={cm.stack(8)}>
      <header className={cm.stack(2)}>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Profile, devices, video and audio preferences, integrations.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-[220px_1fr]')}>
        <nav className={cm.stack(1)}>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 3 }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl transition-colors text-left',
                active === section.id
                  ? 'bg-primary-container/40 text-primary border-l-4 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                {section.icon}
              </span>
              <span>{t(section.titleKey, {}, { defaultValue: section.defaultTitle })}</span>
            </button>
          ))}
        </nav>

        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          {active === 'profile' && (
            <div className={cm.stack(6)} data-testid="profile-form">
              <SettingsField
                label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                value={name}
                onChange={setName}
                ariaLabel="Display name"
              />
              <SettingsField
                label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                value={email}
                onChange={setEmail}
                type="email"
                ariaLabel="Work email"
              />
              <SettingsField
                label={t('auth.username', {}, { defaultValue: 'Username' })}
                value={username}
                onChange={setUsername}
                ariaLabel="Username"
              />
              {saveError && (
                <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                  {saveError}
                </p>
              )}
              {saveStatus === 'saved' && (
                <p
                  role="status"
                  data-testid="profile-saved"
                  className={cm.cn(cm.textSize('sm'), 'text-success')}
                >
                  {t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' })}
                </p>
              )}
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                data-testid="save-profile"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'self-start bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                  : t('common.save', {}, { defaultValue: 'Save' })}
              </button>
            </div>
          )}
          {active === 'devices' && (
            <div className={cm.stack(6)}>
              <ReadonlyField label="Default microphone" value="MacBook Pro Mic" />
              <ReadonlyField label="Default camera" value="FaceTime HD Camera" />
              <ReadonlyField label="Default speaker" value="MacBook Pro Speakers" />
              <SettingsToggle label="Auto-mute when joining a meeting" defaultEnabled />
              <SettingsToggle label="HD video (uses more bandwidth)" defaultEnabled />
              <SettingsToggle label="Mirror my self-view" defaultEnabled={false} />
            </div>
          )}
          {active === 'notifications' && (
            <div className={cm.stack(6)}>
              <SettingsToggle label="Meeting invites" defaultEnabled />
              <SettingsToggle label="Mentions in chat" defaultEnabled />
              <SettingsToggle label="Recording is ready" defaultEnabled />
              <SettingsToggle label="Transcript is ready" defaultEnabled={false} />
              <SettingsToggle label="Hand raised in your meeting" defaultEnabled />
            </div>
          )}
          {active === 'language' && (
            <div className={cm.stack(4)}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
          )}
          {active === 'integrations' && (
            <div className={cm.stack(3)}>
              {INTEGRATIONS.map((integration) => (
                <div
                  key={integration.name}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 5),
                    'bg-surface rounded-xl border border-outline-variant/40',
                  )}
                >
                  <div className={cm.stack(1)}>
                    <h4 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {integration.name}
                    </h4>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {integration.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      'transition-colors',
                      integration.connected
                        ? 'bg-success/15 text-success'
                        : 'bg-primary text-on-primary hover:bg-primary-dark',
                    )}
                  >
                    {integration.connected
                      ? t('status.connected', {}, { defaultValue: 'Connected' })
                      : t('common.connect', {}, { defaultValue: 'Connect' })}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            // Third grid child: spans the full row from md up, otherwise it
            // would wrap into the 220px nav column and cram the toggle.
            'md:col-span-2 bg-surface-container-low rounded-xl',
          )}
        >
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
    </div>
  )
}

function SettingsField({
  label,
  value,
  onChange,
  type = 'text',
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  ariaLabel: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          'rounded-xl bg-surface border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all',
        )}
      />
    </label>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <p
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          'rounded-xl bg-surface border border-outline-variant/40 text-on-surface-variant',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function SettingsToggle({ label, defaultEnabled }: { label: string; defaultEnabled: boolean }) {
  const cm = getClassMap()
  const [enabled, setEnabled] = useState(defaultEnabled)
  return (
    <div className={cm.flex({ align: 'center', justify: 'between', gap: 4 })}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
        {label}
      </span>
      <Switch
        checked={enabled}
        onChange={(e) => setEnabled((e.target as HTMLInputElement).checked)}
        aria-label={label}
      />
    </div>
  )
}
