import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ForgotPassword() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'forgotPassword.error',
              {},
              { defaultValue: 'Something went wrong. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        cm.minH('screen'),
        cm.surfaceSecondary,
      )}
    >
      {/* Auth Card */}
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('[420px]'),
          'bg-surface rounded-lg shadow-ambient px-[48px] py-[44px]',
        )}
      >
        {sent ? (
          <div className={cm.cn(cm.stack(6), cm.textCenter)}>
            <svg
              className={cm.mxAuto}
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mol-color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <h2
              data-mol-id="forgot-password-success-heading"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[22px] text-[var(--mol-color-secondary)]',
              )}
            >
              {t('forgotPassword.checkEmail', {}, { defaultValue: 'Check your email' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-status-refunded')}>
              {t(
                'common.weSentAPasswordResetLink',
                { email },
                { defaultValue: 'We sent a password reset link to {{email}}.' },
              )}
            </p>
            <Link
              data-mol-id="link-back-to-login"
              className={cm.cn(
                'text-[14px] text-in-stock font-semibold hover:text-primary-dark transition-colors',
              )}
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        ) : (
          <div className={cm.stack(8)}>
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
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-status-refunded')}>
                {t(
                  'forgotPassword.subtitle',
                  {},
                  {
                    defaultValue:
                      "Enter your email and we'll send you a link to reset your password.",
                  },
                )}
              </p>
            </header>
            {error && (
              <div
                data-mol-id="forgot-password-error"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textCenter,
                  'bg-error-light text-error rounded-[8px] text-[14px]',
                )}
                role="alert"
              >
                {error}
              </div>
            )}
            {/* Form */}
            <form
              data-mol-id="form-forgot-password"
              className={cm.stack(4)}
              onSubmit={handleSubmit}
            >
              {/* Email Input */}
              <div className={cm.flex({ direction: 'col' })}>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'text-[14px] text-[var(--color-label-text)] mb-1.5',
                  )}
                  htmlFor="email"
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  className={cm.cn(
                    cm.sp('px', 3),
                    'h-[44px] bg-surface-secondary border-[var(--color-star-empty)] border rounded-[8px] text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-price-original',
                  )}
                  data-mol-id="forgot-password-email-input"
                  id="email"
                  name="email"
                  placeholder={t(
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {/* Submit Button */}
              <div className={cm.sp('pt', 2)}>
                <button
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('semibold'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-[44px] bg-in-stock text-white text-[15px] rounded-[8px] hover:bg-primary-hover active:scale-[0.98] transition-all',
                  )}
                  data-mol-id="forgot-password-submit-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </div>
            </form>
            {/* Footer Link */}
            <footer className={cm.textCenter}>
              <p className={cm.cn(cm.textSize('sm'), 'text-status-refunded')}>
                <Link
                  className={cm.cn(
                    'text-in-stock font-semibold hover:text-primary-dark transition-colors',
                  )}
                  data-mol-id="forgot-password-back-to-login-link"
                  to="/login"
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </p>
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
