import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

interface UserResponseProps {
  id: string
  name?: string | null
  email?: string | null
  username?: string | null
}

interface UserResponseEnvelope {
  props?: UserResponseProps
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<UserProfile>()
  const userId = (user?.id ?? '').toString()

  const location = useLocation()
  // Allow direct deep-links like /settings/password — without this the tab
  // state would always default to 'account', so users sharing a settings
  // URL would land on the wrong section.
  const initialTab: 'account' | 'password' | 'language' = location.pathname.endsWith('/password')
    ? 'password'
    : location.pathname.endsWith('/language')
      ? 'language'
      : 'account'
  const [activeId, setActiveId] = useState<'account' | 'password' | 'language'>(initialTab)
  useEffect(() => {
    if (location.pathname.endsWith('/password')) setActiveId('password')
    else if (location.pathname.endsWith('/language')) setActiveId('language')
    else if (location.pathname.endsWith('/account') || location.pathname === '/settings') {
      setActiveId('account')
    }
  }, [location.pathname])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileInfo, setProfileInfo] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordInfo, setPasswordInfo] = useState<string | null>(null)

  // Real TOTP two-factor enrollment against the user resource's
  // POST /users/:id/verify-two-factor endpoint (@molecule/api-two-factor):
  // Enable → {action:'setup'} returns a QR code + secret to scan → user enters
  // the 6-digit code → {action:'enable', token}. Disable → {action:'disable',
  // token}. Current status is read from /users/me. Fails gracefully (inline
  // message) when the API has no two-factor provider bonded.
  const isOAuthUser = Boolean((user as unknown as Record<string, unknown>)?.oauthServer)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setEmail(user.email ?? '')
  }, [user])

  // Read the persisted 2FA status from /users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/users/me')
      .then((res) => {
        if (cancelled) return
        const body = res?.data
        const u = body?.props ?? body
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const closeTf = (): void => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  const startEnable = async (): Promise<void> => {
    if (!userId) return
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      setTfSetup(res?.data ?? null)
    } catch (error) {
      logError('settings.twoFactorSetup', error)
      setTfError(
        t(
          'settings.twoFactorUnavailable',
          {},
          { defaultValue: 'Two-factor authentication is not available for this app.' },
        ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const submitTf = async (action: 'enable' | 'disable'): Promise<void> => {
    if (!userId) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (error) {
      logError('settings.twoFactorVerify', error)
      setTfError(
        t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code. Please try again.' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    setSavingProfile(true)
    setProfileError(null)
    setProfileInfo(null)
    try {
      const res = await http.patch<UserResponseEnvelope>(`/users/${userId}`, {
        name: name.trim(),
        email: email.trim(),
      })
      const next = res?.data?.props
      if (next && user) {
        setUser({ ...user, ...next } as UserProfile)
      }
      setProfileInfo(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (error) {
      logError('settings.saveProfile', error)
      setProfileError(
        t('settings.profileError', {}, { defaultValue: 'Could not save profile changes.' }),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setPasswordError(null)
    setPasswordInfo(null)
    if (newPassword.length < 8) {
      setPasswordError(
        t(
          'settings.passwordTooShort',
          {},
          { defaultValue: 'Password must be at least 8 characters.' },
        ),
      )
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        t('settings.passwordMismatch', {}, { defaultValue: 'New passwords do not match.' }),
      )
      return
    }
    setSavingPassword(true)
    try {
      await http.patch(`/users/${userId}/password`, {
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordInfo(
        t('settings.passwordSaved', {}, { defaultValue: 'Password changed successfully.' }),
      )
    } catch (error) {
      logError('settings.changePassword', error)
      setPasswordError(
        t(
          'settings.passwordError',
          {},
          { defaultValue: 'Could not change password. Check your current password.' },
        ),
      )
    } finally {
      setSavingPassword(false)
    }
  }

  const sections = [
    {
      id: 'account' as const,
      icon: 'person',
      title: t('settings.account', {}, { defaultValue: 'Account' }),
    },
    {
      id: 'password' as const,
      icon: 'lock',
      title: t('auth.login.password', {}, { defaultValue: 'Password' }),
    },
    {
      id: 'language' as const,
      icon: 'language',
      title: t('footer.language', {}, { defaultValue: 'Language' }),
    },
  ]

  return (
    <div className={cm.stack(8)}>
      <header className={cm.stack(2)}>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {t('settings.subtitle', {}, { defaultValue: 'Tune your account and security.' })}
        </p>
      </header>

      <div
        className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-[260px_1fr] items-start')}
      >
        <nav
          className={cm.cn(
            cm.sp('p', 3),
            cm.stack(1),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm sticky top-24',
          )}
        >
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              data-mol-id={`settings-tab-${s.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'w-full text-left rounded-xl transition-colors',
                activeId === s.id
                  ? 'bg-primary-container/40 text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')}>{s.icon}</span>
              {s.title}
            </button>
          ))}
          <Link
            to="/settings/billing"
            data-mol-id="settings-billing-link"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>credit_card</span>
            {t('settings.billing', {}, { defaultValue: 'Billing' })}
          </Link>
        </nav>

        <section
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          {activeId === 'language' ? (
            <>
              <div className={cm.stack(2)}>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
              </div>
              <LanguagePicker />
            </>
          ) : activeId === 'account' ? (
            <>
              <div className={cm.stack(2)}>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t('nav.profile', {}, { defaultValue: 'Profile' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.account.subtitle',
                    {},
                    { defaultValue: 'Update your display name and email address.' },
                  )}
                </p>
              </div>
              {profileError && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.textSize('sm'),
                    'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
                  )}
                >
                  {profileError}
                </div>
              )}
              {profileInfo && (
                <div
                  role="status"
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.textSize('sm'),
                    'rounded-xl bg-tertiary-container/30 text-on-tertiary-container border border-tertiary/30',
                  )}
                >
                  {profileInfo}
                </div>
              )}
              <div className={cm.stack(4)}>
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-mol-id="settings-name-input"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30',
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
                    data-mol-id="settings-email-input"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                </label>
                <div>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    data-mol-id="settings-save-profile"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
                    )}
                  >
                    {savingProfile
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleChangePassword} className={cm.stack(4)}>
                <div className={cm.stack(2)}>
                  <h2
                    className={cm.cn(
                      cm.textSize('2xl'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.password.subtitle',
                      {},
                      { defaultValue: 'Pick a strong password (at least 8 characters).' },
                    )}
                  </p>
                </div>
                {passwordError && (
                  <div
                    role="alert"
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.textSize('sm'),
                      'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
                    )}
                  >
                    {passwordError}
                  </div>
                )}
                {passwordInfo && (
                  <div
                    role="status"
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.textSize('sm'),
                      'rounded-xl bg-tertiary-container/30 text-on-tertiary-container border border-tertiary/30',
                    )}
                  >
                    {passwordInfo}
                  </div>
                )}
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.field.currentPassword', {}, { defaultValue: 'Current password' })}
                  </span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    data-mol-id="settings-current-password"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30',
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
                    {t('settings.field.newPassword', {}, { defaultValue: 'New password' })}
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    data-mol-id="settings-new-password"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30',
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
                    {t(
                      'auth.signup.confirmNewPassword',
                      {},
                      { defaultValue: 'Confirm new password' },
                    )}
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    data-mol-id="settings-confirm-password"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                </label>
                <div>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    data-mol-id="settings-save-password"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
                    )}
                  >
                    {savingPassword
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                  </button>
                </div>
              </form>
              {!isOAuthUser && (
                <div
                  className={cm.cn(
                    cm.sp('pt', 6),
                    cm.sp('mt', 2),
                    cm.stack(4),
                    'border-t border-outline-variant/30',
                  )}
                >
                  <div className={cm.stack(2)}>
                    <h2
                      className={cm.cn(
                        cm.textSize('2xl'),
                        'font-extrabold tracking-tight text-on-surface',
                      )}
                    >
                      {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
                    </h2>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'settings.twoFactorSubtitle',
                        {},
                        {
                          defaultValue:
                            'Add a one-time code from your authenticator app on top of your password.',
                        },
                      )}
                    </p>
                  </div>
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                      {twoFactorEnabled
                        ? t(
                            'settings.twoFactorOnLine',
                            {},
                            { defaultValue: 'Two-factor authentication is on.' },
                          )
                        : t(
                            'settings.twoFactorOffLine',
                            {},
                            { defaultValue: 'Two-factor authentication is off.' },
                          )}
                    </span>
                    {twoFactorEnabled ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTfError('')
                          setTfToken('')
                          setTfModal('disable')
                        }}
                        data-mol-id="settings-2fa-disable"
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'rounded-xl border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors',
                        )}
                      >
                        {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startEnable}
                        data-mol-id="settings-2fa-enable"
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
                        )}
                      >
                        {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                      className={cm.cn('mx-auto', cm.maxW('xs'))}
                    />
                    {tfSetup.secret ? (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-center break-all text-on-surface-variant',
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
                    <label className={cm.stack(1)}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
                      </span>
                      <Input
                        id="settings-2fa-token"
                        type="text"
                        value={tfToken}
                        onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                        autoComplete="one-time-code"
                        data-mol-id="settings-2fa-token"
                        required
                      />
                    </label>
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
          )}
        </section>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'lg:col-start-2 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
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
    </div>
  )
}

export default Settings
