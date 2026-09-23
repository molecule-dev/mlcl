import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const TABS = [
  { key: 'profile', icon: 'person', label: 'Profile' },
  { key: 'role', icon: 'switch_account', label: 'Role' },
  { key: 'payments', icon: 'credit_card', label: 'Payments' },
  { key: 'notifications', icon: 'notifications', label: 'Notifications' },
] as const

type TabKey = (typeof TABS)[number]['key']

type RoleKey = 'student' | 'tutor'

type NotificationPrefs = {
  sessionReminder?: boolean
  newReview?: boolean
  tutorMatches?: boolean
  productUpdates?: boolean
}

type UserMeResponse = {
  props?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
  plan?: { title?: string; planKey?: string; description?: string } | null
}

type AppSettings = {
  notifications?: NotificationPrefs
  activeRole?: RoleKey
}

type BillingStatus = {
  planKey?: string
  category?: string
  name?: string
  isFree?: boolean
}

const NOTIFICATION_DEFAULTS: NotificationPrefs = {
  sessionReminder: true,
  newReview: true,
  tutorMatches: false,
  productUpdates: false,
}

const NOTIFICATION_ROWS: Array<{ key: keyof NotificationPrefs; label: string }> = [
  { key: 'sessionReminder', label: 'Session reminders (24h before)' },
  { key: 'newReview', label: 'When a tutor leaves you a review' },
  { key: 'tutorMatches', label: 'New tutor matches in your subjects' },
  { key: 'productUpdates', label: `${APP_NAME} product updates` },
]

export function Account() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, refresh } = useAuth<UserProfile>()
  const http = useHttpClient()
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [role, setRole] = useState<RoleKey>('student')
  const [meData, setMeData] = useState<UserMeResponse['props']>(null)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(NOTIFICATION_DEFAULTS)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleFeedback, setRoleFeedback] = useState<string | null>(null)

  // Pull canonical user data from /api/users/me (auth user object is light)
  // and the app's preference slice from the server-side /api/settings
  // channel. Preferences live in the user row's oauthData blob, which the
  // platform NEVER returns on self-reads — so they must round-trip through
  // the app-owned settings route, never through users/me.
  useEffect(() => {
    let active = true
    http
      .get<UserMeResponse>('/api/users/me')
      .then((res) => {
        if (!active) return
        const data = (res as { data?: UserMeResponse | null }).data
        const props = data?.props ?? null
        setMeData(props)
        setDisplayName(props?.name ?? user?.name ?? '')
        setEmail(props?.email ?? user?.email ?? '')
      })
      .catch(() => {
        if (active) {
          setDisplayName(user?.name ?? '')
          setEmail(user?.email ?? '')
        }
      })
    http
      .get<AppSettings>('/api/settings')
      .then((res) => {
        if (!active) return
        const settings = (res as { data?: AppSettings | null }).data
        if (!settings) return
        if (settings.notifications) {
          setNotifPrefs({ ...NOTIFICATION_DEFAULTS, ...settings.notifications })
        }
        if (settings.activeRole === 'tutor' || settings.activeRole === 'student') {
          setRole(settings.activeRole)
        }
      })
      .catch(() => {})
    http
      .get<BillingStatus>('/api/billing/status')
      .then((res) => {
        if (!active) return
        const data = (res as { data?: BillingStatus | null }).data
        if (data) setBilling(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [http]) // eslint-disable-line react-hooks/exhaustive-deps

  const userEmail = meData?.email ?? user?.email ?? ''
  const userName = meData?.name ?? user?.name ?? 'Student'

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setProfileSaving(true)
    setProfileFeedback(null)
    try {
      const payload: { name: string; email?: string } = { name: displayName.trim() }
      const trimmedEmail = email.trim()
      if (trimmedEmail) payload.email = trimmedEmail
      await http.patch('/api/users/me', payload)
      // Re-pull canonical data so the displayed name updates
      const refetch = await http.get<UserMeResponse>('/api/users/me')
      const data = (refetch as { data?: UserMeResponse | null }).data
      setMeData(data?.props ?? null)
      try {
        await refresh?.()
      } catch (_error) {
        // refresh is optional — profile already saved; ignore refresh failure
      }
      setProfileFeedback(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (err) {
      setProfileFeedback(
        (err as { message?: string }).message ??
          t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setProfileSaving(false)
    }
  }

  const togglePref = (key: keyof NotificationPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const saveNotifications = async () => {
    setNotifSaving(true)
    setNotifFeedback(null)
    try {
      const saved = (await http.patch<AppSettings>('/api/settings', {
        notifications: notifPrefs,
      })) as { data?: AppSettings | null }
      if (saved.data?.notifications) {
        setNotifPrefs({ ...NOTIFICATION_DEFAULTS, ...saved.data.notifications })
      }
      setNotifFeedback(t('account.notifications.saved', {}, { defaultValue: 'Preferences saved.' }))
    } catch (err) {
      setNotifFeedback(
        (err as { message?: string }).message ??
          t(
            'account.notifications.saveFailed',
            {},
            {
              defaultValue: 'Could not save preferences.',
            },
          ),
      )
    } finally {
      setNotifSaving(false)
    }
  }

  const saveRole = async (next: RoleKey) => {
    setRole(next)
    setRoleSaving(true)
    setRoleFeedback(null)
    try {
      const saved = (await http.patch<AppSettings>('/api/settings', {
        activeRole: next,
      })) as { data?: AppSettings | null }
      if (saved.data?.activeRole) setRole(saved.data.activeRole)
      setRoleFeedback(
        next === 'tutor'
          ? t('account.role.savedTutor', {}, { defaultValue: 'Active mode: Tutor.' })
          : t('account.role.savedLearner', {}, { defaultValue: 'Active mode: Learner.' }),
      )
    } catch (err) {
      setRoleFeedback(
        (err as { message?: string }).message ??
          t('account.role.saveFailed', {}, { defaultValue: 'Could not switch role.' }),
      )
    } finally {
      setRoleSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'font-display text-4xl md:text-5xl tracking-tight',
          )}
        >
          {t('account.title', {}, { defaultValue: 'Profile, payment & preferences.' })}
        </h1>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <aside className={cm.cn('col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-3')}>
          <nav
            className={cm.cn(
              cm.stack(1),
              cm.sp('p', 2),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
            )}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl transition-colors',
                  activeTab === tab.key
                    ? 'text-on-primary'
                    : 'text-on-surface hover:bg-surface-container-low',
                )}
                style={
                  activeTab === tab.key
                    ? { backgroundColor: 'var(--mol-color-primary)' }
                    : undefined
                }
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                  {tab.icon}
                </span>
                {t(`account.tab.${tab.key}`, {}, { defaultValue: tab.label })}
              </button>
            ))}
          </nav>
        </aside>

        <section
          className={cm.cn(cm.stack(6), 'col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-9')}
        >
          {activeTab === 'profile' && (
            <form
              onSubmit={saveProfile}
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'font-display tracking-tight',
                )}
              >
                {t('account.profile.title', {}, { defaultValue: 'Profile' })}
              </h2>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                <div
                  className={cm.cn(
                    'rounded-full overflow-hidden ring-2 ring-surface-container-lowest shadow-sm shrink-0',
                  )}
                  style={{ width: 72, height: 72 }}
                >
                  <img
                    src={`https://i.pravatar.cc/144?u=${encodeURIComponent(userEmail)}`}
                    alt=""
                    className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  />
                </div>
                <div>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{userName}</p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{userEmail}</p>
                </div>
              </div>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/30',
                  )}
                />
              </label>
              <Field
                label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
                value={Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone ?? 'UTC'}
              />
              {profileFeedback && (
                <p role="status" className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {profileFeedback}
                </p>
              )}
              <button
                type="submit"
                disabled={profileSaving || !displayName.trim()}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'self-start rounded-full px-6 py-3 text-on-primary disabled:opacity-50',
                )}
                style={{ backgroundColor: 'var(--mol-color-primary)' }}
              >
                {profileSaving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
              </button>
            </form>
          )}

          {activeTab === 'role' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'font-display tracking-tight',
                )}
              >
                {t('account.role.title', {}, { defaultValue: 'Your role' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'account.role.body',
                  {},
                  {
                    defaultValue:
                      'Switch between learner and tutor mode any time. Your active sessions stay intact in either mode.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
                {(['student', 'tutor'] as const).map((r) => {
                  const active = role === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => saveRole(r)}
                      disabled={roleSaving}
                      aria-pressed={active}
                      className={cm.cn(
                        cm.sp('p', 5),
                        cm.stack(2),
                        'rounded-2xl border transition-colors text-left disabled:opacity-50',
                        active
                          ? 'border-primary ring-2 ring-primary/30 bg-surface-container-low'
                          : 'border-outline-variant/30 hover:bg-surface-container-low',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.w(10),
                          cm.h(10),
                          'rounded-xl',
                        )}
                        style={{
                          backgroundColor: 'var(--chalk-booked-light)',
                          color: 'var(--mol-color-primary-dark)',
                        }}
                      >
                        <span className={cm.cn('material-symbols-outlined')}>
                          {r === 'student' ? 'school' : 'cast_for_education'}
                        </span>
                      </span>
                      <p
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('lg'),
                          'font-display tracking-tight',
                        )}
                      >
                        {t(
                          `account.role.${r}.title`,
                          {},
                          { defaultValue: r === 'student' ? 'Learner' : 'Tutor' },
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          `account.role.${r}.body`,
                          {},
                          {
                            defaultValue:
                              r === 'student'
                                ? 'Search tutors, book sessions, leave reviews.'
                                : 'Set rates, accept bookings, track earnings.',
                          },
                        )}
                      </p>
                    </button>
                  )
                })}
              </div>
              {roleFeedback && (
                <p role="status" className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {roleFeedback}
                </p>
              )}
              <Link
                to="/become-tutor"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'self-start text-primary hover:underline decoration-2 underline-offset-4',
                )}
              >
                {t(
                  'account.role.upgradeLink',
                  {},
                  { defaultValue: 'Apply to become a verified tutor →' },
                )}
              </Link>
            </div>
          )}

          {activeTab === 'payments' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'font-display tracking-tight',
                )}
              >
                {t('account.payments.title', {}, { defaultValue: 'Plan & payment' })}
              </h2>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-low',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded-xl text-on-primary',
                  )}
                  style={{ backgroundColor: 'var(--mol-color-primary)' }}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    workspace_premium
                  </span>
                </span>
                <div className={cm.flex1}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {billing?.name ??
                      t('account.payments.planFree', {}, { defaultValue: 'Free plan' })}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                    data-testid="account-plan-key"
                  >
                    {billing?.isFree
                      ? t(
                          'account.payments.freeDescription',
                          {},
                          {
                            defaultValue: 'Pay-per-session • Upgrade for booking discounts',
                          },
                        )
                      : t(
                          'account.payments.paidDescription',
                          {
                            plan: billing?.name ?? '',
                          },
                          {
                            defaultValue: 'Subscription active — manage on Stripe.',
                          },
                        )}
                  </p>
                </div>
                {!billing?.isFree && (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest rounded-full px-3 py-1',
                    )}
                    style={{
                      backgroundColor: 'var(--chalk-available-light)',
                      color: 'var(--chalk-available)',
                    }}
                  >
                    {t('status.active', {}, { defaultValue: 'Active' })}
                  </span>
                )}
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'account.payments.helper',
                  {},
                  {
                    defaultValue:
                      'Your payment method is collected at checkout. We never store full card numbers — Stripe handles all card data.',
                  },
                )}
              </p>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'self-start text-primary hover:underline decoration-2 underline-offset-4',
                )}
              >
                {billing?.isFree
                  ? t(
                      'account.payments.viewPlans',
                      { appName: APP_NAME },
                      { defaultValue: 'View {{appName}} plans →' },
                    )
                  : t('account.payments.changePlan', {}, { defaultValue: 'Change plan →' })}
              </Link>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'font-display tracking-tight',
                )}
              >
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              {NOTIFICATION_ROWS.map((row) => (
                <label
                  key={row.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low cursor-pointer',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`account.notifications.${row.key}`, {}, { defaultValue: row.label })}
                  </span>
                  <input
                    type="checkbox"
                    checked={!!notifPrefs[row.key]}
                    onChange={() => togglePref(row.key)}
                    className={cm.cn('accent-primary w-5 h-5')}
                  />
                </label>
              ))}
              {notifFeedback && (
                <p role="status" className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {notifFeedback}
                </p>
              )}
              <button
                type="button"
                onClick={saveNotifications}
                disabled={notifSaving}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'self-start rounded-full px-6 py-3 text-on-primary disabled:opacity-50',
                )}
                style={{ backgroundColor: 'var(--mol-color-primary)' }}
              >
                {notifSaving
                  ? t('account.notifications.saving', {}, { defaultValue: 'Saving…' })
                  : t('account.notifications.save', {}, { defaultValue: 'Save preferences' })}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(1)}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{value}</p>
    </div>
  )
}
