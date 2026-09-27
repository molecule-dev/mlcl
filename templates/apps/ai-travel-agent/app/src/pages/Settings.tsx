import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch, ThemeToggle } from '@molecule/app-ui-react'

interface ToggleRow {
  key: string
  defaultLabel: string
  defaultDescription: string
}

const NOTIFICATION_TOGGLES: ReadonlyArray<ToggleRow> = [
  {
    key: 'delays',
    defaultLabel: 'Delays and rebookings',
    defaultDescription: 'A text when a flight is delayed and when the agent moves you.',
  },
  {
    key: 'payments',
    defaultLabel: 'Payments',
    defaultDescription: 'A note when someone pays their share of a bill.',
  },
  {
    key: 'productUpdates',
    defaultLabel: 'Product updates',
    defaultDescription: 'Occasional emails about new features.',
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
  phone: string
  homeAirport: string
  notifications: Record<string, boolean>
  voicePlaybackEnabled: boolean
}

const DEFAULT_PREFS: Preferences = {
  voice: 'alloy',
  language: 'en-US',
  phone: '',
  homeAirport: '',
  notifications: { delays: true, payments: true, productUpdates: false },
  voicePlaybackEnabled: true,
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
          phone: prefsRes.data?.phone ?? DEFAULT_PREFS.phone,
          homeAirport: prefsRes.data?.homeAirport ?? DEFAULT_PREFS.homeAirport,
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
      // Domain event: preferences committed (voice/language/phone/notifications).
      track({
        name: 'settings.updated',
        properties: { voice: next.voice, language: next.language },
      })
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

        <section
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}
          data-mol-id="settings-travel"
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 1))}>
            {t('settings.travel.title', {}, { defaultValue: 'Travel' })}
          </h2>
          <p className={cm.cn(cm.textMuted, cm.textSize('xs'), cm.sp('mb', 4))}>
            {t(
              'settings.travel.description',
              {},
              { defaultValue: 'Where the agent texts you, and where your trips usually start.' },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textSize('sm'))}>
              <span className={cm.fontWeight('semibold')}>
                {t('settings.travel.phone', {}, { defaultValue: 'Mobile number' })}
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 555 000 1111"
                defaultValue={prefs.phone}
                key={`phone-${prefs.phone}`}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value !== prefs.phone) update({ phone: value })
                }}
                data-mol-id="settings-phone"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-secondary border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textSize('sm'))}>
              <span className={cm.fontWeight('semibold')}>
                {t('settings.travel.homeAirport', {}, { defaultValue: 'Home airport' })}
              </span>
              <input
                maxLength={3}
                placeholder="JFK"
                defaultValue={prefs.homeAirport}
                key={`airport-${prefs.homeAirport}`}
                onBlur={(e) => {
                  const value = e.target.value.trim().toUpperCase()
                  if (value !== prefs.homeAirport) update({ homeAirport: value })
                }}
                data-mol-id="settings-home-airport"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-secondary border border-border text-foreground uppercase focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </label>
          </div>
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
                <Switch
                  checked={!!prefs.notifications[row.key]}
                  onChange={(e) =>
                    update({ notifications: { [row.key]: (e.target as HTMLInputElement).checked } })
                  }
                  aria-label={t(
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
