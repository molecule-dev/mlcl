import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiUserPreferences } from '../lib/api.js'

const VOICES = [
  { key: 'maya', defaultLabel: 'Maya', tone: 'Soft alto' },
  { key: 'daichi', defaultLabel: 'Daichi', tone: 'Quiet baritone' },
  { key: 'lena', defaultLabel: 'Lena', tone: 'Warm mezzo' },
  { key: 'saoirse', defaultLabel: 'Saoirse', tone: 'Slow contralto' },
]

const DURATIONS = [3, 5, 10, 15, 20, 30]
const WEEKLY_GOALS = [60, 90, 120, 180, 240, 360]

const DEFAULT_PREFERENCES: ApiUserPreferences = {
  voice: 'maya',
  default_duration_minutes: 10,
  reminder_enabled: true,
  reminder_time: '07:30',
  autoplay_next: false,
  weekly_goal_minutes: 120,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [prefs, setPrefs] = useState<ApiUserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<ApiUserPreferences>('/preferences')
      .then((res) => {
        if (cancelled) return
        setPrefs({ ...DEFAULT_PREFERENCES, ...(res.data ?? {}) })
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const persist = async (patch: Partial<ApiUserPreferences>) => {
    setSaving(true)
    setError(null)
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      const res = await http.put<ApiUserPreferences>('/preferences', patch)
      if (res.data) setPrefs({ ...DEFAULT_PREFERENCES, ...res.data })
      setSaved(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <StillpointTopBar
          title={t('nav.settings', {}, { defaultValue: 'Settings' })}
          eyebrow={
            <span>
              {t('stillpoint.settings.eyebrow', {}, { defaultValue: 'Tune your daily practice.' })}
            </span>
          }
        />
        <div
          data-testid="settings-loading"
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </>
    )
  }

  return (
    <>
      <StillpointTopBar
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        eyebrow={
          <span>
            {t('stillpoint.settings.eyebrow', {}, { defaultValue: 'Tune your daily practice.' })}
          </span>
        }
        actions={
          saving ? (
            <span
              data-testid="settings-saving"
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
            </span>
          ) : saved ? (
            <span
              data-testid="settings-saved"
              className={cm.cn(cm.textSize('xs'), 'text-primary uppercase tracking-widest')}
            >
              {t('common.saved', {}, { defaultValue: 'Saved' })}
            </span>
          ) : null
        }
      />

      {error ? (
        <div
          data-testid="settings-error"
          className={cm.cn(cm.sp('p', 4), 'rounded-2xl border border-error text-error')}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <SettingsSection
          icon="mic"
          title={t('stillpoint.settings.voiceHeading', {}, { defaultValue: 'Default voice' })}
          body={t(
            'stillpoint.settings.voiceBody',
            {},
            { defaultValue: 'Pick the teacher who feels like home.' },
          )}
        >
          <div
            data-testid="settings-voice-grid"
            className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-2')}
          >
            {VOICES.map((v) => {
              const active = prefs.voice === v.key
              return (
                <button
                  key={v.key}
                  type="button"
                  data-testid={`settings-voice-${v.key}`}
                  onClick={() => void persist({ voice: v.key })}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 4),
                    'rounded-xl text-left transition-colors border',
                    active
                      ? 'bg-primary-container border-primary/40 text-on-primary-container'
                      : 'bg-surface border-outline hover:border-primary/40',
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-base')}>
                    {t(`stillpoint.settings.voice.${v.key}`, {}, { defaultValue: v.defaultLabel })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(`stillpoint.settings.voiceTone.${v.key}`, {}, { defaultValue: v.tone })}
                  </span>
                </button>
              )
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          icon="schedule"
          title={t(
            'stillpoint.settings.durationHeading',
            {},
            { defaultValue: 'Default session length' },
          )}
          body={t(
            'stillpoint.settings.durationBody',
            {},
            { defaultValue: 'Used when you tap "Begin" without choosing a duration.' },
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            {DURATIONS.map((d) => {
              const active = prefs.default_duration_minutes === d
              return (
                <button
                  key={d}
                  type="button"
                  data-testid={`settings-duration-${d}`}
                  onClick={() => void persist({ default_duration_minutes: d })}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full transition-colors',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-container/60',
                  )}
                >
                  {t('common.minutesMin', { minutes: d }, { defaultValue: '{{minutes}} min' })}
                </button>
              )
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          icon="flag"
          title={t('stillpoint.settings.weeklyGoalHeading', {}, { defaultValue: 'Weekly goal' })}
          body={t(
            'stillpoint.settings.weeklyGoalBody',
            {},
            { defaultValue: 'A target to nudge — not punish.' },
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            {WEEKLY_GOALS.map((g) => {
              const active = prefs.weekly_goal_minutes === g
              return (
                <button
                  key={g}
                  type="button"
                  data-testid={`settings-weekly-goal-${g}`}
                  onClick={() => void persist({ weekly_goal_minutes: g })}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full transition-colors',
                    active
                      ? 'bg-accent text-on-accent shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-accent-container/60',
                  )}
                >
                  {t(
                    'stillpoint.settings.weeklyGoal',
                    { minutes: g },
                    { defaultValue: '{{minutes}} min/wk' },
                  )}
                </button>
              )
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          icon="notifications"
          title={t('stillpoint.settings.reminderHeading', {}, { defaultValue: 'Daily reminder' })}
          body={t(
            'stillpoint.settings.reminderBody',
            {},
            { defaultValue: 'A gentle nudge at the same time each day.' },
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
            <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
              <input
                type="checkbox"
                data-testid="settings-reminder-enabled"
                checked={prefs.reminder_enabled}
                onChange={(e) => void persist({ reminder_enabled: e.target.checked })}
                className={cm.cn('w-5 h-5 accent-primary rounded')}
              />
              <span
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
              >
                {t(
                  'stillpoint.settings.reminderEnable',
                  {},
                  { defaultValue: 'Send a daily reminder' },
                )}
              </span>
            </label>
            <input
              type="time"
              data-testid="settings-reminder-time"
              value={prefs.reminder_time}
              onChange={(e) => void persist({ reminder_time: e.target.value })}
              disabled={!prefs.reminder_enabled}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'bg-surface rounded-xl border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors disabled:opacity-50',
              )}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon="play_circle"
          title={t(
            'stillpoint.settings.autoplayHeading',
            {},
            { defaultValue: 'Auto-play next session' },
          )}
          body={t(
            'stillpoint.settings.autoplayBody',
            {},
            { defaultValue: 'Keep going automatically when a course session ends.' },
          )}
        >
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
            <input
              type="checkbox"
              data-testid="settings-autoplay"
              checked={prefs.autoplay_next}
              onChange={(e) => void persist({ autoplay_next: e.target.checked })}
              className={cm.cn('w-5 h-5 accent-primary rounded')}
            />
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t(
                'stillpoint.settings.autoplayEnable',
                {},
                { defaultValue: 'Continue automatically' },
              )}
            </span>
          </label>
        </SettingsSection>

        <SettingsSection
          icon="translate"
          title={t('footer.language', {}, { defaultValue: 'Language' })}
          body={t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        >
          <LanguagePicker />
        </SettingsSection>
        <SettingsSection
          icon="contrast"
          title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          body={t(
            'common.toggleLightDark',
            {},
            { defaultValue: 'Toggle between light and dark mode.' },
          )}
        >
          <ThemeToggle />
        </SettingsSection>
      </div>
    </>
  )
}

interface SettingsSectionProps {
  icon: string
  title: string
  body: string
  children: React.ReactNode
}

function SettingsSection({ icon, title, body, children }: SettingsSectionProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/30',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'material-symbols-outlined text-primary bg-primary-container rounded-xl shrink-0',
          )}
          style={{ width: 44, height: 44, fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        <div className={cm.cn('flex-1 min-w-0')}>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tracking-tight')}>
            {title}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>{body}</p>
          <div className={cm.cn('mt-4')}>{children}</div>
        </div>
      </div>
    </section>
  )
}
