import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'

interface UserMe {
  props: {
    id: string
    email?: string | null
    name?: string | null
    createdAt?: string | null
    oauthData?: Record<string, unknown> | null
    twoFactorEnabled?: boolean | null
  }
  plan?: {
    name?: string
  }
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<UserMe | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Real TOTP two-factor enrollment against POST /api/users/:id/verify-two-factor
  // (setup → QR + secret → enter code → enable; disable → enter code). Status is
  // read from GET /api/users/me. Mirrors the shared @molecule AuthSection flow.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  const reload = async () => {
    try {
      const res = await http.get<UserMe>('/api/users/me')
      const data = (res.data as UserMe) ?? null
      setMe(data)
      setName(data?.props?.name ?? '')
      setEmail(data?.props?.email ?? '')
      setTwoFactorEnabled(Boolean(data?.props?.twoFactorEnabled))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!me) return
    setSaving(true)
    try {
      const patch: { name: string; email?: string } = { name: name.trim() }
      const trimmedEmail = email.trim()
      if (trimmedEmail) patch.email = trimmedEmail
      await http.patch(`/api/users/${me.props.id}`, patch)
      setSavedAt(Date.now())
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  const closeTf = useCallback(() => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }, [])

  useEffect(() => {
    if (tfModal === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTf()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [tfModal, closeTf])

  const startEnable = async () => {
    if (!me) return
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${me.props.id}/verify-two-factor`, {
        action: 'setup',
      })
      setTfSetup((res.data as TwoFactorSetup | undefined) ?? {})
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'profile.twoFactor.unavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const openDisable = () => {
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfModal('disable')
  }

  const submitTf = async (action: 'enable' | 'disable') => {
    if (!me) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${me.props.id}/verify-two-factor`, {
        action,
        token: tfToken.trim(),
      })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('profile.twoFactor.invalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  return (
    <SecretsManagerLayout>
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t('profile.kicker', {}, { defaultValue: 'Personal account' })}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'profile.subheading',
              {},
              { defaultValue: 'Identity, second-factor devices, and active sessions.' },
            )}
          </p>
        </header>

        {loading ? (
          <div
            data-mol-id="profile-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 font-mono text-xs text-muted',
            )}
          >
            {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
          </div>
        ) : !me ? (
          <div
            data-mol-id="profile-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error ?? t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' })}
          </div>
        ) : (
          <>
            <div className={cm.cn('grid gap-5 lg:grid-cols-[1.4fr_1fr]')}>
              <article className={cm.cn('rounded-xl border border-border bg-surface p-5')}>
                <header
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                  )}
                >
                  {t('nav.identity', {}, { defaultValue: 'Identity' })}
                </header>
                <div className={cm.cn('mt-4 flex items-center gap-4')}>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background font-mono text-2xl font-bold text-primary',
                    )}
                  >
                    {(me.props.email ?? me.props.name ?? 'A').charAt(0).toUpperCase()}
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                    <span
                      data-mol-id="profile-email"
                      className={cm.cn('font-headline text-lg font-semibold text-text')}
                    >
                      {me.props.email ?? '—'}
                    </span>
                    <span className={cm.cn('font-mono text-xs text-muted')}>
                      {me.props.createdAt
                        ? `${t('profile.joined', {}, { defaultValue: 'joined' })} ${new Date(me.props.createdAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  </div>
                </div>

                <form onSubmit={submit} className={cm.cn('mt-5 flex flex-col gap-3')}>
                  <label
                    className={cm.cn(
                      'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                    )}
                  >
                    {t('form.displayName', {}, { defaultValue: 'Display name' })}
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-mol-id="profile-name"
                      className={cm.cn(
                        'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                      )}
                    />
                  </label>
                  <label
                    className={cm.cn(
                      'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                    )}
                  >
                    {t('settings.email', {}, { defaultValue: 'Email' })}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-mol-id="profile-email-input"
                      autoComplete="email"
                      className={cm.cn(
                        'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                      )}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    data-mol-id="profile-save"
                    className={cm.cn(
                      'inline-flex h-9 w-fit items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {saving
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.save', {}, { defaultValue: 'Save' })}
                  </button>
                  {savedAt ? (
                    <p
                      data-mol-id="profile-saved"
                      className={cm.cn('font-mono text-[11px] text-primary')}
                    >
                      {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                    </p>
                  ) : null}
                  {error ? (
                    <p
                      data-mol-id="profile-error"
                      className={cm.cn('font-mono text-[11px] text-error')}
                    >
                      {error}
                    </p>
                  ) : null}
                </form>
              </article>

              <article className={cm.cn('rounded-xl border border-border bg-surface p-5')}>
                <header
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                  )}
                >
                  {t('nav.plan', {}, { defaultValue: 'Plan' })}
                </header>
                <p
                  data-mol-id="profile-plan"
                  className={cm.cn('mt-3 font-headline text-lg font-semibold text-text')}
                >
                  {me.plan?.name ?? t('nav.free', {}, { defaultValue: 'Free' })}
                </p>
                <p className={cm.cn('mt-1 font-body text-sm text-muted')}>
                  {t(
                    'profile.plan.description',
                    {},
                    { defaultValue: 'Manage your subscription, see limits, and upgrade.' },
                  )}
                </p>
                <Link
                  to="/pricing"
                  data-mol-id="profile-plan-cta"
                  className={cm.cn(
                    'mt-3 inline-flex h-8 items-center gap-1 rounded border border-primary/30 bg-primary/10 px-3 font-headline text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary',
                  )}
                >
                  {t('profile.plan.cta', {}, { defaultValue: 'View plans' })}
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                    arrow_forward
                  </span>
                </Link>
              </article>

              <article
                data-mol-id="profile-2fa"
                className={cm.cn('rounded-xl border border-border bg-surface p-5')}
              >
                <header
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                  )}
                >
                  {t('profile.twoFactor.kicker', {}, { defaultValue: 'Two-factor authentication' })}
                </header>
                <p
                  data-mol-id="profile-2fa-status"
                  className={cm.cn('mt-3 font-headline text-lg font-semibold text-text')}
                >
                  {twoFactorEnabled
                    ? t('profile.twoFactor.on', {}, { defaultValue: 'Enabled' })
                    : t('profile.twoFactor.off', {}, { defaultValue: 'Not enabled' })}
                </p>
                <p className={cm.cn('mt-1 font-body text-sm text-muted')}>
                  {t(
                    'profile.twoFactor.description',
                    {},
                    {
                      defaultValue:
                        'Protect your account with a time-based one-time code (TOTP) from an authenticator app.',
                    },
                  )}
                </p>
                {twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={openDisable}
                    data-mol-id="profile-2fa-disable"
                    className={cm.cn(
                      'mt-3 inline-flex h-8 w-fit items-center gap-1 rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-muted transition-colors hover:border-error hover:text-error',
                    )}
                  >
                    {t('profile.twoFactor.disable', {}, { defaultValue: 'Disable' })}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startEnable}
                    disabled={tfLoading}
                    data-mol-id="profile-2fa-enable"
                    className={cm.cn(
                      'mt-3 inline-flex h-8 w-fit items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {t('profile.twoFactor.enable', {}, { defaultValue: 'Enable' })}
                  </button>
                )}
              </article>
            </div>

            {tfModal !== null ? (
              <div
                role="presentation"
                data-mol-id="profile-2fa-modal"
                className={cm.cn(
                  'fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-sm',
                )}
                onClick={(e) => {
                  if (e.target === e.currentTarget) closeTf()
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="profile-2fa-title"
                  className={cm.cn(
                    'flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-xl',
                  )}
                >
                  <div className={cm.cn('flex items-center justify-between')}>
                    <h2
                      id="profile-2fa-title"
                      className={cm.cn('font-headline text-lg font-semibold text-text')}
                    >
                      {tfModal === 'disable'
                        ? t(
                            'profile.twoFactor.disableTitle',
                            {},
                            { defaultValue: 'Disable two-factor authentication' },
                          )
                        : t(
                            'profile.twoFactor.enableTitle',
                            {},
                            { defaultValue: 'Enable two-factor authentication' },
                          )}
                    </h2>
                    <button
                      type="button"
                      onClick={closeTf}
                      aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                      className={cm.cn('text-muted hover:text-text')}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">
                        close
                      </span>
                    </button>
                  </div>

                  {tfError ? (
                    <p
                      data-mol-id="profile-2fa-error"
                      className={cm.cn(
                        'rounded border border-error/40 bg-error/10 px-3 py-2 font-mono text-xs text-error',
                      )}
                    >
                      {tfError}
                    </p>
                  ) : null}

                  {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
                    <div className={cm.cn('flex flex-col gap-3')}>
                      <p className={cm.cn('font-body text-sm text-muted')}>
                        {t(
                          'profile.twoFactor.scan',
                          {},
                          {
                            defaultValue:
                              'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                          },
                        )}
                      </p>
                      <img
                        src={tfSetup.QRImageUrl}
                        alt={t(
                          'profile.twoFactor.qrAlt',
                          {},
                          { defaultValue: 'Two-factor QR code' },
                        )}
                        className={cm.cn(
                          'mx-auto h-44 w-44 rounded-md border border-border bg-background p-2',
                        )}
                      />
                      {tfSetup.secret ? (
                        <p
                          className={cm.cn(
                            'break-all text-center font-mono text-[11px] text-muted',
                          )}
                        >
                          {tfSetup.secret}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {tfModal === 'enable' && !tfSetup && !tfError ? (
                    <p className={cm.cn('font-mono text-xs text-muted')}>
                      {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                    </p>
                  ) : null}

                  {tfModal === 'disable' || tfSetup ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
                      }}
                      className={cm.cn('flex flex-col gap-3')}
                    >
                      <label
                        className={cm.cn(
                          'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t('profile.twoFactor.code', {}, { defaultValue: 'Authentication code' })}
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={tfToken}
                          onChange={(e) => setTfToken(e.target.value)}
                          data-mol-id="profile-2fa-code"
                          required
                          className={cm.cn(
                            'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                          )}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={tfLoading}
                        data-mol-id="profile-2fa-submit"
                        className={cm.cn(
                          tfModal === 'disable'
                            ? 'inline-flex h-9 w-full items-center justify-center gap-1 rounded border border-error/50 bg-error/10 px-3 font-headline text-xs font-bold text-error transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-50'
                            : 'inline-flex h-9 w-full items-center justify-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      >
                        {tfLoading
                          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                          : tfModal === 'disable'
                            ? t('profile.twoFactor.disable', {}, { defaultValue: 'Disable' })
                            : t(
                                'profile.twoFactor.verify',
                                {},
                                { defaultValue: 'Verify & enable' },
                              )}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default Profile
