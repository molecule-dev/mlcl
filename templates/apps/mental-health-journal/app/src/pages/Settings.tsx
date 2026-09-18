import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { applyThemeAttribute } from '../lib/theme.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ToggleSetting {
  key: 'passcode' | 'encryption' | 'cloud_backup' | 'analytics'
  defaultLabel: string
  defaultDescription: string
  initial: boolean
}

const PRIVACY_TOGGLES: ToggleSetting[] = [
  {
    key: 'passcode',
    defaultLabel: 'App passcode lock',
    defaultDescription: 'Require Face ID, Touch ID, or a 4-digit passcode to open the app.',
    initial: true,
  },
  {
    key: 'encryption',
    defaultLabel: 'End-to-end encryption',
    defaultDescription: 'Your entries are encrypted on this device. Only you can read them.',
    initial: true,
  },
  {
    key: 'cloud_backup',
    defaultLabel: 'Encrypted cloud backup',
    defaultDescription: 'Sync entries across your devices, encrypted with a key only you know.',
    initial: false,
  },
  {
    key: 'analytics',
    defaultLabel: 'Anonymous product analytics',
    defaultDescription:
      'Help us improve {{appName}} by sharing crash and feature usage data — never your words.',
    initial: false,
  },
]

const REMINDER_TIMES = ['07:30', '12:00', '17:00', '21:00', '22:30']

const EXPORT_FORMATS = [
  {
    key: 'json',
    label: 'JSON',
    icon: 'data_object',
    mime: 'application/json',
    filename: 'lucid-journal.json',
  },
  {
    key: 'csv',
    label: 'CSV',
    icon: 'table_chart',
    mime: 'text/csv',
    filename: 'lucid-journal.csv',
  },
  {
    key: 'txt',
    label: 'Text',
    icon: 'description',
    mime: 'text/plain',
    filename: 'lucid-journal.txt',
  },
] as const

interface PreferencesPayload {
  privacy: Record<ToggleSetting['key'], boolean>
  reminder: { enabled: boolean; time: string }
  theme: 'system' | 'light' | 'dark'
  wellness: Record<string, number>
  favorite_prompts: string[]
}

const DEFAULTS: PreferencesPayload = {
  privacy: { passcode: true, encryption: true, cloud_backup: false, analytics: false },
  reminder: { enabled: true, time: '21:00' },
  theme: 'system',
  wellness: {},
  favorite_prompts: [],
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()

  const [prefs, setPrefs] = useState<PreferencesPayload>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/journal/preferences')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<PreferencesPayload>(res)
        if (data) {
          const merged: PreferencesPayload = {
            ...DEFAULTS,
            ...data,
            privacy: { ...DEFAULTS.privacy, ...(data.privacy ?? {}) },
            reminder: { ...DEFAULTS.reminder, ...(data.reminder ?? {}) },
            wellness: { ...DEFAULTS.wellness, ...(data.wellness ?? {}) },
          }
          setPrefs(merged)
          applyThemeAttribute(merged.theme)
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const persist = async (label: string, patch: Partial<PreferencesPayload>) => {
    setSaving(label)
    setFeedback(null)
    try {
      const res = await http.put('/api/journal/preferences', patch)
      const data = unwrapSingle<PreferencesPayload>(res)
      if (data) {
        const merged: PreferencesPayload = {
          ...DEFAULTS,
          ...data,
          privacy: { ...DEFAULTS.privacy, ...(data.privacy ?? {}) },
          reminder: { ...DEFAULTS.reminder, ...(data.reminder ?? {}) },
          wellness: { ...DEFAULTS.wellness, ...(data.wellness ?? {}) },
        }
        setPrefs(merged)
        if (patch.theme) applyThemeAttribute(merged.theme)
      }
      setFeedback(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Could not save.' }),
      )
    } finally {
      setSaving(null)
    }
  }

  const togglePrivacy = (key: ToggleSetting['key']) => {
    const next = !prefs.privacy[key]
    setPrefs((prev) => ({ ...prev, privacy: { ...prev.privacy, [key]: next } }))
    void persist('privacy', { privacy: { ...prefs.privacy, [key]: next } })
  }

  const setReminderEnabled = (enabled: boolean) => {
    setPrefs((prev) => ({ ...prev, reminder: { ...prev.reminder, enabled } }))
    void persist('reminder', { reminder: { ...prefs.reminder, enabled } })
  }

  const setReminderTime = (time: string) => {
    setPrefs((prev) => ({ ...prev, reminder: { ...prev.reminder, time } }))
    void persist('reminder', { reminder: { ...prefs.reminder, time } })
  }

  const setTheme = (theme: 'system' | 'light' | 'dark') => {
    setPrefs((prev) => ({ ...prev, theme }))
    applyThemeAttribute(theme)
    void persist('theme', { theme })
  }

  const exportData = async (format: (typeof EXPORT_FORMATS)[number]) => {
    setExportError(null)
    setSaving(`export-${format.key}`)
    try {
      const url = `/api/journal/export/${format.key}`
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) throw new Error(`Export failed (${response.status})`)
      const blob = await response.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = format.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
      setFeedback(
        t(
          'settings.exportDone',
          { format: format.label },
          { defaultValue: 'Exported {{format}}.' },
        ),
      )
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : t('settings.exportError', {}, { defaultValue: 'Export failed.' }),
      )
    } finally {
      setSaving(null)
    }
  }

  const deleteAccount = async () => {
    if (!user?.id) return
    setDeleting(true)
    setFeedback(null)
    try {
      await http.delete(`/api/users/${user.id}`)
      await logout()
      navigate('/', { replace: true })
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : t('settings.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Your space, your rules' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-xl bg-primary-container text-on-primary-container',
          )}
        >
          {feedback}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.privacyHeading', {}, { defaultValue: 'Privacy & encryption' })}
        </h2>
        <ul className="divide-y divide-outline-variant">
          {PRIVACY_TOGGLES.map((setting) => {
            const on = !!prefs.privacy[setting.key]
            return (
              <li
                key={setting.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('py', 4),
                )}
              >
                <div className={cm.flex1}>
                  <p
                    className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {t(
                      `settings.toggle.${setting.key}.label`,
                      {},
                      { defaultValue: setting.defaultLabel },
                    )}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      `settings.toggle.${setting.key}.description`,
                      { appName: APP_NAME },
                      { defaultValue: setting.defaultDescription },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePrivacy(setting.key)}
                  aria-pressed={on}
                  data-testid={`privacy-toggle-${setting.key}`}
                  aria-label={t(
                    'settings.toggleAria',
                    {
                      label: t(
                        `settings.toggle.${setting.key}.label`,
                        {},
                        { defaultValue: setting.defaultLabel },
                      ),
                    },
                    { defaultValue: 'Toggle {{label}}' },
                  )}
                  disabled={!loaded}
                  className={cm.cn(
                    'relative w-14 h-8 rounded-full transition-colors shrink-0 disabled:opacity-50',
                    on ? 'shadow-md' : 'bg-surface-container',
                  )}
                  style={
                    on
                      ? {
                          background:
                            'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                        }
                      : undefined
                  }
                >
                  <span
                    className={cm.cn(
                      'absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform',
                      on ? 'translate-x-7' : 'translate-x-1',
                    )}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.remindersHeading', {}, { defaultValue: 'Daily reminder' })}
        </h2>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'flex-wrap',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t('settings.reminderToggleLabel', {}, { defaultValue: 'Send a gentle nudge' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'settings.reminderToggleDescription',
                {},
                {
                  defaultValue:
                    'A single calm reminder at the time you choose. No badges or streak guilt.',
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReminderEnabled(!prefs.reminder.enabled)}
            aria-pressed={prefs.reminder.enabled}
            data-testid="reminder-toggle"
            disabled={!loaded}
            className={cm.cn(
              'relative w-14 h-8 rounded-full transition-colors shrink-0 disabled:opacity-50',
              prefs.reminder.enabled ? 'shadow-md' : 'bg-surface-container',
            )}
            style={
              prefs.reminder.enabled
                ? {
                    background:
                      'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                  }
                : undefined
            }
          >
            <span
              className={cm.cn(
                'absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform',
                prefs.reminder.enabled ? 'translate-x-7' : 'translate-x-1',
              )}
            />
          </button>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {REMINDER_TIMES.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => setReminderTime(time)}
              disabled={!prefs.reminder.enabled || !loaded}
              data-testid={`reminder-time-${time}`}
              aria-pressed={prefs.reminder.time === time}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'rounded-full text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                prefs.reminder.time === time
                  ? 'text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              style={
                prefs.reminder.time === time
                  ? {
                      background:
                        'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                    }
                  : undefined
              }
            >
              {time}
            </button>
          ))}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-3')}>
          {(['system', 'light', 'dark'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setTheme(opt)}
              data-testid={`theme-${opt}`}
              aria-pressed={prefs.theme === opt}
              disabled={!loaded}
              className={cm.cn(
                cm.sp('p', 4),
                cm.fontWeight('bold'),
                'rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50',
                prefs.theme === opt
                  ? 'text-white shadow-md'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              style={
                prefs.theme === opt
                  ? {
                      background:
                        'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                    }
                  : undefined
              }
            >
              <span className="material-symbols-outlined">
                {opt === 'system'
                  ? 'settings_brightness'
                  : opt === 'light'
                    ? 'light_mode'
                    : 'dark_mode'}
              </span>
              {t(
                `settings.theme.${opt}`,
                {},
                { defaultValue: opt[0].toUpperCase() + opt.slice(1) },
              )}
            </button>
          ))}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.languageHeading', {}, { defaultValue: 'Language' })}
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
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.exportHeading', {}, { defaultValue: 'Export your reflections' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.exportDescription',
            {},
            { defaultValue: 'Your words always belong to you. Download a copy any time.' },
          )}
        </p>
        {exportError ? (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {exportError}
          </p>
        ) : null}
        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-3')}>
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => exportData(f)}
              disabled={saving === `export-${f.key}`}
              data-testid={`export-${f.key}`}
              className={cm.cn(
                cm.sp('p', 4),
                cm.fontWeight('bold'),
                'rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-wait',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: 'var(--mol-color-primary)' }}
              >
                {f.icon}
              </span>
              {saving === `export-${f.key}`
                ? t('settings.exportLoading', {}, { defaultValue: 'Preparing…' })
                : t(`settings.export.${f.key}`, {}, { defaultValue: f.label })}
            </button>
          ))}
        </div>
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl space-y-3 border-2 border-error/30')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-error',
          )}
        >
          {t('settings.dangerHeading', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.dangerDescription',
            {},
            {
              defaultValue:
                'Permanently delete your account and every reflection. This cannot be undone.',
            },
          )}
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            data-testid="delete-account-open"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className="material-symbols-outlined">delete_forever</span>
            {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        ) : (
          <div className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container space-y-3')}>
            <p
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-error-container')}
            >
              {t(
                'settings.deleteConfirm',
                {},
                {
                  defaultValue:
                    'Are you absolutely sure? This permanently deletes your account and every reflection.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                data-testid="delete-account-confirm"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full bg-error text-on-error hover:bg-error/90 transition-colors disabled:opacity-50',
                )}
              >
                {deleting
                  ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                  : t(
                      'settings.deleteAccountConfirmCta',
                      {},
                      { defaultValue: 'Yes, delete forever' },
                    )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-full border-2 border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
