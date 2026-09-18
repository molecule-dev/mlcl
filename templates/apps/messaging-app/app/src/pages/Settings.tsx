import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  useTheme,
  useTranslation,
} from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, LanguagePicker, Modal } from '@molecule/app-ui-react'

const SECTIONS = ['privacy', 'notifications', 'appearance', 'account', 'plan'] as const
type Section = (typeof SECTIONS)[number]

interface Prefs {
  privacy?: {
    readReceipts?: boolean
    typingIndicators?: boolean
    disappearingDefault?: number
    screenLock?: boolean
    screenSecurity?: boolean
    relayCalls?: boolean
  }
  notifications?: {
    allowPush?: boolean
    showPreview?: boolean
    muteGroups?: boolean
    quietStart?: string
    quietEnd?: string
  }
  appearance?: {
    theme?: string
    fontSize?: string
    compactMode?: boolean
    linkPreviews?: boolean
  }
}

const DEFAULTS: Required<Prefs> = {
  privacy: {
    readReceipts: true,
    typingIndicators: true,
    disappearingDefault: 0,
    screenLock: false,
    screenSecurity: true,
    relayCalls: true,
  },
  notifications: {
    allowPush: true,
    showPreview: false,
    muteGroups: false,
    quietStart: '22:00',
    quietEnd: '07:00',
  },
  appearance: {
    theme: 'system',
    fontSize: 'medium',
    compactMode: false,
    linkPreviews: true,
  },
}

function mergeWithDefaults(prefs: Prefs | null | undefined): Required<Prefs> {
  return {
    privacy: { ...DEFAULTS.privacy, ...(prefs?.privacy ?? {}) },
    notifications: { ...DEFAULTS.notifications, ...(prefs?.notifications ?? {}) },
    appearance: { ...DEFAULTS.appearance, ...(prefs?.appearance ?? {}) },
  }
}

interface Plan {
  planKey: string | null
}

/** Map entitlement plan keys (see api/src/tiers.ts) to display names. */
const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  stripeMonthly: 'Pro',
  stripeYearly: 'Pro',
  teamMonthly: 'Team',
  teamYearly: 'Team',
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Theme goes through the theme bond (data-mol-mode + its own persistence) —
  // never a hand-rolled documentElement toggle, which the app CSS ignores.
  const { themeName, setTheme } = useTheme()
  const [section, setSection] = useState<Section>('privacy')
  const [prefs, setPrefs] = useState<Required<Prefs>>(mergeWithDefaults(null))
  const [plan, setPlan] = useState<Plan | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/profile/preferences').catch(() => null),
      http.get('/api/profile/me').catch(() => null),
    ]).then(([prefsRes, meRes]) => {
      if (cancelled) return
      const remote =
        prefsRes && typeof prefsRes === 'object'
          ? ((prefsRes as { data?: Prefs }).data ?? prefsRes)
          : null
      const merged = mergeWithDefaults(remote as Prefs)
      setPrefs(merged)
      // Apply the server-stored theme preference via the theme provider so
      // the choice follows the account across devices.
      const savedTheme = merged.appearance.theme
      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme)
      const me =
        meRes && typeof meRes === 'object' ? ((meRes as { data?: Plan }).data ?? meRes) : null
      if (me) setPlan(me as Plan)
    })
    return () => {
      cancelled = true
    }
  }, [http, setTheme])

  const persist = async (next: Required<Prefs>) => {
    setSaving(true)
    try {
      await http.put('/api/profile/preferences', next)
      setSavedAt(Date.now())
    } catch (error) {
      logError('settings.persistPreferences', error)
    } finally {
      setSaving(false)
    }
  }

  const updatePrivacy = (k: keyof Required<Prefs>['privacy'], v: unknown) => {
    setPrefs((prev) => {
      const next = { ...prev, privacy: { ...prev.privacy, [k]: v } }
      void persist(next)
      return next
    })
  }
  const updateNotifications = (k: keyof Required<Prefs>['notifications'], v: unknown) => {
    setPrefs((prev) => {
      const next = { ...prev, notifications: { ...prev.notifications, [k]: v } }
      void persist(next)
      return next
    })
  }
  const updateAppearance = (k: keyof Required<Prefs>['appearance'], v: unknown) => {
    setPrefs((prev) => {
      const next = { ...prev, appearance: { ...prev.appearance, [k]: v } }
      void persist(next)
      return next
    })
  }

  const planKey = plan?.planKey ?? 'free'
  const planLabel = PLAN_NAMES[planKey] ?? planKey
  const isPaidPlan = planKey !== 'free' && planKey in PLAN_NAMES

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
          {t('settings.eyebrow', {}, { defaultValue: 'Privacy & preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Privacy, notifications, and appearance — encrypted by default.' },
          )}
        </p>
        {savedAt && !saving && (
          <p className={cm.cn(cm.textSize('xs'), 'text-success', cm.sp('mt', 2))} role="status">
            {t('settings.saved', {}, { defaultValue: 'Preferences saved.' })}
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
          {section === 'privacy' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.privacy.heading', {}, { defaultValue: 'Privacy' })}
              </h2>
              <Toggle
                label={t(
                  'settings.privacy.readReceipts',
                  {},
                  { defaultValue: 'Send read receipts' },
                )}
                checked={!!prefs.privacy.readReceipts}
                onChange={(v) => updatePrivacy('readReceipts', v)}
              />
              <Toggle
                label={t(
                  'settings.privacy.typingIndicators',
                  {},
                  { defaultValue: 'Show typing indicators' },
                )}
                checked={!!prefs.privacy.typingIndicators}
                onChange={(v) => updatePrivacy('typingIndicators', v)}
              />
              <NumberField
                label={t(
                  'settings.privacy.disappearingDefault',
                  {},
                  { defaultValue: 'Default disappearing-message timer (seconds)' },
                )}
                value={prefs.privacy.disappearingDefault ?? 0}
                onChange={(v) => updatePrivacy('disappearingDefault', v)}
              />
              <Toggle
                label={t(
                  'settings.privacy.screenLock',
                  {},
                  { defaultValue: 'Lock app with passcode' },
                )}
                checked={!!prefs.privacy.screenLock}
                onChange={(v) => updatePrivacy('screenLock', v)}
              />
              <Toggle
                label={t(
                  'settings.privacy.screenSecurity',
                  {},
                  { defaultValue: 'Block screenshots in chats' },
                )}
                checked={!!prefs.privacy.screenSecurity}
                onChange={(v) => updatePrivacy('screenSecurity', v)}
              />
              <Toggle
                label={t(
                  'settings.privacy.relayCalls',
                  {},
                  { defaultValue: 'Always relay calls (hide IP)' },
                )}
                checked={!!prefs.privacy.relayCalls}
                onChange={(v) => updatePrivacy('relayCalls', v)}
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
                  'settings.notifications.allowPush',
                  {},
                  { defaultValue: 'Allow push notifications' },
                )}
                checked={!!prefs.notifications.allowPush}
                onChange={(v) => updateNotifications('allowPush', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.showPreview',
                  {},
                  { defaultValue: 'Show message preview in lock screen' },
                )}
                checked={!!prefs.notifications.showPreview}
                onChange={(v) => updateNotifications('showPreview', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.muteGroups',
                  {},
                  { defaultValue: 'Mute new group invites' },
                )}
                checked={!!prefs.notifications.muteGroups}
                onChange={(v) => updateNotifications('muteGroups', v)}
              />
              <TextField
                label={t(
                  'settings.notifications.quietStart',
                  {},
                  { defaultValue: 'Quiet hours start' },
                )}
                value={prefs.notifications.quietStart ?? ''}
                onChange={(v) => updateNotifications('quietStart', v)}
                type="time"
              />
              <TextField
                label={t(
                  'settings.notifications.quietEnd',
                  {},
                  { defaultValue: 'Quiet hours end' },
                )}
                value={prefs.notifications.quietEnd ?? ''}
                onChange={(v) => updateNotifications('quietEnd', v)}
                type="time"
              />
              {/* Real browser push registration (permission + subscription)
                  via @molecule/app-push, alongside the server-stored prefs above. */}
              <div className={cm.cn('border-t border-outline-variant', cm.sp('pt', 4))}>
                <NotificationsSection />
              </div>
            </section>
          )}

          {section === 'appearance' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h2>
              <SelectField
                label={t('nav.theme', {}, { defaultValue: 'Theme' })}
                value={themeName === 'dark' ? 'dark' : 'light'}
                onChange={(v) => {
                  setTheme(v)
                  updateAppearance('theme', v)
                }}
                options={[
                  {
                    value: 'light',
                    label: t('settings.theme.light', {}, { defaultValue: 'Light' }),
                  },
                  { value: 'dark', label: t('settings.theme.dark', {}, { defaultValue: 'Dark' }) },
                ]}
              />
              <SelectField
                label={t('settings.appearance.fontSize', {}, { defaultValue: 'Message font size' })}
                value={prefs.appearance.fontSize ?? 'medium'}
                onChange={(v) => updateAppearance('fontSize', v)}
                options={[
                  {
                    value: 'small',
                    label: t('settings.fontSize.small', {}, { defaultValue: 'Small' }),
                  },
                  {
                    value: 'medium',
                    label: t('settings.fontSize.medium', {}, { defaultValue: 'Medium' }),
                  },
                  {
                    value: 'large',
                    label: t('settings.fontSize.large', {}, { defaultValue: 'Large' }),
                  },
                ]}
              />
              <Toggle
                label={t('settings.appearance.compactMode', {}, { defaultValue: 'Compact mode' })}
                checked={!!prefs.appearance.compactMode}
                onChange={(v) => updateAppearance('compactMode', v)}
              />
              <Toggle
                label={t(
                  'settings.appearance.linkPreviews',
                  {},
                  { defaultValue: 'Generate link previews' },
                )}
                checked={!!prefs.appearance.linkPreviews}
                onChange={(v) => updateAppearance('linkPreviews', v)}
              />
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </span>
                <LanguagePicker />
              </div>
            </section>
          )}

          {section === 'account' && <AccountSecurity />}

          {section === 'plan' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('nav.plan', {}, { defaultValue: 'Plan' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.plan.current',
                  { plan: planLabel },
                  { defaultValue: 'Current plan: {{plan}}' },
                )}
              </p>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'inline-block bg-primary text-on-primary rounded-md no-underline',
                )}
              >
                {isPaidPlan
                  ? t('settings.plan.manage', {}, { defaultValue: 'Manage plan' })
                  : t('settings.plan.upgrade', {}, { defaultValue: 'Upgrade plan' })}
              </Link>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
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
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * Account & security — change password (modal via useChangePassword),
 * real TOTP two-factor enrollment (POST /api/users/:id/verify-two-factor),
 * and delete account (password-confirm modal → DELETE /api/users/:id →
 * logout → /login). Mirrors @molecule/app-settings-panel-react's
 * AuthSection + LogOutDeleteSection, wired to the standard endpoints.
 *
 * Two-factor uses the real enrollment flow (replacing the old boolean
 * toggle, which PATCHed `twoFactorEnabled` — a field the update handler
 * ignores — so it never enrolled anything): Enable → `{action:'setup'}`
 * returns a QR code + secret to scan into an authenticator app → user
 * enters the 6-digit code → `{action:'enable', token}`; Disable → user
 * enters a current code → `{action:'disable', token}`. The current status
 * is read from GET /api/users/me. If the API has no two-factor provider
 * bonded, setup fails gracefully with an inline message. The
 * authentication card auto-hides for OAuth-only users.
 */
function AccountSecurity() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { user, logout } = useAuth<UserProfile>()
  const { status, error: pwError, changePassword, reset } = useChangePassword()

  const userRecord = user as unknown as Record<string, unknown> | null
  const isOAuthUser = !!userRecord?.oauthServer

  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!userRecord?.twoFactorEnabled)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Read the persisted 2FA status from /users/me on mount (the auth-cache
  // value can be stale). Best-effort: defaults to the cached value.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; the cached value remains in effect.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch (_error) {
      // Error is surfaced via useChangePassword's `error`; keep the modal open.
    }
  }

  const closeTf = () => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  const startEnable = async () => {
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${user?.id}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setTfSetup(data)
    } catch (error) {
      setTfError(
        error instanceof Error
          ? error.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const submitTf = async (action: 'enable' | 'disable') => {
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user?.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (error) {
      setTfError(
        error instanceof Error
          ? error.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (error) {
      logError('settings.deleteAccount', error)
      setDeleteError(
        error instanceof Error
          ? error.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const labelClass = cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))

  return (
    <>
      {!isOAuthUser && (
        <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('settings.authentication', {}, { defaultValue: 'Authentication' })}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setShowPwModal(true)}>
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
          <Flex align="center" justify="between">
            <span className={cm.textSize('sm')}>
              {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
              {twoFactorEnabled ? (
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('ml', 2))}
                >
                  {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
                </span>
              ) : null}
            </span>
            {twoFactorEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTfError('')
                  setTfToken('')
                  setTfModal('disable')
                }}
                data-mol-id="two-factor-disable"
              >
                {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startEnable}
                data-mol-id="two-factor-enable"
              >
                {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
              </Button>
            )}
          </Flex>
        </section>
      )}

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.accountActions', {}, { defaultValue: 'Account' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.deleteAccount.description',
            {},
            { defaultValue: 'Permanently delete your account and all associated data.' },
          )}
        </p>
        <Button
          variant="ghost"
          color="error"
          onClick={() => setShowDeleteModal(true)}
          data-mol-id="settings-delete-account"
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </Button>
      </section>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Could not change password.' },
              )}
          </Alert>
        )}
        <form onSubmit={handleChangePassword} className={cm.stack(4)}>
          <div>
            <label htmlFor="current-pw" className={labelClass}>
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pw" className={labelClass}>
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={status === 'pending'}>
            {status === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteError(null)
        }}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and cannot be undone. Enter your password to confirm.',
            },
          )}
        </p>
        {deleteError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        )}
        <form onSubmit={handleDelete} className={cm.stack(4)}>
          <div>
            <label htmlFor="delete-pw" className={labelClass}>
              {t('settings.deleteAccountModal.password', {}, { defaultValue: 'Password' })}
            </label>
            <Input
              id="delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleting}>
            {deleting
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        title={
          tfModal === 'disable'
            ? t(
                'settings.twoFactorDisableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'settings.twoFactorEnableTitle',
                {},
                { defaultValue: 'Enable two-factor authentication' },
              )
        }
      >
        {tfError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {tfError}
          </Alert>
        )}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.twoFactorScan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn(cm.mxAuto, cm.maxW('xs'))}
            />
            {tfSetup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.textCenter,
                  'break-all',
                )}
              >
                {tfSetup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {(tfModal === 'disable' || tfSetup) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <div>
              <label htmlFor="tf-token" className={labelClass}>
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="tf-token"
                type="text"
                value={tfToken}
                onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
                required
              />
            </div>
            <Button
              type="submit"
              color={tfModal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={tfLoading}
            >
              {tfModal === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        )}
      </Modal>
    </>
  )
}
