import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface PrefRow {
  id: string
  label: string
  description: string
}

const NOTIFICATION_PREFS: PrefRow[] = [
  {
    id: 'comments',
    label: 'Comments on my recordings',
    description: 'Email + in-app push when someone replies, mentions you, or pins a comment.',
  },
  {
    id: 'views',
    label: 'New viewers',
    description: 'Daily digest of new viewers across your library.',
  },
  {
    id: 'weekly',
    label: 'Weekly engagement summary',
    description: 'Top recordings and trending viewer cohorts every Monday.',
  },
]

const RECORDING_PREFS: PrefRow[] = [
  {
    id: 'autoTrim',
    label: 'Auto-trim silence',
    description: `${APP_NAME} snips silence > 1.5s automatically when you stop recording.`,
  },
  {
    id: 'transcript',
    label: 'Generate transcript',
    description: 'AI-generated captions and chapter markers (English only for now).',
  },
  {
    id: 'mouseFx',
    label: 'Cursor highlights',
    description: 'Subtle ring animation around clicks during playback.',
  },
]

const HOTKEY_DEFAULTS: Record<string, string> = {
  start: '⌘ ⇧ G',
  pause: '⌘ ⇧ K',
  cam: '⌘ ⇧ B',
  mark: '⌘ ⇧ M',
}

const DEFAULT_NOTIF: Record<string, boolean> = { comments: true, views: false, weekly: true }
const DEFAULT_CAPTURE: Record<string, boolean> = {
  autoTrim: true,
  transcript: true,
  mouseFx: false,
}

interface ScreenSharingSettings {
  notif: Record<string, boolean>
  capture: Record<string, boolean>
  hotkeys: Record<string, string>
}

interface SettingsPayload {
  screenSharing?: Partial<ScreenSharingSettings>
  screenSharingProfile?: Record<string, unknown>
}

interface SettingsEnvelope {
  settings?: SettingsPayload
}

function extractSettings(payload: unknown): SettingsPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as SettingsEnvelope
  return data.settings ?? (payload as SettingsPayload)
}

function mergeSettings(stored?: Partial<ScreenSharingSettings>): ScreenSharingSettings {
  return {
    notif: { ...DEFAULT_NOTIF, ...(stored?.notif ?? {}) },
    capture: { ...DEFAULT_CAPTURE, ...(stored?.capture ?? {}) },
    hotkeys: { ...HOTKEY_DEFAULTS, ...(stored?.hotkeys ?? {}) },
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tab, setTab] = useState<'notifications' | 'capture' | 'hotkeys' | 'language'>(
    'notifications',
  )
  const [settings, setSettings] = useState<ScreenSharingSettings>(mergeSettings())
  const [savedSettings, setSavedSettings] = useState<ScreenSharingSettings>(mergeSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The platform user resource never returns `oauthData` on reads, so the
      // preference slice is served through the server-side /api/settings
      // channel, which reads and merges the stored row for the caller.
      const res = await http.get<SettingsEnvelope>('/api/settings')
      const stored = extractSettings(res?.data)?.screenSharing
      const merged = mergeSettings(stored)
      setSettings(merged)
      setSavedSettings(merged)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.error.load', {}, { defaultValue: 'Failed to load settings.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  )

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveStatus('idle')
    try {
      await http.patch<SettingsEnvelope>('/api/settings', {
        screenSharing: settings,
      })
      track({ name: 'settings.updated', properties: { surface: 'workspace-settings' } })
      setSavedSettings(settings)
      setSaveStatus('saved')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.saveFailed', {}, { defaultValue: 'Save failed.' }),
      )
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setSettings(savedSettings)
    setSaveStatus('idle')
    setError(null)
  }

  return (
    <div data-mol-id="settings-page" className={cm.cn(cm.stack(8), cm.maxW('xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-from)]',
            )}
          >
            settings
          </span>
          {t('settings.eyebrow', {}, { defaultValue: 'Workspace settings' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
          )}
        >
          {t(
            'settings.title',
            { appName: APP_NAME },
            { defaultValue: 'Tune {{appName}} to your team' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue:
                'Notification cadence, capture defaults, and hotkeys — all in one place.',
            },
          )}
        </p>
      </header>

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
        {(
          [
            { id: 'notifications', label: 'Notifications', icon: 'notifications' },
            { id: 'capture', label: 'Capture defaults', icon: 'videocam' },
            { id: 'hotkeys', label: 'Hotkeys', icon: 'keyboard' },
            { id: 'language', label: 'Language', icon: 'language' },
          ] as const
        ).map((item) => {
          const active = item.id === tab
          return (
            <button
              key={item.id}
              type="button"
              data-mol-id={`settings-tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'uppercase tracking-widest rounded-full transition-colors',
                active
                  ? 'text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/20'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>{item.icon}</span>
              {t(`settings.tab.${item.id}`, {}, { defaultValue: item.label })}
            </button>
          )
        })}
      </nav>

      {loading ? (
        <p
          data-mol-id="settings-loading"
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('settings.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          {tab === 'notifications' && (
            <section data-mol-id="settings-section-notifications" className={cm.cn(cm.stack(3))}>
              {NOTIFICATION_PREFS.map((p) => (
                <PrefCard
                  key={p.id}
                  molId={`settings-notif-${p.id}`}
                  icon="notifications_active"
                  label={t(`settings.notif.${p.id}.label`, {}, { defaultValue: p.label })}
                  description={t(
                    `settings.notif.${p.id}.body`,
                    {},
                    { defaultValue: p.description },
                  )}
                  enabled={settings.notif[p.id] ?? false}
                  onToggle={() =>
                    setSettings({
                      ...settings,
                      notif: { ...settings.notif, [p.id]: !settings.notif[p.id] },
                    })
                  }
                />
              ))}
            </section>
          )}

          {tab === 'capture' && (
            <section data-mol-id="settings-section-capture" className={cm.cn(cm.stack(3))}>
              {RECORDING_PREFS.map((p) => (
                <PrefCard
                  key={p.id}
                  molId={`settings-capture-${p.id}`}
                  icon="videocam"
                  label={t(`settings.capture.${p.id}.label`, {}, { defaultValue: p.label })}
                  description={t(
                    `settings.capture.${p.id}.body`,
                    {},
                    { defaultValue: p.description },
                  )}
                  enabled={settings.capture[p.id] ?? false}
                  onToggle={() =>
                    setSettings({
                      ...settings,
                      capture: { ...settings.capture, [p.id]: !settings.capture[p.id] },
                    })
                  }
                />
              ))}
            </section>
          )}

          {tab === 'hotkeys' && (
            <section
              data-mol-id="settings-section-hotkeys"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
              )}
            >
              <ul className={cm.cn(cm.stack(3))}>
                {Object.entries(settings.hotkeys).map(([id, combo]) => (
                  <li
                    key={id}
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}
                  >
                    <label className={cm.cn(cm.flex1, cm.flex({ align: 'center', gap: 3 }))}>
                      <span className={cm.cn(cm.flex1, cm.textSize('sm'), 'text-on-surface')}>
                        {t(`settings.hotkey.${id}`, {}, { defaultValue: id })}
                      </span>
                      <input
                        type="text"
                        data-mol-id={`settings-hotkey-${id}`}
                        value={combo}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            hotkeys: { ...settings.hotkeys, [id]: e.target.value },
                          })
                        }
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-md bg-surface-container text-on-surface text-xs font-mono border border-outline-variant min-w-[120px] text-right outline-none focus:ring-2 focus:ring-[var(--color-brand-gradient-from)]/40',
                        )}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === 'language' && (
            <section
              data-mol-id="settings-section-language"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
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
          )}

          {error ? (
            <p
              data-mol-id="settings-error"
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-error')}
            >
              {error}
            </p>
          ) : null}
          {saveStatus === 'saved' && !dirty ? (
            <p
              data-mol-id="settings-saved"
              role="status"
              className={cm.cn(cm.textSize('sm'), 'text-success')}
            >
              {t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' })}
            </p>
          ) : null}

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 2 }))}>
            <button
              type="button"
              data-mol-id="settings-cancel"
              onClick={handleCancel}
              disabled={!dirty || saving}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:bg-surface-container rounded-full transition-colors disabled:opacity-50',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              data-mol-id="settings-save"
              onClick={handleSave}
              disabled={!dirty || saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] hover:opacity-90 disabled:opacity-50 transition-opacity',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </>
      )}
      <section
        data-mol-id="settings-section-appearance"
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.stack(1)}>
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

function PrefCard({
  icon,
  label,
  description,
  enabled,
  onToggle,
  molId,
}: {
  icon: string
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'start', gap: 4 }),
        cm.sp('p', 5),
        'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 transition-transform',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(11),
          cm.h(11),
          'rounded-xl shrink-0',
          enabled
            ? 'bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white'
            : 'bg-surface-container text-on-surface-variant',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
      </div>
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-sm text-on-surface')}>{label}</div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1 leading-relaxed')}>
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={label}
        data-mol-id={molId}
        className={cm.cn(
          'relative inline-flex h-10 w-12 shrink-0 items-center rounded-full transition-colors',
          enabled
            ? 'bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]'
            : 'bg-surface-container',
        )}
      >
        <span
          className={cm.cn(
            'inline-block h-6 w-6 transform rounded-full bg-on-surface-variant shadow transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}
