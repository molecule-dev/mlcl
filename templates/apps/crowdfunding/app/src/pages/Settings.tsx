import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { api, type ApiProfile } from '../lib/api.js'

const SECTIONS = [
  'profile',
  'security',
  'language',
  'appearance',
  'payouts',
  'notifications',
  'danger',
] as const
type SectionKey = (typeof SECTIONS)[number]

interface NotificationPrefs {
  newPledge: boolean
  milestone: boolean
  comment: boolean
  weeklyDigest: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

const DEFAULT_PREFS: NotificationPrefs = {
  newPledge: true,
  milestone: true,
  comment: true,
  weeklyDigest: false,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth<UserProfile>()
  const [section, setSection] = useState<SectionKey>('profile')
  const [profile, setProfile] = useState<ApiProfile | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [savedBanner, setSavedBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Two-factor (TOTP) enrollment state — real flow against the user
  // resource's `POST /users/:id/verify-two-factor` endpoint.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Delete-account (password-confirm) state.
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const p = await api.getMyProfile(http)
        if (!alive) return
        setProfile(p)
        setName(p.name ?? '')
        setEmail(p.email ?? '')
        setBio(p.bio ?? '')
        const websiteFromPrefs = (p.preferences as { website?: string } | undefined)?.website
        setWebsite(websiteFromPrefs ?? '')
        const npref = (p.preferences as { notifications?: NotificationPrefs } | undefined)
          ?.notifications
        if (npref) setPrefs({ ...DEFAULT_PREFS, ...npref })
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error
              ? err.message
              : t('settings.loadError', {}, { defaultValue: 'Failed to load settings' }),
          )
      }
    })()
    return () => {
      alive = false
    }
  }, [http, t])

  // Read the persisted 2FA status from /users/me on mount (best-effort).
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
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const sectionLabel: Record<SectionKey, string> = {
    profile: t('nav.profile', {}, { defaultValue: 'Profile' }),
    security: t('nav.security', {}, { defaultValue: 'Security' }),
    language: t('footer.language', {}, { defaultValue: 'Language' }),
    appearance: t('nav.appearance', {}, { defaultValue: 'Appearance' }),
    payouts: t('settings.section.payouts', {}, { defaultValue: 'Payouts' }),
    notifications: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
    danger: t('nav.dangerZone', {}, { defaultValue: 'Danger zone' }),
  }

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateMyProfile(http, {
        name: name.trim(),
        bio: bio.trim(),
        preferences: {
          ...((profile?.preferences as Record<string, unknown> | undefined) ?? {}),
          website: website.trim(),
        },
      })
      // Email lives on the user record, not the profile metadata, so it is
      // updated via the user resource (`PATCH /api/users/:id`).
      let nextEmail = updated.email
      const trimmedEmail = email.trim()
      if (trimmedEmail && trimmedEmail !== (updated.email ?? '')) {
        await http.patch(`/api/users/${user?.id}`, { email: trimmedEmail })
        nextEmail = trimmedEmail
        if (user) setUser({ ...user, email: trimmedEmail })
      }
      setProfile({ ...updated, email: nextEmail })
      setSavedBanner(t('settings.saved', {}, { defaultValue: 'Profile updated' }))
      setTimeout(() => setSavedBanner(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Failed to save changes' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const saveNotifications = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateMyProfile(http, {
        preferences: {
          ...((profile?.preferences as Record<string, unknown> | undefined) ?? {}),
          notifications: prefs,
        },
      })
      setProfile(updated)
      setSavedBanner(
        t('settings.notifications.saved', {}, { defaultValue: 'Notification preferences saved' }),
      )
      setTimeout(() => setSavedBanner(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Failed to save changes' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const closeTf = (): void => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  const startEnable = async (): Promise<void> => {
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${user?.id}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setTfSetup(data)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              {
                defaultValue: 'Two-factor authentication is not available for this app.',
              },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const submitTf = async (action: 'enable' | 'disable'): Promise<void> => {
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user?.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account' }),
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('6xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-settings"
    >
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {savedBanner ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success/10 text-success',
          )}
          data-mol-id="settings-saved"
        >
          {savedBanner}
        </div>
      ) : null}
      {error ? (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error/10 text-error',
          )}
          data-mol-id="settings-error"
        >
          {error}
        </div>
      ) : null}

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-4 items-start')}>
        <nav
          className={cm.cn(
            cm.stack(1),
            cm.sp('p', 3),
            'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
          )}
        >
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg text-left transition-colors',
                s === section
                  ? 'bg-primary/10 text-primary border-l-4 border-primary -ml-1 pl-3'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
              data-mol-id={`settings-tab-${s}`}
            >
              {sectionLabel[s]}
            </button>
          ))}
        </nav>

        <div
          className={cm.cn(
            'lg:col-span-3',
            cm.sp('p', 8),
            cm.stack(6),
            'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
          )}
        >
          {section === 'profile' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('settings.profile.title', {}, { defaultValue: 'Public profile' })}
              </h2>
              <FieldRow
                id="display-name"
                label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                value={name}
                onChange={setName}
                placeholder={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
              />
              <FieldRow
                id="email"
                label={t('settings.email', {}, { defaultValue: 'Email' })}
                value={email}
                onChange={setEmail}
                placeholder={t(
                  'auth.passwordPlaceholderEmail',
                  {},
                  { defaultValue: 'you@example.com' },
                )}
                type="email"
              />
              <FieldRow
                id="bio"
                label={t('form.bio', {}, { defaultValue: 'Bio' })}
                value={bio}
                onChange={setBio}
                placeholder={t(
                  'settings.profile.bioPlaceholder',
                  {},
                  { defaultValue: 'Tell backers about yourself' },
                )}
                multiline
              />
              <FieldRow
                id="website"
                label={t('settings.profile.website', {}, { defaultValue: 'Website' })}
                value={website}
                onChange={setWebsite}
                placeholder={t(
                  'settings.profile.websitePlaceholder',
                  {},
                  { defaultValue: 'https://yourwebsite.com' },
                )}
              />
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-white shadow-sm self-start disabled:opacity-50',
                )}
                data-mol-id="settings-save-profile"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </>
          )}

          {section === 'security' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('settings.security.title', {}, { defaultValue: 'Security' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.security.body',
                  {},
                  {
                    defaultValue:
                      'Add an extra layer of protection to your account with an authenticator app.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  'rounded-lg border border-outline-variant bg-surface-container',
                )}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
                    {twoFactorEnabled ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.sp('ml', 2),
                          'text-success',
                        )}
                      >
                        {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
                      </span>
                    ) : null}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'settings.twoFactor.hint',
                      {},
                      {
                        defaultValue:
                          'Require a 6-digit code from your authenticator app to sign in.',
                      },
                    )}
                  </p>
                </div>
                {twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTfError('')
                      setTfToken('')
                      setTfModal('disable')
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'rounded-lg border border-error/40 text-error hover:bg-error/10 transition-colors',
                    )}
                    data-mol-id="two-factor-disable"
                  >
                    {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startEnable}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'rounded-lg bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity',
                    )}
                    data-mol-id="two-factor-enable"
                  >
                    {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                  </button>
                )}
              </div>
            </>
          )}

          {section === 'language' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </>
          )}

          {section === 'appearance' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <ThemeToggle />
            </>
          )}

          {section === 'payouts' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('settings.payouts.title', {}, { defaultValue: 'Payouts' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.payouts.body',
                  {},
                  {
                    defaultValue:
                      'Charges from pledges go directly to your platform Stripe account in test mode. Real-money creator payouts require Stripe Connect.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'rounded-lg border border-outline-variant bg-surface-container',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'md' })}>
                  <span
                    className="material-symbols-outlined text-3xl text-primary"
                    aria-hidden="true"
                  >
                    account_balance
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                      {t(
                        'settings.payouts.bank.title',
                        {},
                        { defaultValue: 'Stripe Connect (coming soon)' },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.payouts.bank.body',
                        {},
                        {
                          defaultValue:
                            'Per-creator payout accounts are not yet enabled in this test deployment.',
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {section === 'notifications' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <ToggleRow
                id="newPledge"
                label={t(
                  'settings.notifications.newPledge',
                  {},
                  { defaultValue: 'Email me when someone backs my campaign' },
                )}
                value={prefs.newPledge}
                onChange={(v) => setPrefs((p) => ({ ...p, newPledge: v }))}
              />
              <ToggleRow
                id="milestone"
                label={t(
                  'settings.notifications.milestone',
                  {},
                  { defaultValue: 'Milestones (50%, funded)' },
                )}
                value={prefs.milestone}
                onChange={(v) => setPrefs((p) => ({ ...p, milestone: v }))}
              />
              <ToggleRow
                id="comment"
                label={t(
                  'settings.notifications.comment',
                  {},
                  { defaultValue: 'New campaign updates from creators I back' },
                )}
                value={prefs.comment}
                onChange={(v) => setPrefs((p) => ({ ...p, comment: v }))}
              />
              <ToggleRow
                id="weeklyDigest"
                label={t(
                  'settings.notifications.weeklyDigest',
                  {},
                  { defaultValue: 'Weekly digest of new campaigns' },
                )}
                value={prefs.weeklyDigest}
                onChange={(v) => setPrefs((p) => ({ ...p, weeklyDigest: v }))}
              />
              <button
                type="button"
                onClick={saveNotifications}
                disabled={saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-primary text-white shadow-sm self-start disabled:opacity-50',
                )}
                data-mol-id="settings-save-notifications"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('settings.save', {}, { defaultValue: 'Save preferences' })}
              </button>
            </>
          )}

          {section === 'danger' && (
            <>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-error')}>
                {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
              </h2>
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(3),
                  'rounded-lg border border-error/30 bg-error/5',
                )}
              >
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'settings.danger.delete.body',
                    {},
                    {
                      defaultValue:
                        'Permanently delete your account and all associated data. Active campaigns should be ended first. This action cannot be undone.',
                    },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError('')
                    setDeletePassword('')
                    setShowDeleteModal(true)
                  }}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-error text-on-error shadow-sm self-start hover:opacity-90 transition-opacity',
                  )}
                  data-mol-id="settings-delete-account"
                >
                  {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        title={
          tfModal === 'disable'
            ? t(
                'settings.twoFactorDisableTitle',
                {},
                {
                  defaultValue: 'Disable two-factor authentication',
                },
              )
            : t(
                'settings.twoFactorEnableTitle',
                {},
                {
                  defaultValue: 'Enable two-factor authentication',
                },
              )
        }
        data-mol-id="two-factor-modal"
      >
        {tfError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {tfError}
          </Alert>
        ) : null}
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
                  'text-on-surface-variant text-center break-all',
                )}
              >
                {tfSetup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {tfModal === 'disable' || tfSetup ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <div>
              <label htmlFor="tf-token" className={cm.cn(cm.formLabel)}>
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
              color={tfModal === 'disable' ? 'error' : 'primary'}
              fullWidth
              loading={tfLoading}
            >
              {tfModal === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
        data-mol-id="delete-account-modal"
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
        {deleteError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        ) : null}
        <form onSubmit={handleDeleteAccount} className={cm.stack(4)}>
          <div>
            <label htmlFor="delete-pw" className={cm.cn(cm.formLabel)}>
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
          <Button type="submit" color="error" fullWidth loading={deleteLoading}>
            {deleteLoading
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function FieldRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = 'text',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  multiline?: boolean
  type?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(2)}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('medium'),
            'rounded-lg border border-outline-variant bg-surface-container-low resize-y text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          )}
          data-mol-id={`field-${id}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('medium'),
            'rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
          )}
          data-mol-id={`field-${id}`}
        />
      )}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  value,
  onChange,
}: {
  id?: string
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('py', 3),
        'border-b border-outline-variant',
      )}
    >
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={label}
        data-mol-id={id ? `toggle-${id}` : undefined}
        className={cm.cn(
          cm.w(10),
          cm.h(6),
          cm.roundedFull,
          'transition-colors relative',
          value ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            cm.w(4),
            cm.h(4),
            cm.roundedFull,
            'absolute top-1 transition-all bg-white shadow',
            value ? 'left-5' : 'left-1',
          )}
        />
      </button>
    </div>
  )
}

export default Settings
