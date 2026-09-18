import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AuthClient {
  user?: { id?: string }
  changePassword?: (oldPassword: string, newPassword: string) => Promise<void>
}

interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

function SecurityAccessSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth() as unknown as AuthClient
  const http = useHttpClient()
  const userId = auth.user?.id
  const [open, setOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Real TOTP two-factor state (replaces the old localStorage boolean toggle).
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

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
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setSuccess(false)
    if (newPw.length < 8) {
      setErr(
        t(
          'securityAccess.passwordTooShort',
          {},
          { defaultValue: 'New password must be at least 8 characters.' },
        ),
      )
      return
    }
    if (typeof auth.changePassword !== 'function') {
      setErr(
        t(
          'securityAccess.passwordEndpointMissing',
          {},
          { defaultValue: 'Password change is not configured for this app.' },
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      await auth.changePassword(currentPw, newPw)
      setSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setOpen(false)
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : t(
              'securityAccess.passwordChangeError',
              {},
              { defaultValue: 'Could not change password.' },
            ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function closeTf() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  // Close the two-factor dialog on Escape while it is open. State setters are
  // stable, so the handler resets the dialog state directly.
  useEffect(() => {
    if (!tfModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setTfModal(null)
      setTfSetup(null)
      setTfToken('')
      setTfError('')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [tfModal])

  async function startEnable() {
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfModal('enable')
    if (!userId) return
    setTfLoading(true)
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setTfSetup(data)
    } catch (e) {
      setTfError(
        e instanceof Error
          ? e.message
          : t(
              'securityAccess.twoFactorUnavailable',
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

  async function submitTf(action: 'enable' | 'disable') {
    if (!userId) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (e) {
      setTfError(
        e instanceof Error
          ? e.message
          : t('securityAccess.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'text-success')}
      >
        {t('securityAccess.title', {}, { defaultValue: 'Security & Access' })}
      </h2>
      <div className={cm.stack(6)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'rounded-xl bg-surface-container-low',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-success-light text-success',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')} data-icon="lock">
                lock
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t('securityAccess.passwordLabel', {}, { defaultValue: 'Account Password' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(
                  'securityAccess.passwordLastChanged',
                  { months: 3 },
                  { defaultValue: 'Last changed {{months}} months ago' },
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-mol-id="security-change-password-toggle"
            onClick={() => {
              setOpen((v) => !v)
              setErr(null)
              setSuccess(false)
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.textPrimary,
              'bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors',
            )}
          >
            {open
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('settings.changePasswordModal.title', {}, { defaultValue: 'Change Password' })}
          </button>
        </div>
        {open && (
          <form
            onSubmit={handleChangePassword}
            data-mol-id="security-change-password-form"
            className={cm.cn(cm.sp('p', 4), cm.stack(3), 'rounded-xl bg-surface-container-low')}
          >
            <input
              data-mol-id="security-current-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder={t(
                'securityAccess.currentPasswordPlaceholder',
                {},
                { defaultValue: 'Current password' },
              )}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface text-on-surface w-full')}
            />
            <input
              data-mol-id="security-new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder={t(
                'securityAccess.newPasswordPlaceholder',
                {},
                { defaultValue: 'New password (min. 8 chars)' },
              )}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface text-on-surface w-full')}
            />
            {err && (
              <p
                role="alert"
                data-mol-id="security-change-password-error"
                className={cm.cn(cm.textSize('xs'), 'text-tertiary')}
              >
                {err}
              </p>
            )}
            <button
              type="submit"
              data-mol-id="security-change-password-submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'bg-primary text-on-primary rounded-lg w-fit disabled:opacity-50',
              )}
            >
              {submitting
                ? t('securityAccess.changingPassword', {}, { defaultValue: 'Changing…' })
                : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
            </button>
          </form>
        )}
        {success && (
          <p
            data-mol-id="security-change-password-success"
            className={cm.cn(cm.textSize('xs'), cm.textPrimary)}
          >
            {t('auth.resetPassword.passwordUpdated', {}, { defaultValue: 'Password updated.' })}
          </p>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 4))}>
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t(
                'securityAccess.twoFactorLabel',
                {},
                { defaultValue: 'Two-Factor Authentication' },
              )}
              {twoFactorEnabled ? (
                <span
                  data-mol-id="security-two-factor-status"
                  className={cm.cn(cm.textSize('xs'), cm.sp('ml', 2), 'text-success')}
                >
                  {t('securityAccess.twoFactorOn', {}, { defaultValue: 'On' })}
                </span>
              ) : null}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'securityAccess.twoFactorDescription',
                {},
                { defaultValue: 'Adds an extra layer of security to your account.' },
              )}
            </p>
          </div>
          {twoFactorEnabled ? (
            <button
              type="button"
              data-mol-id="security-two-factor-disable"
              onClick={() => {
                setTfError('')
                setTfToken('')
                setTfModal('disable')
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'text-tertiary bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors',
              )}
            >
              {t('securityAccess.twoFactorDisable', {}, { defaultValue: 'Disable' })}
            </button>
          ) : (
            <button
              type="button"
              data-mol-id="security-two-factor-enable"
              onClick={() => {
                void startEnable()
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.textPrimary,
                'bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors',
              )}
            >
              {t('securityAccess.twoFactorEnable', {}, { defaultValue: 'Enable' })}
            </button>
          )}
        </div>
      </div>

      {tfModal && (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="security-two-factor-modal"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 4),
            'fixed inset-0 z-50',
          )}
        >
          {/* Pointer-only dismiss layer; keyboard users close via Escape or the cancel button. */}
          <div
            aria-hidden="true"
            onClick={closeTf}
            className={cm.cn('absolute inset-0 bg-on-surface/40 backdrop-blur-sm')}
          />
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'relative w-full max-w-sm rounded-3xl bg-surface-container-lowest ambient-shadow',
            )}
          >
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {tfModal === 'disable'
                ? t(
                    'securityAccess.twoFactorDisableTitle',
                    {},
                    { defaultValue: 'Disable two-factor authentication' },
                  )
                : t(
                    'securityAccess.twoFactorEnableTitle',
                    {},
                    { defaultValue: 'Enable two-factor authentication' },
                  )}
            </h3>
            {tfError && (
              <p
                role="alert"
                data-mol-id="security-two-factor-error"
                className={cm.cn(cm.textSize('xs'), 'text-tertiary')}
              >
                {tfError}
              </p>
            )}
            {tfModal === 'enable' && tfLoading && !tfSetup ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                {t('securityAccess.twoFactorPreparing', {}, { defaultValue: 'Preparing setup…' })}
              </p>
            ) : null}
            {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
              <div className={cm.stack(3)}>
                <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                  {t(
                    'securityAccess.twoFactorScan',
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
                    'securityAccess.twoFactorQrAlt',
                    {},
                    { defaultValue: 'Two-factor QR code' },
                  )}
                  className={cm.cn('mx-auto block max-w-[200px]')}
                />
                {tfSetup.secret ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-foreground-secondary text-center break-all',
                    )}
                  >
                    {tfSetup.secret}
                  </p>
                ) : null}
              </div>
            ) : null}
            {(tfModal === 'disable' || tfSetup) && (
              <form
                data-mol-id="security-two-factor-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
                }}
                className={cm.stack(3)}
              >
                <input
                  data-mol-id="security-two-factor-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  placeholder={t(
                    'securityAccess.twoFactorCode',
                    {},
                    { defaultValue: 'Authentication code' },
                  )}
                  value={tfToken}
                  onChange={(e) => setTfToken(e.target.value)}
                  className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface text-on-surface w-full')}
                />
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <button
                    type="submit"
                    data-mol-id="security-two-factor-submit"
                    disabled={tfLoading}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'bg-primary text-on-primary rounded-lg disabled:opacity-50',
                    )}
                  >
                    {tfModal === 'disable'
                      ? t('securityAccess.twoFactorDisable', {}, { defaultValue: 'Disable' })
                      : t(
                          'securityAccess.twoFactorVerify',
                          {},
                          { defaultValue: 'Verify & enable' },
                        )}
                  </button>
                  <button
                    type="button"
                    data-mol-id="security-two-factor-cancel"
                    onClick={closeTf}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.textPrimary,
                      'bg-surface-container-high rounded-lg hover:bg-surface-container-highest transition-colors',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default SecurityAccessSection
export { SecurityAccessSection }
