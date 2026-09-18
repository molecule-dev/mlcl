import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { PageBody, PageHeader } from '../components/PageHeader.js'

const SECTIONS = [
  'preferences',
  'language',
  'reminders',
  'account',
  'profile',
  'notifications',
  'tutor',
  'privacy',
  'billing',
] as const
type Section = (typeof SECTIONS)[number]

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
type Difficulty = (typeof DIFFICULTIES)[number]

const STUDY_MODE_IDS = ['flashcards', 'quizzes', 'reading', 'tutor'] as const

const STORAGE_KEY = 'studybuddy:settings'

interface SettingsState {
  goal: number
  difficulty: Difficulty
  modes: string[]
  reminderTime: string
  streakFreeze: boolean
  weekendLeniency: boolean
}

const DEFAULT_SETTINGS: SettingsState = {
  goal: 45,
  difficulty: 'medium',
  modes: [...STUDY_MODE_IDS],
  reminderTime: '21:00',
  streakFreeze: true,
  weekendLeniency: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [searchParams] = useSearchParams()
  const sectionRaw = searchParams.get('s') as Section | null
  const section: Section = SECTIONS.includes(sectionRaw as Section)
    ? (sectionRaw as Section)
    : 'preferences'
  const [saved, setSaved] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [pending, setPending] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load saved settings from localStorage; profile fetch only confirms
  // session validity. Note: localStorage is intentional — settings are
  // device-local until a server-side preferences endpoint exists.
  useEffect(() => {
    let cancelled = false
    http.get('/api/profile').catch(() => {})
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && !cancelled) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>
        const next = { ...DEFAULT_SETTINGS, ...parsed }
        setSaved(next)
        setPending(next)
      }
    } catch (_error) {
      /* ignore — localStorage may be unavailable or contain unparseable data; defaults are used */
    }
    return () => {
      cancelled = true
    }
  }, [http])

  const isDirty = JSON.stringify(saved) !== JSON.stringify(pending)

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setPending((p) => ({ ...p, [key]: value }))
    setStatusMsg(null)
  }

  const toggleMode = (id: string) => {
    setPending((p) => {
      const set = new Set(p.modes)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...p, modes: Array.from(set) }
    })
    setStatusMsg(null)
  }

  const handleCancel = () => {
    setPending(saved)
    setStatusMsg(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
      setSaved(pending)
      setStatusMsg(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Could not save settings.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      data-mol-id="page-settings"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('settings.eyebrow', {}, { defaultValue: 'Tune' })}
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        subtitle={t(
          'settings.subtitle',
          {},
          { defaultValue: 'Tailor your study experience for optimal focus.' },
        )}
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
        {statusMsg ? (
          <p role="status" className={cm.cn(cm.textSize('sm'), 'text-success')}>
            {statusMsg}
          </p>
        ) : null}
        <div className={'grid gap-8 lg:grid-cols-[220px_1fr]'} style={{ alignItems: 'start' }}>
          <aside>
            <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              {SECTIONS.map((s) => (
                <Link
                  key={s}
                  to={{ pathname: '/settings', search: `?s=${s}` }}
                  data-mol-id={`settings-nav-${s}`}
                  aria-pressed={section === s}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2.5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-xl text-left',
                    section === s
                      ? 'bg-primary-container/15 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                  )}
                  style={{ height: 40, width: 220, display: 'inline-flex', alignItems: 'center' }}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </Link>
              ))}
            </nav>
          </aside>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
            style={{ minHeight: 480 }}
          >
            <section
              key={section}
              data-mol-id={`settings-section-${section}`}
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-ambient',
              )}
              style={{ minHeight: 360 }}
            >
              <h3
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface mb-6')}
              >
                {t(
                  `settings.${section}.title`,
                  {},
                  { defaultValue: section.charAt(0).toUpperCase() + section.slice(1) },
                )}
              </h3>
              {section === 'preferences' ? (
                <PreferencesPane pending={pending} toggleMode={toggleMode} update={update} />
              ) : section === 'reminders' ? (
                <RemindersPane pending={pending} update={update} />
              ) : section === 'language' ? (
                <LanguagePane />
              ) : (
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t(
                    `settings.${section}.description`,
                    {},
                    {
                      defaultValue: 'This section is reserved for future configuration.',
                    },
                  )}
                </p>
              )}
            </section>

            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('py', 4))}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!isDirty || saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2.5),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-ambient hover:opacity-90 disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </div>
        </div>

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
      </PageBody>
    </div>
  )
}

interface PaneProps {
  pending: SettingsState
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  toggleMode?: (id: string) => void
}

function LanguagePane() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      </p>
      <LanguagePicker />
    </div>
  )
}

function PreferencesPane({ pending, update, toggleMode }: PaneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 3))}>
          <label
            htmlFor="goal"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
          >
            {t('settings.preferences.goal', {}, { defaultValue: 'Daily study goal' })}
          </label>
          <span
            className={
              'rounded-md bg-primary-container/15 px-2 py-1 font-mono text-sm text-primary tabular-nums'
            }
          >
            {pending.goal} {t('settings.preferences.minutes', {}, { defaultValue: 'minutes/day' })}
          </span>
        </div>
        <input
          id="goal"
          type="range"
          min={15}
          max={120}
          value={pending.goal}
          onChange={(e) => update('goal', Number(e.target.value))}
          className={
            'w-full h-2 cursor-pointer rounded-lg accent-primary bg-surface-container-high'
          }
        />
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.textSize('xs'),
            cm.sp('mt', 2),
            'tracking-wide text-on-surface-variant',
          )}
        >
          <span>15m</span>
          <span>2h</span>
        </div>
      </div>

      <fieldset>
        <legend
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface mb-3')}
        >
          {t('settings.preferences.difficulty', {}, { defaultValue: 'Preferred difficulty' })}
        </legend>
        <div className={'grid grid-cols-1 gap-3 md:grid-cols-3'}>
          {DIFFICULTIES.map((d) => {
            const selected = pending.difficulty === d
            return (
              <label
                key={d}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'cursor-pointer rounded-xl border-2',
                  selected
                    ? 'border-primary bg-primary-container/10'
                    : 'border-outline-variant/30 hover:bg-surface-container-low',
                )}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={d}
                  checked={selected}
                  onChange={() => update('difficulty', d)}
                  className={'h-4 w-4 accent-primary'}
                />
                <span
                  className={cm.cn(cm.textSize('sm'), selected && 'font-semibold text-primary')}
                >
                  {t(
                    `settings.preferences.difficulty.${d}`,
                    {},
                    {
                      defaultValue:
                        d === 'easy'
                          ? 'Easy (guided)'
                          : d === 'medium'
                            ? 'Medium (balanced)'
                            : 'Hard (challenge)',
                    },
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface mb-3')}>
          {t('settings.preferences.modes', {}, { defaultValue: 'Study modes' })}
        </p>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {STUDY_MODE_IDS.map((mode) => (
            <label
              key={mode}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'cursor-pointer text-sm text-on-surface',
              )}
            >
              <input
                type="checkbox"
                checked={pending.modes.includes(mode)}
                onChange={() => toggleMode?.(mode)}
                className={'h-5 w-5 rounded accent-primary'}
              />
              {t(
                `settings.preferences.mode.${mode}`,
                {},
                {
                  defaultValue:
                    mode === 'flashcards'
                      ? 'Flashcards'
                      : mode === 'quizzes'
                        ? 'Multiple choice quizzes'
                        : mode === 'reading'
                          ? 'Long-form reading'
                          : 'AI tutoring',
                },
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function RemindersPane({ pending, update }: PaneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'md' }))}>
        <div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('settings.reminders.time', {}, { defaultValue: 'Daily reminder time' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'serif-text italic text-on-surface-variant mt-1')}>
            {t('settings.reminders.timeHelp', {}, { defaultValue: 'When should we nudge you?' })}
          </p>
        </div>
        <input
          type="time"
          value={pending.reminderTime}
          onChange={(e) => update('reminderTime', e.target.value)}
          className={
            'rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm'
          }
        />
      </div>

      <Toggle
        label={t('settings.reminders.freeze', {}, { defaultValue: 'Streak freeze available' })}
        help={t(
          'settings.reminders.freezeHelp',
          {},
          { defaultValue: 'Automatically use a freeze to save your streak.' },
        )}
        checked={pending.streakFreeze}
        onChange={(v) => update('streakFreeze', v)}
      />
      <Toggle
        label={t('settings.reminders.weekend', {}, { defaultValue: 'Weekend leniency' })}
        help={t(
          'settings.reminders.weekendHelp',
          {},
          { defaultValue: 'Lower daily goal on Saturday & Sunday.' },
        )}
        checked={pending.weekendLeniency}
        onChange={(v) => update('weekendLeniency', v)}
      />
    </div>
  )
}

interface ToggleProps {
  label: string
  help?: string
  checked: boolean
  onChange: (next: boolean) => void
}

function Toggle({ label, help, checked, onChange }: ToggleProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center', gap: 'md' }),
        cm.sp('pt', 4),
        'border-t border-outline-variant/15',
      )}
    >
      <div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {label}
        </p>
        {help ? (
          <p className={cm.cn(cm.textSize('xs'), 'serif-text italic text-on-surface-variant mt-1')}>
            {help}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cm.cn(
          'relative h-6 w-11 rounded-full',
          checked ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}
