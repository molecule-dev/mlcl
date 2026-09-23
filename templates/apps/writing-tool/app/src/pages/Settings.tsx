import { type ReactNode, useCallback, useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { VersalInput } from '../components/VersalInput.js'
import {
  EXPORT_FORMAT_KEY,
  type ExportFormat,
  readDefaultExportFormat,
} from '../lib/export-format.js'
import { DAILY_GOAL_KEY } from '../lib/goal.js'

interface ToggleRow {
  id: string
  label: string
  description: string
  defaultEnabled: boolean
}

const EDITOR_TOGGLES: ReadonlyArray<ToggleRow> = [
  {
    id: 'typewriterScroll',
    label: 'Typewriter scroll',
    description: 'Keep the active line vertically centered while you write.',
    defaultEnabled: true,
  },
  {
    id: 'fadeAdjacent',
    label: 'Fade adjacent paragraphs',
    description: 'Reduce opacity of paragraphs above and below the active line.',
    defaultEnabled: true,
  },
  {
    id: 'autoFocusOnIdle',
    label: 'Auto focus mode',
    description: 'Slip into focus mode after 30 seconds of typing without chrome interaction.',
    defaultEnabled: false,
  },
  {
    id: 'spellCheck',
    label: 'Spell check',
    description: 'Underline misspelled words in the editor surface.',
    defaultEnabled: true,
  },
]

const STORAGE_KEYS = {
  goal: DAILY_GOAL_KEY,
  toggles: 'versal.editorToggles',
  exportFormat: EXPORT_FORMAT_KEY,
}

interface SectionProps {
  eyebrow: string
  heading: string
  description: string
  children: ReactNode
}

function SettingsSection({ eyebrow, heading, description, children }: SectionProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
      )}
    >
      <div className={cm.cn('mb-6 max-w-xl')}>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {eyebrow}
        </p>
        <h2
          className={cm.cn('text-2xl font-bold tracking-tight text-on-surface')}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {heading}
        </h2>
        <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>{description}</p>
      </div>
      {children}
    </section>
  )
}

/**
 * Settings — profile + writing preferences.
 *
 * Profile (name + email) round-trips to /api/users/:id (PATCH) and the
 * resulting user is reflected back into the auth context. Writing
 * preferences (daily goal, editor toggles, default export format) live
 * in localStorage — they are user-local UI affordances, not
 * server-owned data.
 */
export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, setUser } = useAuth<UserProfile>()
  const http = useHttpClient()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [dailyGoal, setDailyGoal] = useState('2000')
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EDITOR_TOGGLES.map((row) => [row.id, row.defaultEnabled])),
  )
  const [exportFormat, setExportFormat] = useState<ExportFormat>('md')
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.name, user?.email])

  useEffect(() => {
    try {
      const goal = window.localStorage.getItem(STORAGE_KEYS.goal)
      if (goal) setDailyGoal(goal)
      const tog = window.localStorage.getItem(STORAGE_KEYS.toggles)
      if (tog) setToggles((prev) => ({ ...prev, ...(JSON.parse(tog) as Record<string, boolean>) }))
      setExportFormat(readDefaultExportFormat())
    } catch (_error) {
      // localStorage unavailable (private mode, server-render) — safe to ignore.
    }
  }, [])

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      // The user-resource handler returns `{ props: <user> }`. Surface
      // either shape so the auth client (which expects the entity at
      // top level) gets a clean update.
      // The user-resource update handler returns ONLY the changed props
      // wrapped as `{ props: { name: '...', updatedAt: '...' } }` — no
      // `id`, no full entity. Treat any 2xx with a non-empty `props`
      // object as a successful merge and update the auth context so the
      // change survives reload (the auth client hydrates from
      // localStorage on mount).
      const res = await http.patch<UserProfile & { props?: Partial<UserProfile> }>(
        `/users/${user.id}`,
        { name: name.trim(), email: email.trim() },
      )
      const updated = (res.data && (res.data.props ?? res.data)) as Partial<UserProfile> | undefined
      if (updated && Object.keys(updated).length > 0) {
        setUser({ ...(user as UserProfile), ...updated })
        setProfileMsg({
          kind: 'ok',
          text: t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }),
        })
      } else {
        setProfileMsg({
          kind: 'err',
          text: t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
        })
      }
    } catch (error) {
      logError('settings.handleSaveProfile', error)
      setProfileMsg({
        kind: 'err',
        text: t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      })
    } finally {
      setProfileSaving(false)
    }
  }, [user, http, name, email, setUser, t])

  const persistGoal = useCallback((value: string) => {
    setDailyGoal(value)
    try {
      window.localStorage.setItem(STORAGE_KEYS.goal, value)
    } catch (_error) {
      // localStorage unavailable (private mode) — preference is held in state only.
    }
    setPrefsMsg('Saved')
  }, [])

  const persistToggle = useCallback((id: string, value: boolean) => {
    setToggles((prev) => {
      const next = { ...prev, [id]: value }
      try {
        window.localStorage.setItem(STORAGE_KEYS.toggles, JSON.stringify(next))
      } catch (_error) {
        // localStorage unavailable (private mode) — preference is held in state only.
      }
      return next
    })
    setPrefsMsg('Saved')
  }, [])

  const persistExport = useCallback((value: ExportFormat) => {
    setExportFormat(value)
    try {
      window.localStorage.setItem(STORAGE_KEYS.exportFormat, value)
    } catch (_error) {
      // localStorage unavailable (private mode) — preference is held in state only.
    }
    setPrefsMsg('Saved')
  }, [])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'mx-auto w-full max-w-5xl space-y-8')}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('settings.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} · Settings' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t('settings.heading', {}, { defaultValue: 'Make the room your own.' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 2), 'text-base text-on-surface-variant max-w-xl')}>
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue:
                'Profile, daily goals, editor preferences, and export defaults — all in one quiet column.',
            },
          )}
        </p>
      </header>

      <SettingsSection
        eyebrow={t('nav.profile', {}, { defaultValue: 'Profile' })}
        heading={t('settings.profile.heading', {}, { defaultValue: 'Who shows up on the page' })}
        description={t(
          'settings.profile.description',
          {},
          {
            defaultValue:
              'Your name appears on shared manuscripts; the email is for sign-in and reset links.',
          },
        )}
      >
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-5')}>
          <VersalInput
            label={t('form.displayName', {}, { defaultValue: 'Display name' })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="settings-name"
            autoComplete="name"
          />
          <VersalInput
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="settings-email"
            autoComplete="email"
          />
        </div>
        <div className={cm.cn('mt-4 flex items-center gap-3')}>
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={profileSaving || !user?.id}
            data-testid="settings-save-profile"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-xl bg-primary text-on-primary text-sm font-bold disabled:opacity-50',
            )}
          >
            {profileSaving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
          </button>
          {profileMsg ? (
            <span
              role="status"
              data-testid="settings-profile-msg"
              className={cm.cn(
                'text-[12px] font-bold',
                profileMsg.kind === 'ok' ? 'text-success' : 'text-error',
              )}
            >
              {profileMsg.text}
            </span>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        eyebrow={t('settings.goals.eyebrow', {}, { defaultValue: 'Word goals' })}
        heading={t(
          'settings.goals.heading',
          {},
          { defaultValue: 'A daily target — small enough to keep' },
        )}
        description={t(
          'settings.goals.description',
          { appName: APP_NAME },
          {
            defaultValue:
              '500 is a working session. 2,000 is a serious draft day. {{appName}} nudges, never nags.',
          },
        )}
      >
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
          <VersalInput
            label={t('settings.goals.daily', {}, { defaultValue: 'Daily goal (words)' })}
            type="number"
            value={dailyGoal}
            onChange={(e) => persistGoal(e.target.value)}
            min={100}
            step={50}
            data-testid="settings-daily-goal"
          />
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-2xl bg-primary/5 border border-primary/20 col-span-1 md:col-span-2 flex items-center gap-3',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              auto_awesome
            </span>
            <p className={cm.cn('text-sm text-on-surface')}>
              {t(
                'settings.goals.tip',
                {},
                {
                  defaultValue:
                    'Tip: a goal you meet four mornings a week beats a goal you miss seven.',
                },
              )}
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        eyebrow={t('settings.editor.eyebrow', {}, { defaultValue: 'Editor preferences' })}
        heading={t('settings.editor.heading', {}, { defaultValue: 'How the page behaves' })}
        description={t(
          'settings.editor.description',
          {},
          {
            defaultValue:
              'Typewriter scroll, paragraph fade, and idle focus — defaults are tuned for long sessions.',
          },
        )}
      >
        <ul className={cm.cn('divide-y divide-outline-variant/40')}>
          {EDITOR_TOGGLES.map((row) => (
            <li
              key={row.id}
              className={cm.cn(cm.sp('py', 4), 'flex items-start justify-between gap-4')}
            >
              <div className={cm.cn('flex-1 min-w-0')}>
                <p className={cm.cn('text-sm font-bold text-on-surface')}>
                  {t(`settings.editor.${row.id}.label`, {}, { defaultValue: row.label })}
                </p>
                <p className={cm.cn('mt-0.5 text-[13px] text-on-surface-variant')}>
                  {t(
                    `settings.editor.${row.id}.description`,
                    {},
                    { defaultValue: row.description },
                  )}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={toggles[row.id]}
                aria-label={row.label}
                onClick={() => persistToggle(row.id, !toggles[row.id])}
                data-testid={`settings-toggle-${row.id}`}
                className={cm.cn(
                  'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                  toggles[row.id] ? 'bg-primary' : 'bg-surface-container-high',
                )}
              >
                <span
                  className={cm.cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-[left]',
                    toggles[row.id] ? 'left-[22px]' : 'left-0.5',
                  )}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection
        eyebrow={t('settings.language.eyebrow', {}, { defaultValue: 'Language' })}
        heading={t('settings.language.heading', {}, { defaultValue: 'How the page speaks back' })}
        description={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      >
        <div data-testid="settings-language">
          <LanguagePicker />
        </div>
      </SettingsSection>

      <SettingsSection
        eyebrow={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        heading={t('settings.appearance.heading', {}, { defaultValue: 'Light or dark' })}
        description={t(
          'common.toggleLightDark',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      >
        <ThemeToggle />
      </SettingsSection>

      <SettingsSection
        eyebrow={t('settings.export.eyebrow', {}, { defaultValue: 'Export & integrations' })}
        heading={t('settings.export.heading', {}, { defaultValue: 'Where finished pages go' })}
        description={t(
          'settings.export.description',
          { appName: APP_NAME },
          {
            defaultValue:
              'Default export format and where {{appName}} can push polished work on send.',
          },
        )}
      >
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-3')}>
          {(
            [
              { id: 'md', label: 'Markdown', icon: 'data_object' },
              { id: 'txt', label: 'Plain text', icon: 'notes' },
              { id: 'html', label: 'HTML', icon: 'code' },
            ] as const
          ).map((fmt) => {
            const isActive = exportFormat === fmt.id
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => persistExport(fmt.id)}
                data-testid={`settings-export-${fmt.id}`}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({
                    direction: 'col',
                    align: 'center',
                    justify: 'center',
                    gap: 'xs',
                  }),
                  'rounded-xl border transition-colors',
                  isActive
                    ? 'border-primary/60 bg-primary/5 text-primary'
                    : 'border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[28px]')} aria-hidden="true">
                  {fmt.icon}
                </span>
                <span className={cm.cn('text-sm font-bold')}>
                  {t(`settings.export.${fmt.id}`, {}, { defaultValue: fmt.label })}
                </span>
                {isActive ? (
                  <span
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('settings.export.default', {}, { defaultValue: 'Default' })}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        {prefsMsg ? (
          <p
            role="status"
            data-testid="settings-prefs-msg"
            className={cm.cn('mt-4 text-[12px] font-bold text-success')}
          >
            {prefsMsg}
          </p>
        ) : null}
      </SettingsSection>
    </div>
  )
}

export default Settings
