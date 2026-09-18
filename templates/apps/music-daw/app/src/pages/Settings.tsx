import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface ShortcutRow {
  id: string
  defaultLabel: string
  binding: string
}

interface PreferencesData {
  handle?: string
  bio?: string
  city?: string
  audioDevice?: string
  sampleRate?: string
  bufferSize?: string
  midiInput?: string
  metronome?: boolean
  autoSave?: boolean
  pushNotifications?: boolean
}

const AUDIO_DEVICES = [
  'System Default',
  'MacBook Pro Speakers',
  'Focusrite Scarlett 2i2',
  'Universal Audio Apollo Twin',
]
const SAMPLE_RATES = ['44.1 kHz', '48 kHz', '96 kHz']
const BUFFER_SIZES = ['64 samples', '128 samples', '256 samples', '512 samples']
const MIDI_INPUTS = [
  'No MIDI input',
  'Arturia MiniLab MkII',
  'Native Instruments S61 MK3',
  'Akai MPK Mini Plus',
]

const SHORTCUTS: ShortcutRow[] = [
  { id: 'play', defaultLabel: 'Play / pause', binding: 'Space' },
  { id: 'record', defaultLabel: 'Record arm', binding: 'R' },
  { id: 'undo', defaultLabel: 'Undo last edit', binding: 'Ctrl Z' },
  { id: 'cut', defaultLabel: 'Split clip at playhead', binding: 'B' },
  { id: 'loop', defaultLabel: 'Toggle loop region', binding: 'L' },
  { id: 'rewind', defaultLabel: 'Rewind to start', binding: 'Home' },
  { id: 'mute', defaultLabel: 'Mute selected track', binding: 'M' },
  { id: 'solo', defaultLabel: 'Solo selected track', binding: 'S' },
]

const DEFAULTS: Required<
  Pick<
    PreferencesData,
    | 'audioDevice'
    | 'sampleRate'
    | 'bufferSize'
    | 'midiInput'
    | 'metronome'
    | 'autoSave'
    | 'pushNotifications'
  >
> = {
  audioDevice: 'System Default',
  sampleRate: '48 kHz',
  bufferSize: '128 samples',
  midiInput: 'No MIDI input',
  metronome: true,
  autoSave: true,
  pushNotifications: false,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [prefs, setPrefs] = useState<PreferencesData>({ ...DEFAULTS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [handle, setHandle] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<unknown>('/api/preferences')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<PreferencesData>(res.data) ?? {}
        const merged = { ...DEFAULTS, ...data }
        setPrefs(merged)
        setHandle(data.handle ?? '')
        setBio(data.bio ?? '')
        setCity(data.city ?? '')
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('settings.loadError', {}, { defaultValue: 'Failed to load preferences.' }))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const persist = async (next: PreferencesData, confirmation: string) => {
    setSaving(true)
    setError(null)
    setStatusMsg(null)
    try {
      const res = await http.put<unknown>('/api/preferences', { data: next })
      const saved = unwrapSingle<PreferencesData>(res.data) ?? next
      setPrefs((p) => ({ ...p, ...saved }))
      setStatusMsg(confirmation)
    } catch (error) {
      setError(t('settings.saveError', {}, { defaultValue: 'Failed to save preferences.' }))
      logError('settings.savePreferences', error)
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof PreferencesData>(key: K, value: PreferencesData[K]) => {
    const next = { ...prefs, handle, bio, city, [key]: value }
    setPrefs((p) => ({ ...p, [key]: value }))
    void persist(next, t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
  }

  const saveProfile = async () => {
    const next = { ...prefs, handle: handle.trim(), bio: bio.trim(), city: city.trim() }
    await persist(next, t('settings.profileSaved', {}, { defaultValue: 'Profile updated.' }))
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-10')}>
      <header>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Studio configuration' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {loading ? (
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('settings.loading', {}, { defaultValue: 'Loading preferences…' })}
        </p>
      ) : (
        <>
          {error && (
            <p
              role="alert"
              className={cm.cn(
                'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
              )}
            >
              {error}
            </p>
          )}
          {statusMsg && !error && (
            <p role="status" className={cm.cn('text-xs text-primary')}>
              {statusMsg}
            </p>
          )}

          <SettingsSection
            title={t('settings.profileHeading', {}, { defaultValue: 'Producer profile' })}
            description={t(
              'settings.profileBody',
              {},
              { defaultValue: 'Public name and bio shown on your profile page.' },
            )}
            icon="badge"
          >
            <TextRow
              id="settings-handle"
              label={t('settings.profile.handle', {}, { defaultValue: 'Handle' })}
              value={handle}
              onChange={setHandle}
              placeholder="aria-vega"
            />
            <TextRow
              id="settings-city"
              label={t('settings.profile.city', {}, { defaultValue: 'City' })}
              value={city}
              onChange={setCity}
              placeholder="Lisbon, PT"
            />
            <TextAreaRow
              id="settings-bio"
              label={t('settings.profile.bio', {}, { defaultValue: 'Short bio' })}
              value={bio}
              onChange={setBio}
              placeholder={t(
                'settings.profile.bioPlaceholder',
                {},
                { defaultValue: 'Producer / sound designer working out of…' },
              )}
            />
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                save
              </span>
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
          </SettingsSection>

          <SettingsSection
            title={t('settings.audioHeading', {}, { defaultValue: 'Audio interface' })}
            description={t(
              'settings.audioBody',
              {},
              { defaultValue: 'Output device, sample rate, and round-trip buffer.' },
            )}
            icon="speaker"
          >
            <SelectRow
              label={t('settings.audio.outputDevice', {}, { defaultValue: 'Output device' })}
              value={prefs.audioDevice ?? DEFAULTS.audioDevice}
              options={AUDIO_DEVICES}
              onChange={(v) => updateField('audioDevice', v)}
            />
            <SelectRow
              label={t('settings.audio.sampleRate', {}, { defaultValue: 'Sample rate' })}
              value={prefs.sampleRate ?? DEFAULTS.sampleRate}
              options={SAMPLE_RATES}
              onChange={(v) => updateField('sampleRate', v)}
            />
            <SelectRow
              label={t('settings.audio.bufferSize', {}, { defaultValue: 'Buffer size' })}
              value={prefs.bufferSize ?? DEFAULTS.bufferSize}
              options={BUFFER_SIZES}
              onChange={(v) => updateField('bufferSize', v)}
            />
            <ToggleRow
              label={t('settings.audio.metronome', {}, { defaultValue: 'Metronome on record' })}
              description={t(
                'settings.audio.metronomeBody',
                {},
                { defaultValue: 'Click track plays through monitor only.' },
              )}
              on={prefs.metronome ?? DEFAULTS.metronome}
              onToggle={() => updateField('metronome', !(prefs.metronome ?? DEFAULTS.metronome))}
            />
          </SettingsSection>

          <SettingsSection
            title={t('settings.midiHeading', {}, { defaultValue: 'MIDI input' })}
            description={t(
              'settings.midiBody',
              {},
              { defaultValue: 'Default controller assignment.' },
            )}
            icon="piano"
          >
            <SelectRow
              label={t('settings.midi.controller', {}, { defaultValue: 'Controller' })}
              value={prefs.midiInput ?? DEFAULTS.midiInput}
              options={MIDI_INPUTS}
              onChange={(v) => updateField('midiInput', v)}
            />
          </SettingsSection>

          <SettingsSection
            title={t('settings.shortcutsHeading', {}, { defaultValue: 'Keyboard shortcuts' })}
            description={t(
              'settings.shortcutsBody',
              { appName: APP_NAME },
              { defaultValue: 'Default {{appName}} keymap.' },
            )}
            icon="keyboard"
          >
            <ul
              className={cm.cn(
                'rounded-xl border border-outline-variant divide-y divide-outline-variant/50 overflow-hidden',
              )}
            >
              {SHORTCUTS.map((shortcut) => (
                <li
                  key={shortcut.id}
                  className={cm.cn(
                    'flex items-center justify-between px-4 py-3 bg-surface-container-lowest hover:bg-surface-container transition-colors',
                  )}
                >
                  <span className={cm.cn('text-sm text-on-surface')}>
                    {t(
                      `settings.shortcut.${shortcut.id}`,
                      {},
                      { defaultValue: shortcut.defaultLabel },
                    )}
                  </span>
                  <kbd
                    className={cm.cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-surface-container border border-outline-variant text-on-surface',
                    )}
                  >
                    {shortcut.binding}
                  </kbd>
                </li>
              ))}
            </ul>
          </SettingsSection>

          <SettingsSection
            title={t('settings.languageHeading', {}, { defaultValue: 'Language' })}
            description={t(
              'settings.languageBody',
              { appName: APP_NAME },
              { defaultValue: 'Choose the language used throughout {{appName}}.' },
            )}
            icon="language"
          >
            <LanguagePicker />
          </SettingsSection>

          <SettingsSection
            title={t('settings.workflowHeading', {}, { defaultValue: 'Workflow' })}
            description={t(
              'settings.workflowBody',
              { appName: APP_NAME },
              { defaultValue: 'How {{appName}} handles saves and notifications.' },
            )}
            icon="auto_awesome"
          >
            <ToggleRow
              label={t(
                'settings.workflow.autoSave',
                {},
                { defaultValue: 'Auto-save every minute' },
              )}
              description={t(
                'settings.workflow.autoSaveBody',
                {},
                { defaultValue: 'Keep your work safe even if a tab crashes.' },
              )}
              on={prefs.autoSave ?? DEFAULTS.autoSave}
              onToggle={() => updateField('autoSave', !(prefs.autoSave ?? DEFAULTS.autoSave))}
            />
            <ToggleRow
              label={t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
              description={t(
                'settings.workflow.pushBody',
                {},
                { defaultValue: 'Get notified when collaborators leave a comment.' },
              )}
              on={prefs.pushNotifications ?? DEFAULTS.pushNotifications}
              onToggle={() =>
                updateField(
                  'pushNotifications',
                  !(prefs.pushNotifications ?? DEFAULTS.pushNotifications),
                )
              }
            />
          </SettingsSection>

          <section
            className={cm.cn(
              'rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 flex items-center justify-between gap-4 flex-wrap',
            )}
          >
            <div>
              <h2 className={cm.cn('text-sm font-extrabold tracking-tight')}>
                {t('settings.billingLink', {}, { defaultValue: 'Subscription & billing' })}
              </h2>
              <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>
                {t(
                  'settings.billingLinkBody',
                  {},
                  { defaultValue: 'Manage plan, payment method, and invoice history.' },
                )}
              </p>
            </div>
            <Link
              to="/settings/billing"
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors',
              )}
            >
              {t('settings.billingCta', {}, { defaultValue: 'Manage billing' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
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
        </>
      )}
    </div>
  )
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <section className={cm.cn('space-y-4')}>
      <header className={cm.cn('flex items-start gap-3')}>
        <span
          className={cm.cn(
            'w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            {icon}
          </span>
        </span>
        <div>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>{title}</h2>
          <p className={cm.cn('text-xs text-on-surface-variant mt-0.5')}>{description}</p>
        </div>
      </header>
      <div className={cm.cn('space-y-3 pl-12')}>{children}</div>
    </section>
  )
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <label
      className={cm.cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant',
      )}
    >
      <span className={cm.cn('text-sm text-on-surface')}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          'text-sm font-semibold bg-transparent border-0 outline-none text-on-surface cursor-pointer',
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextRow({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const cm = getClassMap()
  return (
    <label
      htmlFor={id}
      className={cm.cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant',
      )}
    >
      <span className={cm.cn('text-sm text-on-surface')}>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          'text-sm font-semibold bg-transparent border-0 outline-none text-on-surface placeholder:text-on-surface-variant text-right max-w-[220px]',
        )}
      />
    </label>
  )
}

function TextAreaRow({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'flex flex-col gap-2 px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant',
      )}
    >
      <label htmlFor={id} className={cm.cn('text-sm text-on-surface')}>
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          'text-sm bg-transparent border-0 outline-none resize-none text-on-surface placeholder:text-on-surface-variant',
        )}
      />
    </div>
  )
}

function ToggleRow({
  label,
  description,
  on,
  onToggle,
}: {
  label: string
  description?: string
  on: boolean
  onToggle: () => void
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant',
      )}
    >
      <div>
        <p className={cm.cn('text-sm text-on-surface')}>{label}</p>
        {description && (
          <p className={cm.cn('text-xs text-on-surface-variant mt-0.5')}>{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cm.cn('w-11 h-6 rounded-full relative transition-colors shrink-0')}
        style={{
          // Token (not a white alpha) so the off state stays visible in light mode.
          backgroundColor: on ? 'var(--daw-primary)' : 'var(--mol-color-border-secondary)',
        }}
      >
        <span
          className={cm.cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          )}
          style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
