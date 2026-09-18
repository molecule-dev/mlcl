import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

const PAYMENT_METHODS = [
  { id: 'pm_1', brand: 'Visa', last4: '4242', exp: '04/29', isDefault: true },
  { id: 'pm_2', brand: 'Mastercard', last4: '8217', exp: '11/28', isDefault: false },
] as const

interface UserLike {
  name?: string
  email?: string
  avatar_url?: string
}

interface ProfilePayload {
  notifications?: {
    email_booking_updates?: boolean
    push_messages?: boolean
  }
}

export function Account() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserLike>()
  const [hostMode, setHostMode] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('alcove.account.hostMode') ?? 'false')
    } catch (_error) {
      // Invalid JSON in localStorage — fall back to default false.
      return false
    }
  })
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  // Real two-factor (TOTP) enrollment against the user resource's
  // POST /users/:id/verify-two-factor endpoint (@molecule/api-two-factor).
  const userId = (user as unknown as { id?: string })?.id
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const profile = unwrapSingle<ProfilePayload>(res)
        if (profile?.notifications) {
          setEmailNotifs(profile.notifications.email_booking_updates ?? true)
          setPushNotifs(profile.notifications.push_messages ?? true)
        }
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Read the persisted 2FA status from /users/me on mount.
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
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  }, [http])

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
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setTfSetup(data)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'account.security.twoFactorUnavailable',
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
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('account.security.invalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const persistNotifs = async (next: {
    email_booking_updates?: boolean
    push_messages?: boolean
  }) => {
    if (!hydrated) return
    try {
      await http.patch('/api/profile/me', { notifications: next })
    } catch (_error) {
      // Best-effort persist — UI state already reflects the toggle.
    }
  }
  const persistHostMode = (value: boolean) => {
    setHostMode(value)
    try {
      localStorage.setItem('alcove.account.hostMode', JSON.stringify(value))
    } catch (_error) {
      // localStorage may be blocked (private browsing) — non-fatal.
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 8)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight',
          )}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {t('account.heading', {}, { defaultValue: 'Profile & preferences' })}
        </h1>
      </header>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {/* Profile */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className={'w-16 h-16 rounded-full object-cover'} />
            ) : (
              <div
                className={
                  'w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-xl font-extrabold'
                }
              >
                {(user?.name ?? user?.email ?? 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {user?.name ??
                  t(
                    'account.defaultName',
                    { appName: APP_NAME },
                    { defaultValue: '{{appName}} member' },
                  )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {user?.email ?? 'guest@alcove.example'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {}}
              className={cm.cn(
                'ml-auto',
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
              )}
            >
              {/* TODO: open edit-profile flow */}
              {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            </button>
          </div>
        </section>

        {/* Host switch */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'relative overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/30',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <span
              className={cm.cn(
                'w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {hostMode ? 'cottage' : 'add_home'}
              </span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('account.hostBlock.eyebrow', {}, { defaultValue: 'Host mode' })}
              </p>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {hostMode
                  ? t(
                      'account.hostBlock.onTitle',
                      { appName: APP_NAME },
                      { defaultValue: "You're hosting on {{appName}}" },
                    )
                  : t(
                      'account.hostBlock.offTitle',
                      { appName: APP_NAME },
                      { defaultValue: 'Share your space with {{appName}}' },
                    )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {hostMode
                  ? t(
                      'account.hostBlock.onBody',
                      {},
                      { defaultValue: 'Switch to guest mode anytime — your listings stay live.' },
                    )
                  : t(
                      'account.hostBlock.offBody',
                      {},
                      {
                        defaultValue:
                          'Become a host in 20 minutes. We handle photography and onboarding.',
                      },
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => persistHostMode(!hostMode)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
              )}
            >
              {hostMode
                ? t('account.hostBlock.switchToGuest', {}, { defaultValue: 'Switch to guest mode' })
                : t('account.hostBlock.becomeHost', {}, { defaultValue: 'Become a host' })}
            </button>
          </div>
          {hostMode ? (
            <Link
              to="/host"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'inline-block text-primary hover:underline',
              )}
            >
              {t(
                'account.hostBlock.openDashboardLink',
                {},
                { defaultValue: 'Go to host dashboard →' },
              )}
            </Link>
          ) : null}
        </section>

        {/* Payment methods */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
          >
            <h2
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {t('account.payments.heading', {}, { defaultValue: 'Payment methods' })}
            </h2>
            <button
              type="button"
              onClick={() => {}}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {/* TODO: open add-card flow */}
              {t('account.payments.add', {}, { defaultValue: '+ Add card' })}
            </button>
          </header>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {PAYMENT_METHODS.map((pm) => (
              <li
                key={pm.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-low border border-outline-variant/40',
                  cm.flex({ align: 'center', gap: 'md' }),
                )}
              >
                <span
                  className={cm.cn(
                    'w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center',
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    credit_card
                  </span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                  <p className={cm.fontWeight('bold')}>
                    {pm.brand} ···· {pm.last4}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'account.payments.expires',
                      { exp: pm.exp },
                      { defaultValue: 'Expires {{exp}}' },
                    )}
                  </p>
                </div>
                {pm.isDefault ? (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest',
                    )}
                  >
                    {t('account.payments.default', {}, { defaultValue: 'Default' })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Notifications */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <li
              className={cm.cn(
                cm.sp('py', 3),
                'border-b border-outline-variant/40',
                cm.flex({ align: 'center', justify: 'between' }),
              )}
            >
              <div>
                <p className={cm.fontWeight('bold')}>
                  {t('account.notifications.email', {}, { defaultValue: 'Email notifications' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'account.notifications.emailHint',
                    {},
                    { defaultValue: 'Booking confirmations, host messages, and price drops.' },
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !emailNotifs
                  setEmailNotifs(next)
                  void persistNotifs({ email_booking_updates: next })
                }}
                aria-pressed={emailNotifs}
                className={cm.cn(
                  'w-12 h-7 rounded-full transition-colors relative',
                  emailNotifs ? 'bg-primary' : 'bg-outline-variant',
                )}
              >
                <span
                  className={cm.cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-surface shadow transition-transform',
                    emailNotifs ? 'right-1' : 'left-1',
                  )}
                />
              </button>
            </li>
            <li className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', justify: 'between' }))}>
              <div>
                <p className={cm.fontWeight('bold')}>
                  {t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'account.notifications.pushHint',
                    {},
                    { defaultValue: 'Instant alerts on your phone for time-sensitive bookings.' },
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !pushNotifs
                  setPushNotifs(next)
                  void persistNotifs({ push_messages: next })
                }}
                aria-pressed={pushNotifs}
                className={cm.cn(
                  'w-12 h-7 rounded-full transition-colors relative',
                  pushNotifs ? 'bg-primary' : 'bg-outline-variant',
                )}
              >
                <span
                  className={cm.cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-surface shadow transition-transform',
                    pushNotifs ? 'right-1' : 'left-1',
                  )}
                />
              </button>
            </li>
          </ul>
        </section>

        {/* Security — real TOTP two-factor enrollment */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div className={'min-w-0'}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </p>
            <p className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 1))}>
              {t('account.security.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 2),
                  twoFactorEnabled ? 'text-success' : 'text-on-surface-variant',
                )}
              >
                {twoFactorEnabled
                  ? t('account.security.on', {}, { defaultValue: 'On' })
                  : t('account.security.off', {}, { defaultValue: 'Off' })}
              </span>
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'account.security.twoFactorHint',
                {},
                {
                  defaultValue:
                    'Require a one-time code from your authenticator app when you sign in.',
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (twoFactorEnabled) {
                setTfError('')
                setTfToken('')
                setTfModal('disable')
              } else {
                void startEnable()
              }
            }}
            data-mol-id={twoFactorEnabled ? 'two-factor-disable' : 'two-factor-enable'}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
            )}
          >
            {twoFactorEnabled
              ? t('account.security.disable', {}, { defaultValue: 'Disable' })
              : t('account.security.enable', {}, { defaultValue: 'Enable' })}
          </button>
        </section>
      </div>

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        title={
          tfModal === 'disable'
            ? t(
                'account.security.disableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'account.security.enableTitle',
                {},
                { defaultValue: 'Enable two-factor authentication' },
              )
        }
      >
        {tfError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {tfError}
          </Alert>
        ) : null}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn(cm.sp('mb', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'account.security.scan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('account.security.qrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto', cm.maxW('xs'))}
            />
            {tfSetup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.textCenter,
                  'text-on-surface-variant break-all',
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
            className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          >
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('account.security.code', {}, { defaultValue: 'Authentication code' })}
              </span>
              <Input
                type="text"
                value={tfToken}
                onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
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
                ? t('account.security.disable', {}, { defaultValue: 'Disable' })
                : t('account.security.verify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
