import { useEffect, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['playback', 'downloads', 'notifications', 'account'] as const
type Section = (typeof SECTIONS)[number]

interface Preferences {
  defaultSpeed?: string
  skipBackSeconds?: number
  skipForwardSeconds?: number
  trimSilence?: boolean
  voiceBoost?: boolean
  autoPlayNext?: boolean
  autoDownloadNew?: boolean
  wifiOnly?: boolean
  keepLastN?: number
  deleteAfterPlayed?: boolean
  notifyNewEpisode?: boolean
  notifyTranscripts?: boolean
  notifyRecommendations?: boolean
  notifyShowUpdates?: boolean
}

const DEFAULT_PREFS: Required<Preferences> = {
  defaultSpeed: '1.25×',
  skipBackSeconds: 30,
  skipForwardSeconds: 30,
  trimSilence: true,
  voiceBoost: false,
  autoPlayNext: true,
  autoDownloadNew: true,
  wifiOnly: true,
  keepLastN: 3,
  deleteAfterPlayed: true,
  notifyNewEpisode: true,
  notifyTranscripts: false,
  notifyRecommendations: true,
  notifyShowUpdates: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('playback')
  const [prefs, setPrefs] = useState<Required<Preferences>>(DEFAULT_PREFS)
  const [saving, setSaving] = useState<string | null>(null)
  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/preferences')
      .then((res) => {
        if (cancelled) return
        const fetched = unwrapSingle<Preferences>(res) ?? {}
        setPrefs((cur) => ({ ...cur, ...fetched }))
      })
      .catch(() => {
        /* keep defaults */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const persist = (patch: Preferences) => {
    setPrefs((cur) => ({ ...cur, ...patch }))
    const key = Object.keys(patch).join(',')
    setSaving(key)
    if (debouncers.current[key]) clearTimeout(debouncers.current[key])
    debouncers.current[key] = setTimeout(async () => {
      try {
        await http.put('/api/profile/preferences', patch)
      } finally {
        setSaving(null)
      }
    }, 250)
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Listening preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Playback, downloads, and notifications.' },
          )}
        </p>
        {saving && (
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 2))}
            data-testid="settings-saving"
          >
            {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
          </p>
        )}
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={'col-span-12 md:col-span-3'}>
          <nav
            className={'space-y-1'}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(
                          'text-on-surface-variant',
                          'hover:bg-surface-container hover:text-on-surface',
                        ),
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={'col-span-12 md:col-span-9 space-y-4'}>
          <section
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
            data-mol-id="settings-language"
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
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
          {section === 'playback' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.playback.heading', {}, { defaultValue: 'Playback' })}
              </h2>
              <Field
                label={t('settings.playback.defaultSpeed', {}, { defaultValue: 'Default speed' })}
                value={prefs.defaultSpeed}
                onChange={(v) => persist({ defaultSpeed: v })}
                testid="pref-default-speed"
              />
              <Field
                label={t(
                  'settings.playback.skipBack',
                  {},
                  { defaultValue: 'Skip-back interval (seconds)' },
                )}
                value={String(prefs.skipBackSeconds)}
                onChange={(v) => persist({ skipBackSeconds: Number(v) || 0 })}
                type="number"
                testid="pref-skip-back"
              />
              <Field
                label={t(
                  'settings.playback.skipForward',
                  {},
                  { defaultValue: 'Skip-forward interval (seconds)' },
                )}
                value={String(prefs.skipForwardSeconds)}
                onChange={(v) => persist({ skipForwardSeconds: Number(v) || 0 })}
                type="number"
                testid="pref-skip-forward"
              />
              <Toggle
                label={t('settings.playback.silenceTrim', {}, { defaultValue: 'Trim silence' })}
                checked={prefs.trimSilence}
                onChange={(v) => persist({ trimSilence: v })}
                testid="pref-trim-silence"
              />
              <Toggle
                label={t(
                  'settings.playback.volumeBoost',
                  {},
                  { defaultValue: 'Voice boost (compression)' },
                )}
                checked={prefs.voiceBoost}
                onChange={(v) => persist({ voiceBoost: v })}
                testid="pref-voice-boost"
              />
              <Toggle
                label={t(
                  'settings.playback.continuePlay',
                  {},
                  { defaultValue: 'Auto-play next episode' },
                )}
                checked={prefs.autoPlayNext}
                onChange={(v) => persist({ autoPlayNext: v })}
                testid="pref-auto-play"
              />
            </section>
          )}

          {section === 'downloads' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.downloads.heading', {}, { defaultValue: 'Downloads' })}
              </h2>
              <Toggle
                label={t(
                  'settings.downloads.autoNew',
                  {},
                  { defaultValue: 'Auto-download new episodes' },
                )}
                checked={prefs.autoDownloadNew}
                onChange={(v) => persist({ autoDownloadNew: v })}
                testid="pref-auto-download"
              />
              <Toggle
                label={t('settings.downloads.wifiOnly', {}, { defaultValue: 'Wi-Fi only' })}
                checked={prefs.wifiOnly}
                onChange={(v) => persist({ wifiOnly: v })}
                testid="pref-wifi-only"
              />
              <Field
                label={t(
                  'settings.downloads.keepCount',
                  {},
                  { defaultValue: 'Keep last N episodes per show' },
                )}
                value={String(prefs.keepLastN)}
                onChange={(v) => persist({ keepLastN: Number(v) || 0 })}
                type="number"
                testid="pref-keep-n"
              />
              <Toggle
                label={t(
                  'settings.downloads.deletePlayed',
                  {},
                  { defaultValue: 'Delete after played' },
                )}
                checked={prefs.deleteAfterPlayed}
                onChange={(v) => persist({ deleteAfterPlayed: v })}
                testid="pref-delete-played"
              />
            </section>
          )}

          {section === 'notifications' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <Toggle
                label={t(
                  'settings.notifications.newEpisode',
                  {},
                  { defaultValue: 'New episodes from subscribed shows' },
                )}
                checked={prefs.notifyNewEpisode}
                onChange={(v) => persist({ notifyNewEpisode: v })}
                testid="pref-notify-new-episode"
              />
              <Toggle
                label={t(
                  'settings.notifications.transcripts',
                  {},
                  { defaultValue: 'Transcript-ready alerts' },
                )}
                checked={prefs.notifyTranscripts}
                onChange={(v) => persist({ notifyTranscripts: v })}
                testid="pref-notify-transcripts"
              />
              <Toggle
                label={t(
                  'settings.notifications.recommendations',
                  {},
                  { defaultValue: 'Weekly show recommendations' },
                )}
                checked={prefs.notifyRecommendations}
                onChange={(v) => persist({ notifyRecommendations: v })}
                testid="pref-notify-recommendations"
              />
              <Toggle
                label={t(
                  'settings.notifications.showUpdates',
                  {},
                  { defaultValue: 'Major show updates (new host, etc.)' },
                )}
                checked={prefs.notifyShowUpdates}
                onChange={(v) => persist({ notifyShowUpdates: v })}
                testid="pref-notify-show-updates"
              />
            </section>
          )}

          {section === 'account' && (
            <div className={cm.card()} data-mol-id="settings-account">
              <SettingsContainer onClose={() => {}}>
                <AccountSection />
                <AuthSection />
                <NotificationsSection />
                <DevicesSection />
                <ThisDeviceSection />
                <LogOutDeleteSection />
              </SettingsContainer>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  testid,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  testid?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  testid,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  testid?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testid}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
