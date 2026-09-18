import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email: email.trim() })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.error', {}, { defaultValue: 'Failed to send reset link.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-background text-on-background selection:bg-primary-fixed selection:text-primary',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'max-w-[1280px] w-full')}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 16),
            'max-w-[540px] bg-surface w-full rounded-2xl custom-shadow',
          )}
        >
          <div className={cm.cn(cm.sp('mb', 12), cm.textCenter)}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('mb', 4),
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'indigo-gradient rounded-xl text-on-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  data-icon="auto_awesome"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>
              <Link
                className={cm.cn('text-3xl font-black tracking-tighter text-on-background')}
                to="/"
              >
                {t('common.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </Link>
            </div>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'tracking-tight text-on-background',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: "Enter your email and we'll send you a reset link." },
              )}
            </p>
          </div>

          {submitted ? (
            <div
              role="status"
              data-testid="forgot-password-sent"
              className={cm.cn(
                'w-full p-6 rounded-xl bg-success-light text-success text-sm text-center',
              )}
            >
              {t(
                'forgotPassword.sent',
                { email },
                {
                  defaultValue:
                    'If an account exists for {{email}}, a reset link has been sent. Check your inbox.',
                },
              )}
            </div>
          ) : (
            <form className={cm.cn(cm.stack(6), 'w-full')} onSubmit={handleSubmit}>
              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-light text-error rounded-lg',
                  )}
                >
                  {error}
                </div>
              )}
              <div className={cm.cn(cm.stack(2))}>
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'block tracking-wide text-on-background',
                  )}
                  htmlFor="email"
                >
                  {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
                </label>
                <input
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'w-full bg-surface-container-low focus:bg-surface border-0 ghost-border rounded-xl text-on-background placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none',
                  )}
                  id="email"
                  placeholder={t(
                    'auth.passwordPlaceholderNameCompany',
                    {},
                    { defaultValue: 'name@company.com' },
                  )}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.fontWeight('bold'),
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  'w-full indigo-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  data-icon="arrow_forward"
                >
                  arrow_forward
                </span>
              </button>
            </form>
          )}

          <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
            <Link
              className={cm.cn('text-primary font-bold hover:underline underline-offset-4 text-sm')}
              to="/login"
            >
              {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
