import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { loadSleepGoals, saveSleepGoals } from '../lib/goal.js'

interface ToggleSettingProps {
  label: string
  description: string
  icon: string
  enabled: boolean
  onToggle: () => void
}

function ToggleSetting({ label, description, icon, enabled, onToggle }: ToggleSettingProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-10 w-10 rounded-xl shrink-0',
          )}
          style={{ backgroundColor: 'rgba(108, 92, 231, 0.14)', color: 'var(--color-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            {icon}
          </span>
        </span>
        <div className={cm.cn('min-w-0')}>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{label}</p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={cm.cn(
          'relative shrink-0 transition-all',
          'h-7 w-12 rounded-full',
          enabled ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-surface-container',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [bedtimeReminder, setBedtimeReminder] = useState(true)
  const [smartAlarm, setSmartAlarm] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [shareDevices, setShareDevices] = useState(false)
  const [savedGoals] = useState(loadSleepGoals)
  const [bedtimeGoal, setBedtimeGoal] = useState(savedGoals.bedtimeGoal)
  const [wakeGoal, setWakeGoal] = useState(savedGoals.wakeGoal)
  const [sleepGoalHours, setSleepGoalHours] = useState(savedGoals.sleepGoalHours)

  // Persist the sleep goals on change so they survive navigation and drive the
  // recovery ring (Dashboard/Trends/Night read the saved duration goal).
  useEffect(() => {
    saveSleepGoals({ sleepGoalHours, bedtimeGoal, wakeGoal })
  }, [sleepGoalHours, bedtimeGoal, wakeGoal])

  // Analytics: a goal edit commits when the input loses focus, so the
  // `goal.updated` event fires once per edit (not per keystroke/drag).
  const trackGoalUpdated = () => {
    track({
      name: 'goal.updated',
      properties: {
        sleep_goal_hours: sleepGoalHours,
        bedtime_goal: bedtimeGoal,
        wake_goal: wakeGoal,
      },
    })
  }

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        </p>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.goalsTitle', {}, { defaultValue: 'Sleep goals' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            cm.sp('mb', 4),
          )}
        >
          {t(
            'settings.goalsCaption',
            { appName: APP_NAME },
            { defaultValue: 'Tell {{appName}} what good looks like for you' },
          )}
        </p>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          <label className={cm.cn('block')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'block uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.bedtimeGoal', {}, { defaultValue: 'Bedtime' })}
            </span>
            <input
              type="time"
              value={bedtimeGoal}
              onChange={(e) => setBedtimeGoal(e.target.value)}
              onBlur={trackGoalUpdated}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'w-full text-base font-medium text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn('block')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'block uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.wakeGoal', {}, { defaultValue: 'Wake time' })}
            </span>
            <input
              type="time"
              value={wakeGoal}
              onChange={(e) => setWakeGoal(e.target.value)}
              onBlur={trackGoalUpdated}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'w-full text-base font-medium text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn('block')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'block uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.durationGoal', {}, { defaultValue: 'Duration goal (hours)' })}
            </span>
            <input
              type="number"
              min={5}
              max={11}
              step={0.5}
              value={sleepGoalHours}
              onChange={(e) => setSleepGoalHours(Number(e.target.value))}
              onBlur={trackGoalUpdated}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'w-full text-base font-medium text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </label>
        </div>
      </section>

      <section className={cm.cn('space-y-3')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h2>
        <ToggleSetting
          label={t('settings.bedtimeReminder.label', {}, { defaultValue: 'Bedtime reminder' })}
          description={t(
            'settings.bedtimeReminder.description',
            {},
            { defaultValue: 'Gentle nudge 30 minutes before your goal bedtime.' },
          )}
          icon="bedtime"
          enabled={bedtimeReminder}
          onToggle={() => setBedtimeReminder((v) => !v)}
        />
        <ToggleSetting
          label={t('settings.smartAlarm.label', {}, { defaultValue: 'Smart alarm' })}
          description={t(
            'settings.smartAlarm.description',
            {},
            { defaultValue: 'Wake within a window of light sleep before alarm time.' },
          )}
          icon="alarm"
          enabled={smartAlarm}
          onToggle={() => setSmartAlarm((v) => !v)}
        />
        <ToggleSetting
          label={t('settings.weeklyReport.label', {}, { defaultValue: 'Weekly recap email' })}
          description={t(
            'settings.weeklyReport.description',
            {},
            { defaultValue: 'Sunday morning summary of duration, score, and standout nights.' },
          )}
          icon="forward_to_inbox"
          enabled={weeklyReport}
          onToggle={() => setWeeklyReport((v) => !v)}
        />
      </section>

      <section className={cm.cn('space-y-3')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </h2>
        <ToggleSetting
          label={t(
            'settings.shareDevices.label',
            {},
            { defaultValue: 'Share device data with researchers' },
          )}
          description={t(
            'settings.shareDevices.description',
            {},
            { defaultValue: 'Anonymised, opt-in. You can stop sharing any time.' },
          )}
          icon="science"
          enabled={shareDevices}
          onToggle={() => setShareDevices((v) => !v)}
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('p', 5),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-10 w-10 rounded-xl shrink-0',
              )}
              style={{
                backgroundColor: 'var(--color-badge-red-bg)',
                color: 'var(--color-badge-red-fg)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                delete
              </span>
            </span>
            <div>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t(
                  'settings.exportDelete.label',
                  {},
                  { defaultValue: 'Export or delete your data' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'settings.exportDelete.description',
                  {},
                  { defaultValue: 'Get a CSV of every night, or remove your account permanently.' },
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            // TODO: open export/delete data flow
            onClick={() => {}}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full border-2 border-outline-variant hover:border-primary transition-colors',
            )}
          >
            {t('common.manage', {}, { defaultValue: 'Manage' })}
          </button>
        </div>
      </section>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
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
    </div>
  )
}
