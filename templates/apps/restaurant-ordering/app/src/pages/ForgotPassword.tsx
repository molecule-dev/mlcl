import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)
  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // error is tracked in requestError from usePasswordReset hook state
    }
  }

  return (
    <AuthShell
      footer={
        !submitted && (
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t(
              'auth.login.rememberedYourPassword',
              {},
              { defaultValue: 'Remembered your password?' },
            )}{' '}
            <Link
              to="/login"
              className={cm.cn(
                'font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        )
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            cm.textCenter,
          )}
        >
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-gradient-to-br from-primary to-tertiary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-primary text-3xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              mark_email_read
            </span>
          </div>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'font-display text-primary',
              )}
            >
              {t('common.checkYourEmail', {}, { defaultValue: 'Check your email.' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.sentMessage',
                { email },
                { defaultValue: 'We sent a reset link to {{email}}.' },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={cm.cn('font-bold text-sm text-primary hover:underline')}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </button>
        </div>
      ) : (
        <>
          <div className={cm.textCenter}>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'font-display text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: "Enter your email and we'll send a reset link." },
              )}
            </p>
          </div>
          <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <label
                htmlFor="email"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-transparent focus-within:border-primary',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('mr', 3),
                    cm.textSize('xl'),
                    'material-symbols-outlined text-outline',
                  )}
                >
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'auth.passwordPlaceholderNameExample',
                    {},
                    { defaultValue: 'name@example.com' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 0),
                    cm.fontWeight('medium'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                  )}
                />
              </div>
            </div>

            {requestError && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-error-container text-on-error-container rounded-xl',
                )}
              >
                {requestError.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cm.cn(
                cm.sp('py', 4),
                cm.roundedFull,
                cm.textSize('lg'),
                cm.sp('mt', 2),
                cm.fontWeight('bold'),
                'text-on-primary bg-gradient-to-br from-primary to-tertiary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-60',
              )}
            >
              {isSubmitting
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
