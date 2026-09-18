import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface ToggleRow {
  key: string
  defaultLabel: string
  defaultDescription: string
}

const PRIVACY_TOGGLES: ReadonlyArray<ToggleRow> = [
  {
    key: 'transcripts',
    defaultLabel: 'Save transcripts',
    defaultDescription: 'Keep a searchable history of every conversation.',
  },
  {
    key: 'training',
    defaultLabel: 'Improve voice models',
    defaultDescription: "Anonymous samples help {{appName}}'s models hear you better.",
  },
  {
    key: 'cloudBackup',
    defaultLabel: 'Cloud backup',
    defaultDescription: 'Encrypted backups across your signed-in devices.',
  },
]

const NOTIFICATION_TOGGLES: ReadonlyArray<ToggleRow> = [
  {
    key: 'reminders',
    defaultLabel: 'Daily check-in',
    defaultDescription: 'A short voice prompt to start the morning.',
  },
  {
    key: 'productUpdates',
    defaultLabel: 'Product updates',
    defaultDescription: 'Occasional emails about new agents and voices.',
  },
  {
    key: 'weeklyDigest',
    defaultLabel: 'Weekly recap',
    defaultDescription: 'A summary of how you talked this week.',
  },
]

interface VoiceOption {
  voiceId: string
  name: string
  provider?: string
}

const FALLBACK_VOICES: ReadonlyArray<VoiceOption> = [
  { voiceId: 'alloy', name: 'Alloy', provider: 'openai' },
  { voiceId: 'echo', name: 'Echo', provider: 'openai' },
  { voiceId: 'fable', name: 'Fable', provider: 'openai' },
  { voiceId: 'onyx', name: 'Onyx', provider: 'openai' },
  { voiceId: 'nova', name: 'Nova', provider: 'openai' },
  { voiceId: 'shimmer', name: 'Shimmer', provider: 'openai' },
]

interface Preferences {
  voice: string
  language: string
  privacy: Record<string, boolean>
  notifications: Record<string, boolean>
  voicePlaybackEnabled: boolean
}

const DEFAULT_PREFS: Preferences = {
  voice: 'alloy',
  language: 'en-US',
  privacy: { transcripts: true, training: false, cloudBackup: true },
  notifications: { reminders: true, productUpdates: false, weeklyDigest: true },
  voicePlaybackEnabled: true,
}

function Toggle({
  enabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={() => onChange(!enabled)}
      className={cm.cn(
        'relative h-6 w-11 rounded-full transition-colors shrink-0',
        enabled ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-border',
      )}
    >
      <span
        className={cm.cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5' : '',
        )}
      />
    </button>
  )
}

function Settings() {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const http = useHttpClient()
  const [voices, setVoices] = useState<VoiceOption[]>([...FALLBACK_VOICES])
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [voicePickedAt, setVoicePickedAt] = useState<number | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [prefsRes, voicesRes] = await Promise.all([
          http.get<Partial<Preferences>>('/preferences'),
          http
            .get<{ voices?: VoiceOption[] }>('/speech/voices')
            .catch(() => ({ data: { voices: FALLBACK_VOICES } })),
        ])
        if (cancelled) return
        const list: VoiceOption[] = Array.isArray(voicesRes.data?.voices)
          ? [...(voicesRes.data?.voices ?? [])]
          : [...FALLBACK_VOICES]
        setVoices(list.length > 0 ? list : [...FALLBACK_VOICES])
        const merged: Preferences = {
          voice: prefsRes.data?.voice ?? DEFAULT_PREFS.voice,
          language: prefsRes.data?.language ?? DEFAULT_PREFS.language,
          privacy: { ...DEFAULT_PREFS.privacy, ...(prefsRes.data?.privacy ?? {}) },
          notifications: {
            ...DEFAULT_PREFS.notifications,
            ...(prefsRes.data?.notifications ?? {}),
          },
          voicePlaybackEnabled:
            prefsRes.data?.voicePlaybackEnabled ?? DEFAULT_PREFS.voicePlaybackEnabled,
        }
        setPrefs(merged)
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('settings.loadError', {}, { defaultValue: 'Could not load settings.' }),
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function persist(next: Preferences) {
    setError(null)
    try {
      await http.put('/preferences', next)
      setSavedAt(Date.now())
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('settings.saveError', {}, { defaultValue: 'Could not save settings.' }),
      )
    }
  }

  function update(patch: Partial<Preferences>) {
    setPrefs((prev) => {
      const next: Preferences = {
        ...prev,
        ...patch,
        privacy: { ...prev.privacy, ...(patch.privacy ?? {}) },
        notifications: { ...prev.notifications, ...(patch.notifications ?? {}) },
      }
      void persist(next)
      return next
    })
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.textMuted,
            'uppercase tracking-widest font-semibold',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.stack(6),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[820px]',
        )}
      >
        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </div>
        ) : null}

        {savedAt ? (
          <span className="sr-only" data-mol-id="settings-saved-at" data-at={String(savedAt)}>
            saved
          </span>
        ) : null}

        <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
            {t('settings.voice', {}, { defaultValue: 'Default voice' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            {voicePickedAt ? (
              <span
                className="sr-only"
                data-mol-id="settings-voice-picked-at"
                data-at={String(voicePickedAt)}
              >
                {prefs.voice}
              </span>
            ) : null}
            {(voices.length > 0 ? voices : FALLBACK_VOICES).map((v) => {
              const active = prefs.voice === v.voiceId
              return (
                <button
                  key={v.voiceId}
                  type="button"
                  data-mol-id={`settings-voice-${v.voiceId}`}
                  onClick={() => {
                    update({ voice: v.voiceId })
                    setVoicePickedAt(Date.now())
                  }}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-xl border transition-all text-left',
                    active
                      ? 'bg-primary/15 border-primary text-foreground'
                      : 'bg-surface-secondary border-border text-foreground hover:border-primary/40',
                  )}
                  disabled={loading}
                >
                  {v.name}
                  {active ? (
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      check
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <select
            data-mol-id="language-picker-select"
            value={locale}
            onChange={(e) => {
              const lang = e.target.value
              setLocale(lang)
              update({ language: lang })
            }}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface-secondary border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none',
            )}
          >
            {[...locales]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
          </select>
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
            {PRIVACY_TOGGLES.map((row) => (
              <li
                key={row.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('py', 1),
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                  <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {t(`settings.privacy.${row.key}.label`, {}, { defaultValue: row.defaultLabel })}
                  </span>
                  <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
                    {t(
                      `settings.privacy.${row.key}.desc`,
                      { appName: APP_NAME },
                      { defaultValue: row.defaultDescription },
                    )}
                  </span>
                </div>
                <Toggle
                  enabled={!!prefs.privacy[row.key]}
                  onChange={(next) => update({ privacy: { [row.key]: next } })}
                  ariaLabel={t(
                    `settings.privacy.${row.key}.label`,
                    {},
                    { defaultValue: row.defaultLabel },
                  )}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
            {NOTIFICATION_TOGGLES.map((row) => (
              <li
                key={row.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('py', 1),
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                  <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {t(
                      `settings.notifications.${row.key}.label`,
                      {},
                      { defaultValue: row.defaultLabel },
                    )}
                  </span>
                  <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
                    {t(
                      `settings.notifications.${row.key}.desc`,
                      {},
                      { defaultValue: row.defaultDescription },
                    )}
                  </span>
                </div>
                <Toggle
                  enabled={!!prefs.notifications[row.key]}
                  onChange={(next) => update({ notifications: { [row.key]: next } })}
                  ariaLabel={t(
                    `settings.notifications.${row.key}.label`,
                    {},
                    { defaultValue: row.defaultLabel },
                  )}
                />
              </li>
            ))}
          </ul>
        </section>
        <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mb', 4))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h2>
            <p className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
          <ThemeToggle />
        </section>
      </main>
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
