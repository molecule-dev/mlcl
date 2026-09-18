import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useGet, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface UserPreferences {
  weeklyReminders: boolean
  mondayDigest: boolean
  coachingNudges: boolean
}

interface UserSettings {
  cadence: 'weekly' | 'biweekly'
  preferences: UserPreferences
  updated_at: string | null
}

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  testId?: string
  onChange: (next: boolean) => void
}

function ToggleRow({ label, description, checked, testId, onChange }: ToggleProps) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      data-testid={testId}
      aria-pressed={checked}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('p', 4),
        'w-full text-left rounded-xl hover:bg-surface-container-low transition-colors',
      )}
    >
      <div className={cm.cn(cm.stack(1), 'min-w-0')}>
        <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-snug')}>
          {description}
        </p>
      </div>
      <span
        aria-hidden
        className={cm.cn(
          'relative w-10 h-6 rounded-full shrink-0 transition-colors',
          checked ? 'bg-indigo-600' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const client = useHttpClient()

  const { data: serverSettings, execute: refetchSettings } = useGet<UserSettings>('/api/settings', {
    immediate: true,
  })

  const [cadence, setCadence] = useState<'weekly' | 'biweekly'>('weekly')
  const [reminders, setReminders] = useState(true)
  const [digest, setDigest] = useState(true)
  const [coachNudges, setCoachNudges] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!serverSettings) return
    setCadence(serverSettings.cadence)
    setReminders(Boolean(serverSettings.preferences?.weeklyReminders))
    setDigest(Boolean(serverSettings.preferences?.mondayDigest))
    setCoachNudges(Boolean(serverSettings.preferences?.coachingNudges))
    setSavedAt(serverSettings.updated_at)
  }, [serverSettings])

  const persist = async (
    patch: Partial<{ cadence: 'weekly' | 'biweekly'; preferences: Partial<UserPreferences> }>,
  ) => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await client.patch<UserSettings>('/api/settings', patch)
      const next = res.data
      setCadence(next.cadence)
      setReminders(Boolean(next.preferences?.weeklyReminders))
      setDigest(Boolean(next.preferences?.mondayDigest))
      setCoachNudges(Boolean(next.preferences?.coachingNudges))
      setSavedAt(next.updated_at)
      void refetchSettings()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const updateCadence = (next: 'weekly' | 'biweekly') => {
    setCadence(next)
    void persist({ cadence: next })
  }

  const updatePref = (key: keyof UserPreferences) => (next: boolean) => {
    if (key === 'weeklyReminders') setReminders(next)
    if (key === 'mondayDigest') setDigest(next)
    if (key === 'coachingNudges') setCoachNudges(next)
    void persist({ preferences: { [key]: next } as Partial<UserPreferences> })
  }

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header className={cm.cn(cm.stack(2))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Workspace · Account · Cadence' })}
        </span>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--color-heading-ink)' }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p
          aria-live="polite"
          data-testid="settings-status"
          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
        >
          {saveError
            ? t(
                'settings.saveError',
                { error: saveError },
                { defaultValue: 'Save failed: {{error}}' },
              )
            : saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : savedAt
                ? t(
                    'settings.savedAt',
                    { time: new Date(savedAt).toLocaleString() },
                    { defaultValue: 'Saved {{time}}' },
                  )
                : ''}
        </p>
      </header>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 font-bold',
                )}
              >
                {(user?.name ?? user?.email ?? 'A').slice(0, 1).toUpperCase()}
              </div>
              <div className={cm.cn(cm.stack(1), 'min-w-0')}>
                <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface truncate')}>
                  {user?.name ?? t('settings.guestName', {}, { defaultValue: 'Climber' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                  {user?.email ?? 'climber@team.com'}
                </p>
              </div>
            </div>
            <Link
              to="/profile"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
              )}
            >
              {t('settings.openProfile', {}, { defaultValue: 'Open profile' })}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <Link
            to="/settings/billing"
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ align: 'center', gap: 'sm' }),
              'rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-transform',
            )}
          >
            <span className="material-symbols-outlined text-[24px]">credit_card</span>
            <div className={cm.cn(cm.flex1, 'min-w-0')}>
              <p className={cm.cn(cm.fontWeight('bold'))}>
                {t('settings.billingTitle', {}, { defaultValue: 'Billing & seats' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-indigo-100')}>
                {t(
                  'settings.billingSubtitle',
                  {},
                  { defaultValue: 'Manage plan, seats, and invoices' },
                )}
              </p>
            </div>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </aside>

        <div className={cm.cn('col-span-12 lg:col-span-8', cm.stack(6))}>
          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <header className={cm.cn(cm.stack(1))}>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}>
                {t('settings.cadenceHeading', {}, { defaultValue: 'Cadence' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.cadenceBody',
                  { appName: APP_NAME },
                  { defaultValue: 'Choose how often {{appName}} prompts your team for check-ins.' },
                )}
              </p>
            </header>
            <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
              {(['weekly', 'biweekly'] as const).map((option) => {
                const active = cadence === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateCadence(option)}
                    data-testid={`cadence-${option}`}
                    aria-pressed={active}
                    disabled={saving}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-xl ring-1 transition-colors disabled:opacity-60',
                      active
                        ? 'bg-primary text-on-primary ring-primary shadow'
                        : 'bg-surface-container-low text-on-surface ring-outline-variant hover:bg-surface-container',
                    )}
                  >
                    {t(
                      `settings.cadence.${option}` as 'settings.cadence.weekly',
                      {},
                      {
                        defaultValue:
                          option === 'weekly' ? 'Weekly · Friday 5pm' : 'Bi-weekly · Friday 5pm',
                      },
                    )}
                  </button>
                )
              })}
            </div>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 4),
              cm.stack(2),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface px-2')}
            >
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h2>
            <ToggleRow
              label={t(
                'settings.toggleRemindersLabel',
                {},
                { defaultValue: 'Weekly check-in reminders' },
              )}
              description={t(
                'settings.toggleRemindersDescription',
                {},
                { defaultValue: 'Notify the team Friday morning if a check-in is still missing.' },
              )}
              checked={reminders}
              onChange={updatePref('weeklyReminders')}
              testId="toggle-weeklyReminders"
            />
            <ToggleRow
              label={t('settings.toggleDigestLabel', {}, { defaultValue: 'Monday digest email' })}
              description={t(
                'settings.toggleDigestDescription',
                {},
                { defaultValue: 'Sends a Monday roll-up of objectives by status to every owner.' },
              )}
              checked={digest}
              onChange={updatePref('mondayDigest')}
              testId="toggle-mondayDigest"
            />
            <ToggleRow
              label={t('settings.toggleCoachLabel', {}, { defaultValue: 'Coaching nudges' })}
              description={t(
                'settings.toggleCoachDescription',
                {},
                {
                  defaultValue: 'Surface mid-quarter prompts when a KR slips two confidence steps.',
                },
              )}
              checked={coachNudges}
              onChange={updatePref('coachingNudges')}
              testId="toggle-coachingNudges"
            />
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <header className={cm.cn(cm.stack(1))}>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
            </header>
            <LanguagePicker />
          </article>
        </div>
      </section>
      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header className={cm.cn(cm.stack(1))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </header>
        <ThemeToggle />
      </section>
    </div>
  )
}

export default Settings
