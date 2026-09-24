import { useEffect, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const TARGET_LANGUAGES = [
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'it', flag: '🇮🇹', name: 'Italian' },
] as const

const DAILY_GOALS = [
  { value: 50, label: 'Casual', minutes: 5 },
  { value: 100, label: 'Regular', minutes: 10 },
  { value: 150, label: 'Serious', minutes: 20 },
  { value: 250, label: 'Intense', minutes: 40 },
] as const

interface PrefsBody {
  target_languages: string[]
  daily_goal_xp: number
  theme: 'light' | 'dark' | 'system'
  reminder_enabled: boolean
  reminder_time: string
  streak_alerts_enabled: boolean
  email_digest_enabled: boolean
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [targetLang, setTargetLang] = useState<string>('es')
  const [dailyGoal, setDailyGoal] = useState<number>(50)
  const [reminders, setReminders] = useState<boolean>(true)
  const [reminderTime, setReminderTime] = useState<string>('19:00')
  const [emailDigest, setEmailDigest] = useState<boolean>(false)
  const [pushStreak, setPushStreak] = useState<boolean>(true)
  const [loaded, setLoaded] = useState(false)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const skipNextSave = useRef(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<PrefsBody | { data: PrefsBody }>('/api/users/me/preferences')
      .then((res) => {
        if (cancelled) return
        const body =
          (res && typeof res === 'object' && 'data' in res
            ? (res as { data: PrefsBody }).data
            : (res as PrefsBody)) ?? null
        if (body) {
          if (Array.isArray(body.target_languages) && body.target_languages.length > 0) {
            setTargetLang(String(body.target_languages[0]))
          }
          if (Number.isFinite(body.daily_goal_xp)) setDailyGoal(Number(body.daily_goal_xp))
          if (typeof body.reminder_enabled === 'boolean') setReminders(body.reminder_enabled)
          if (typeof body.reminder_time === 'string' && /^\d{2}:\d{2}$/.test(body.reminder_time))
            setReminderTime(body.reminder_time)
          if (typeof body.streak_alerts_enabled === 'boolean')
            setPushStreak(body.streak_alerts_enabled)
          if (typeof body.email_digest_enabled === 'boolean')
            setEmailDigest(body.email_digest_enabled)
        }
      })
      .catch(() => {
        // Use defaults; Settings page still works.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Debounced save: every change triggers a 400ms-debounced PATCH.
  useEffect(() => {
    if (!loaded) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSavingState('saving')
      setError(null)
      http
        .patch('/api/users/me/preferences', {
          target_languages: [targetLang],
          daily_goal_xp: dailyGoal,
          reminder_enabled: reminders,
          reminder_time: reminderTime,
          streak_alerts_enabled: pushStreak,
          email_digest_enabled: emailDigest,
        })
        .then(() => {
          setSavingState('saved')
          setTimeout(() => setSavingState((s) => (s === 'saved' ? 'idle' : s)), 1500)
        })
        .catch((err) => {
          setSavingState('error')
          setError(
            err instanceof Error
              ? err.message
              : t('settings.saveError', {}, { defaultValue: 'Could not save preferences.' }),
          )
        })
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [loaded, http, t, targetLang, dailyGoal, reminders, reminderTime, pushStreak, emailDigest])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
          {t('settings.eyebrow', {}, { defaultValue: 'Practice preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p
          aria-live="polite"
          data-testid="settings-status"
          className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}
        >
          {savingState === 'saving' && t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
          {savingState === 'saved' && t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          {savingState === 'error' &&
            (error ?? t('settings.saveError', {}, { defaultValue: 'Could not save preferences.' }))}
        </p>
      </header>

      {/* Target language. */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.targetLanguageHeading', {}, { defaultValue: 'Target language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.targetLanguageBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'The language {{appName}} teaches first. You can switch at any time without losing progress.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 sm:grid-cols-3')}
          data-testid="settings-target-langs"
        >
          {TARGET_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setTargetLang(lang.code)}
              aria-pressed={targetLang === lang.code}
              data-testid={`lang-${lang.code}`}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-xl border-2 transition-all',
                targetLang === lang.code
                  ? 'border-primary bg-primary-container/30 text-primary'
                  : 'border-outline-variant/40 hover:border-primary',
              )}
            >
              <span className={cm.cn('text-2xl')} aria-hidden="true">
                {lang.flag}
              </span>
              <span className={cm.cn(cm.fontWeight('semibold'))}>
                {t(`settings.lang.${lang.code}`, {}, { defaultValue: lang.name })}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Interface language (the app's UI language, distinct from the target language being learned). */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.language.title', {}, { defaultValue: 'Interface language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.language.description',
              {},
              { defaultValue: 'Choose the language used throughout the app menus and labels.' },
            )}
          </p>
        </div>
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
      {/* Daily goal. */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.goalHeading', {}, { defaultValue: 'Daily goal' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.goalBody',
              {},
              {
                defaultValue:
                  'How much XP you’re aiming for each day. Streaks are kept whenever you hit the goal.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 sm:grid-cols-4')}
          data-testid="settings-goals"
        >
          {DAILY_GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setDailyGoal(g.value)}
              aria-pressed={dailyGoal === g.value}
              data-testid={`goal-${g.value}`}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ direction: 'col', align: 'start', gap: 'xs' }),
                'rounded-xl border-2 transition-all text-left',
                dailyGoal === g.value
                  ? 'border-primary bg-primary-container/30'
                  : 'border-outline-variant/40 hover:border-primary',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`settings.goalTier.${g.label}`, {}, { defaultValue: g.label })}
              </span>
              <span className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums')}>
                {g.value} XP
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.goalMinutes',
                  { min: g.minutes },
                  { defaultValue: '~{{min}} min/day' },
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Reminders & notifications. */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.notifyBody',
              {},
              {
                defaultValue:
                  'Gentle, not pushy. Two reminders max per day, and you can mute streak alerts independently.',
              },
            )}
          </p>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 3))}>
          <div>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('settings.notifyDaily', {}, { defaultValue: 'Daily practice reminder' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'settings.notifyDailyHint',
                { time: reminderTime },
                { defaultValue: 'Once a day at {{time}} local time.' },
              )}
            </p>
          </div>
          <Switch
            checked={reminders}
            onChange={(e) => setReminders((e.target as HTMLInputElement).checked)}
            aria-label={t('settings.notifyDaily', {}, { defaultValue: 'Daily practice reminder' })}
            data-testid="settings-toggle-reminder"
          />
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 3))}>
          <label
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.w(40))}
            htmlFor="reminderTime"
          >
            {t('settings.reminderTime', {}, { defaultValue: 'Reminder time' })}
          </label>
          <input
            id="reminderTime"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            disabled={!reminders}
            data-testid="settings-reminder-time"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-lg bg-surface-container-low border border-outline-variant/40 disabled:opacity-50',
            )}
          />
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 3))}>
          <p className={cm.cn(cm.fontWeight('semibold'))}>
            {t('settings.notifyStreak', {}, { defaultValue: 'Streak loss alert' })}
          </p>
          <Switch
            checked={pushStreak}
            onChange={(e) => setPushStreak((e.target as HTMLInputElement).checked)}
            aria-label={t('settings.notifyStreak', {}, { defaultValue: 'Streak loss alert' })}
            data-testid="settings-toggle-streak"
          />
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 3))}>
          <p className={cm.cn(cm.fontWeight('semibold'))}>
            {t('settings.notifyDigest', {}, { defaultValue: 'Weekly email digest' })}
          </p>
          <Switch
            checked={emailDigest}
            onChange={(e) => setEmailDigest((e.target as HTMLInputElement).checked)}
            aria-label={t('settings.notifyDigest', {}, { defaultValue: 'Weekly email digest' })}
            data-testid="settings-toggle-digest"
          />
        </div>
      </section>
    </div>
  )
}

export default Settings
