import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { authConfig } from '../config.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Yield a frame so the spinner DOM update flushes before the network
    // request fires.
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      await http.post(`${authConfig.baseURL}${authConfig.forgotPasswordEndpoint}`, { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.forgotPassword.couldNotSendResetLink',
              {},
              { defaultValue: 'Could not send reset link.' },
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
        cm.flex({}),
        'bg-surface text-on-surface antialiased flex-col md:flex-row',
      )}
    >
      <AuthBrandPanel />
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'w-full md:w-[45%] lg:p-16 relative',
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'md:hidden self-start mb-12')}
        >
          <span
            className="material-symbols-outlined text-3xl"
            style={{ color: 'var(--mol-color-primary-dark)' }}
          >
            account_balance
          </span>
          <span
            className={cm.cn('text-2xl font-black tracking-tight')}
            style={{ color: 'var(--mol-color-primary-dark)' }}
          >
            {APP_NAME}
          </span>
        </div>

        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header className={cm.cn(cm.sp('mb', 10), 'text-center md:text-left')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-[0.3em] text-primary',
              )}
            >
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'tracking-tight',
              )}
            >
              {t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subheading',
                {},
                { defaultValue: 'Enter your email to receive a reset link.' },
              )}
            </p>
          </header>

          {sent ? (
            <div
              role="status"
              aria-live="polite"
              className={cm.cn(
                cm.sp('p', 5),
                cm.sp('mb', 6),
                cm.textSize('sm'),
                'rounded-lg bg-success/10 text-success',
              )}
            >
              <p className={cm.fontWeight('bold')}>
                {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'forgotPassword.successBody',
                  { email },
                  { defaultValue: 'A reset link is on its way to {{email}}.' },
                )}
              </p>
            </div>
          ) : (
            <>
              {error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.sp('mb', 4),
                    cm.textSize('sm'),
                    'rounded-lg bg-error/10 text-error',
                  )}
                >
                  {error}
                </div>
              ) : null}

              <form className={cm.cn('space-y-6')} onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="forgot-email"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'block uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                  </label>
                  <div className="relative">
                    <span
                      className={cm.cn(
                        'absolute inset-y-0 left-0 px-3 flex items-center text-on-surface-variant pointer-events-none',
                      )}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined text-xl')}>mail</span>
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t(
                        'auth.passwordPlaceholderCompanyEmail',
                        {},
                        { defaultValue: 'you@company.com' },
                      )}
                      className={cm.cn(
                        cm.sp('pl', 10),
                        cm.sp('pr', 3),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        cm.w('full'),
                        'border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
                      )}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.w('full'),
                    'bg-primary text-on-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-60',
                  )}
                >
                  {loading
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
                </button>
              </form>
            </>
          )}

          <p
            className={cm.cn(
              cm.sp('mt', 10),
              cm.textSize('sm'),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'transition-colors hover:opacity-80')}
              style={{ color: 'var(--color-accent-text, var(--color-accent))' }}
            >
              {t('forgotPassword.backToLogin', {}, { defaultValue: '← Back to Sign In' })}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

export default ForgotPassword
