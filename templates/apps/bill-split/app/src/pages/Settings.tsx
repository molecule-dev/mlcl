import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface SettlementPrefs {
  method?: 'cash' | 'transfer' | 'app'
  notify?: {
    expenses?: boolean
    settlements?: boolean
    members?: boolean
  }
  minimizer?: {
    simplifyTransfers?: boolean
    politeNudges?: boolean
  }
  nudgeFrequency?: 'off' | 'weekly' | 'daily'
}

interface UserRecord extends UserProfile {
  username?: string
  oauthData?: SettlementPrefs & Record<string, unknown>
}

interface UserResponse {
  props?: UserRecord
}

const DEFAULT_NOTIFY = {
  expenses: true,
  settlements: true,
  members: true,
}

const DEFAULT_MINIMIZER = {
  simplifyTransfers: true,
  politeNudges: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserRecord>()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [settleMethod, setSettleMethod] = useState<'cash' | 'transfer' | 'app'>('cash')
  const [notify, setNotify] = useState({ ...DEFAULT_NOTIFY })
  const [minimizer, setMinimizer] = useState({ ...DEFAULT_MINIMIZER })
  const [nudgeFrequency, setNudgeFrequency] = useState<'off' | 'weekly' | 'daily'>('weekly')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Hydrate from `/api/users/:id` directly — `useAuth().user` is the
  // initial sign-up snapshot and does NOT refresh after PATCH, so values
  // saved by this page on a previous visit would otherwise round-trip as
  // stale defaults.
  useEffect(() => {
    let cancelled = false
    if (!user?.id) return
    setName(user.name ?? user.username ?? '')
    setEmail(user.email ?? '')
    const initialPrefs = (user.oauthData as SettlementPrefs | undefined) ?? {}
    if (
      initialPrefs.method === 'cash' ||
      initialPrefs.method === 'transfer' ||
      initialPrefs.method === 'app'
    ) {
      setSettleMethod(initialPrefs.method)
    }
    setNotify({
      expenses: initialPrefs.notify?.expenses ?? DEFAULT_NOTIFY.expenses,
      settlements: initialPrefs.notify?.settlements ?? DEFAULT_NOTIFY.settlements,
      members: initialPrefs.notify?.members ?? DEFAULT_NOTIFY.members,
    })
    setMinimizer({
      simplifyTransfers:
        initialPrefs.minimizer?.simplifyTransfers ?? DEFAULT_MINIMIZER.simplifyTransfers,
      politeNudges: initialPrefs.minimizer?.politeNudges ?? DEFAULT_MINIMIZER.politeNudges,
    })
    if (
      initialPrefs.nudgeFrequency === 'off' ||
      initialPrefs.nudgeFrequency === 'weekly' ||
      initialPrefs.nudgeFrequency === 'daily'
    ) {
      setNudgeFrequency(initialPrefs.nudgeFrequency)
    }

    void (async () => {
      try {
        const response = await http.get<UserResponse>(`/users/${encodeURIComponent(user.id)}`)
        if (cancelled) return
        const fresh = response.data?.props
        if (!fresh) return
        if (fresh.name) setName(fresh.name)
        else if (fresh.username) setName(fresh.username)
        if (fresh.email) setEmail(fresh.email)
        const remotePrefs = (fresh.oauthData as SettlementPrefs | undefined) ?? {}
        if (
          remotePrefs.method === 'cash' ||
          remotePrefs.method === 'transfer' ||
          remotePrefs.method === 'app'
        ) {
          setSettleMethod(remotePrefs.method)
        }
        setNotify({
          expenses: remotePrefs.notify?.expenses ?? DEFAULT_NOTIFY.expenses,
          settlements: remotePrefs.notify?.settlements ?? DEFAULT_NOTIFY.settlements,
          members: remotePrefs.notify?.members ?? DEFAULT_NOTIFY.members,
        })
        setMinimizer({
          simplifyTransfers:
            remotePrefs.minimizer?.simplifyTransfers ?? DEFAULT_MINIMIZER.simplifyTransfers,
          politeNudges: remotePrefs.minimizer?.politeNudges ?? DEFAULT_MINIMIZER.politeNudges,
        })
        if (
          remotePrefs.nudgeFrequency === 'off' ||
          remotePrefs.nudgeFrequency === 'weekly' ||
          remotePrefs.nudgeFrequency === 'daily'
        ) {
          setNudgeFrequency(remotePrefs.nudgeFrequency)
        }
      } catch (_error) {
        // network error — keep the snapshot we hydrated from useAuth().user; ignoring is correct
      }
    })()

    return () => {
      cancelled = true
    }
  }, [http, user])

  async function saveProfile(): Promise<void> {
    if (!user?.id) return
    setSavingProfile(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const payload: Record<string, unknown> = {}
      if (name && name !== (user.name ?? '')) payload.name = name
      if (email && email !== (user.email ?? '')) payload.email = email
      if (Object.keys(payload).length === 0) {
        setProfileSaved(true)
        return
      }
      await http.patch(`/users/${encodeURIComponent(user.id)}`, payload)
      setProfileSaved(true)
    } catch (err) {
      console.warn('Profile save failed', err)
      setProfileError(
        t(
          'settings.profileSaveFailed',
          {},
          {
            defaultValue: 'Could not update profile. Please try again.',
          },
        ),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePrefs(next: SettlementPrefs): Promise<void> {
    if (!user?.id) return
    setSavingPrefs(true)
    try {
      // Re-read current oauthData so a sibling tab that wrote unrelated
      // keys doesn't get clobbered by this PATCH.
      let currentOauth: Record<string, unknown> = {}
      try {
        const fresh = await http.get<UserResponse>(`/users/${encodeURIComponent(user.id)}`)
        currentOauth = (fresh.data?.props?.oauthData as Record<string, unknown>) ?? {}
      } catch (_error) {
        // fallback to cached oauthData if the GET fails — ignoring fetch error is correct here
        currentOauth = (user.oauthData as Record<string, unknown> | undefined) ?? {}
      }
      const merged = {
        ...currentOauth,
        method: next.method,
        notify: next.notify,
        minimizer: next.minimizer,
        nudgeFrequency: next.nudgeFrequency,
      }
      await http.patch(`/users/${encodeURIComponent(user.id)}`, {
        oauthData: merged,
      })
    } catch (err) {
      console.warn('Preference save failed', err)
    } finally {
      setSavingPrefs(false)
    }
  }

  function currentPrefs(): SettlementPrefs {
    return { method: settleMethod, notify, minimizer, nudgeFrequency }
  }

  function setMethod(method: 'cash' | 'transfer' | 'app'): void {
    setSettleMethod(method)
    void savePrefs({ ...currentPrefs(), method })
  }

  function toggleNotify(key: keyof typeof notify): void {
    const next = { ...notify, [key]: !notify[key] }
    setNotify(next)
    void savePrefs({ ...currentPrefs(), notify: next })
  }

  function toggleMinimizer(key: keyof typeof minimizer): void {
    const next = { ...minimizer, [key]: !minimizer[key] }
    setMinimizer(next)
    void savePrefs({ ...currentPrefs(), minimizer: next })
  }

  function setFrequency(next: 'off' | 'weekly' | 'daily'): void {
    setNudgeFrequency(next)
    void savePrefs({ ...currentPrefs(), nudgeFrequency: next })
  }

  return (
    <div data-mol-id="page-settings" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Workspace preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.profileTitle', {}, { defaultValue: 'Profile & Account Information' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="profile-name"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </label>
            <input
              id="profile-name"
              data-mol-id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="profile-email"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </label>
            <input
              id="profile-email"
              data-mol-id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <button
              type="button"
              data-mol-id="settings-save-profile"
              disabled={savingProfile}
              onClick={() => void saveProfile()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full text-white shadow-sm disabled:opacity-60',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
              }}
            >
              {savingProfile
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
            {profileSaved ? (
              <span
                data-mol-id="settings-profile-saved"
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              >
                {t('settings.profile.saved', {}, { defaultValue: 'Saved ✓' })}
              </span>
            ) : null}
          </div>
          {profileError ? (
            <p
              data-mol-id="settings-profile-error"
              className={cm.cn(cm.textSize('xs'), 'text-error')}
            >
              {profileError}
            </p>
          ) : null}
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'settings.settlement.title',
              {},
              { defaultValue: 'Settlement & Payout Preferences' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.settlement.subtitle',
              {},
              {
                defaultValue:
                  'Pre-filled when you record a settle-up. Evenly never moves money — this only labels how you paid each other back.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {(
              [
                { value: 'cash', icon: 'payments', label: 'Cash in hand' },
                { value: 'transfer', icon: 'account_balance', label: 'Bank transfer' },
                { value: 'app', icon: 'smartphone', label: 'Payment app' },
              ] as const
            ).map((opt) => {
              const active = settleMethod === opt.value
              return (
                <button
                  type="button"
                  key={opt.value}
                  data-mol-id={`settle-${opt.value}`}
                  disabled={savingPrefs}
                  onClick={() => setMethod(opt.value)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl text-left transition-colors disabled:opacity-60',
                    active
                      ? 'bg-primary-container border border-primary text-on-primary-container'
                      : 'bg-surface-container-low border border-outline-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    {opt.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`settings.settlement.${opt.value}`, {}, { defaultValue: opt.label })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'settings.minimizer.title',
              { app: APP_NAME },
              { defaultValue: 'Evenly Smart Debt Minimizer Preferences' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.minimizer.subtitle',
              {},
              {
                defaultValue:
                  'How aggressively {{app}} collapses who-owes-whom into the fewest transfers.',
              },
            )}
          </p>
          <ul className={cm.stack(2)}>
            {[
              {
                key: 'simplifyTransfers' as const,
                label: 'Simplify transfers inside every circle',
                hint: 'Reciprocal debts cancel before anyone is asked to pay.',
              },
              {
                key: 'politeNudges' as const,
                label: 'Polite automated nudges',
                hint: 'Gentle reminders instead of group-text standoffs.',
              },
            ].map((row) => (
              <li key={row.key}>
                <label
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer',
                  )}
                >
                  <span>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium') + ' block')}>
                      {t(`settings.minimizer.${row.key}`, {}, { defaultValue: row.label })}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(`settings.minimizerHint.${row.key}`, {}, { defaultValue: row.hint })}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    data-mol-id={`minimizer-${row.key}`}
                    checked={minimizer[row.key]}
                    onChange={() => toggleMinimizer(row.key)}
                    disabled={savingPrefs}
                    className={cm.cn(
                      'h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary/30',
                    )}
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'settings.notifications.title',
              {},
              { defaultValue: 'Notification & Polite Nudge Frequency' },
            )}
          </h2>
          {(
            [
              { key: 'expenses', defaultValue: 'When an expense lands in my group' },
              { key: 'settlements', defaultValue: 'When someone records a settlement' },
              { key: 'members', defaultValue: 'When a member joins or leaves' },
            ] as const
          ).map((row) => (
            <label
              key={row.key}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t(`settings.notifications.${row.key}`, {}, { defaultValue: row.defaultValue })}
              </span>
              <input
                type="checkbox"
                data-mol-id={`notify-${row.key}`}
                checked={notify[row.key]}
                onChange={() => toggleNotify(row.key)}
                disabled={savingPrefs}
                className={cm.cn(
                  'h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary/30',
                )}
              />
            </label>
          ))}
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('pt', 2))}>
            <label
              htmlFor="nudge-frequency"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            >
              {t(
                'settings.nudgeFrequency',
                {},
                { defaultValue: 'How often should polite nudges go out?' },
              )}
            </label>
            <select
              id="nudge-frequency"
              data-mol-id="settings-nudge-frequency"
              value={nudgeFrequency}
              disabled={savingPrefs}
              onChange={(e) => setFrequency(e.target.value as 'off' | 'weekly' | 'daily')}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary outline-none',
              )}
            >
              {(
                [
                  { value: 'off', label: 'Never — I’ll nudge by hand' },
                  { value: 'weekly', label: 'Weekly roundup' },
                  { value: 'daily', label: 'Daily until settled' },
                ] as const
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`settings.nudgeFrequency.${opt.value}`, {}, { defaultValue: opt.label })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.language.title', {}, { defaultValue: 'Localization, Currency & Display' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.language.subtitle',
              {},
              {
                defaultValue:
                  'Choose the language used throughout the app. Amounts display in each circle’s own currency (USD by default), and the theme follows your system or the toggle below.',
              },
            )}
          </p>
          <LanguagePicker />
          <div className={cm.sp('pt', 2)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 2),
              )}
            >
              {t('settings.display', {}, { defaultValue: 'Display' })}
            </p>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* Stitch section — "Account Closure & Data Protection". */}
      <section
        data-mol-id="settings-account-closure"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-error/30 shadow-sm',
          cm.stack(3),
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 2 }),
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 rounded-lg bg-error-container/40 text-error',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>lock_reset</span>
          </span>
          {t('settings.closure.title', {}, { defaultValue: 'Account Closure & Data Protection' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-3xl')}>
          {t(
            'settings.closure.body',
            { app: APP_NAME },
            {
              defaultValue:
                'Your ledger belongs to you. Export every split, settlement, and circle as JSON or CSV any time, and closing your account permanently erases your profile and split history within 30 days.',
            },
          )}
        </p>
        <div className={cm.flex({ wrap: 'wrap', gap: 'sm' })}>
          <a
            href="mailto:privacy@evenly.app?subject=Data%20export%20request"
            data-mol-id="settings-request-export"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              file_download
            </span>
            {t('settings.closure.export', {}, { defaultValue: 'Request my data export' })}
          </a>
          <a
            href="mailto:privacy@evenly.app?subject=Account%20closure%20request"
            data-mol-id="settings-request-closure"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-error/40 text-error hover:bg-error-container/30 transition-colors inline-flex items-center gap-2',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              delete_forever
            </span>
            {t('settings.closure.close', {}, { defaultValue: 'Close my account' })}
          </a>
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'settings.closure.note',
            {},
            {
              defaultValue:
                'Settlements you already recorded stay consistent for the other members of your circles — amounts already owed are not silently rewritten.',
            },
          )}
        </p>
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
