import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'resetPassword.error',
              {},
              { defaultValue: 'Unable to reset password. The link may have expired.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        cm.surfaceSecondary,
      )}
    >
      {/* Auth Card */}
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('[420px]'),
          cm.stack(8),
          'bg-surface rounded-lg shadow-ambient px-[48px] py-[44px]',
        )}
      >
        {/* Header */}
        <header className={cm.textCenter}>
          <h1
            className={cm.cn(
              cm.sp('mb', 1),
              'text-[28px] font-[900] text-[var(--mol-color-secondary)] leading-tight tracking-tight',
            )}
          >
            {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <h2
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mb', 1),
              'text-[22px] text-[var(--mol-color-secondary)]',
            )}
          >
            {success
              ? t('resetPassword.successTitle', {}, { defaultValue: 'Password reset!' })
              : t(
                  'auth.resetPassword.setNewPasswordShort',
                  {},
                  { defaultValue: 'Set new password' },
                )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-status-refunded')}>
            {success
              ? t(
                  'resetPassword.successSubtitle',
                  {},
                  { defaultValue: 'Your password has been updated. You can now sign in.' },
                )
              : t('resetPassword.subtitle', {}, { defaultValue: 'Enter your new password below.' })}
          </p>
        </header>
        {success ? (
          <div className={cm.textCenter}>
            <Link
              className={cm.cn(
                'text-in-stock font-semibold hover:text-primary-dark transition-colors text-[14px]',
              )}
              data-mol-id="link-back-to-login"
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div
                data-mol-id="reset-password-error"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'bg-surface-secondary text-[var(--color-error-text)] rounded-[8px]',
                )}
                role="alert"
              >
                {error}
              </div>
            )}
            {/* Form */}
            <form
              className={cm.stack(4)}
              data-mol-section="reset-password-form"
              data-mol-id="reset-password-form"
              onSubmit={handleSubmit}
            >
              {/* New Password Input */}
              <div className={cm.flex({ direction: 'col' })}>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'text-[var(--color-label-text)] mb-1.5',
                  )}
                  htmlFor="password"
                >
                  {t(
                    'settings.changePasswordModal.newPassword',
                    {},
                    { defaultValue: 'New Password' },
                  )}
                </label>
                <input
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.h('[44px]'),
                    cm.textSize('sm'),
                    'bg-surface-secondary border-[var(--color-star-empty)] border rounded-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-price-original',
                  )}
                  autoComplete="new-password"
                  data-mol-id="input-new-password"
                  id="password"
                  name="password"
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  required={true}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {/* Confirm Password Input */}
              <div className={cm.flex({ direction: 'col' })}>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'text-[var(--color-label-text)] mb-1.5',
                  )}
                  htmlFor="confirm-password"
                >
                  {t('resetPassword.confirmPassword', {}, { defaultValue: 'Confirm Password' })}
                </label>
                <input
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.h('[44px]'),
                    cm.textSize('sm'),
                    'bg-surface-secondary border-[var(--color-star-empty)] border rounded-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-price-original',
                  )}
                  autoComplete="new-password"
                  data-mol-id="input-confirm-password"
                  id="confirm-password"
                  name="confirm-password"
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  required={true}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {/* Submit Button */}
              <div className={cm.sp('pt', 2)}>
                <button
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h('[44px]'),
                    'bg-in-stock text-white text-[15px] rounded-[8px] hover:bg-primary-hover active:scale-[0.98] transition-all',
                  )}
                  data-mol-id="reset-password-submit-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                    : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
