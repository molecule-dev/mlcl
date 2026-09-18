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
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      altLink={
        !submitted ? (
          <span>
            {t(
              'auth.login.rememberedYourPassword',
              {},
              { defaultValue: 'Remembered your password?' },
            )}{' '}
            <Link
              to="/login"
              className={cm.cn(
                cm.sp('ml', 1),
                cm.fontWeight('bold'),
                'text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </span>
        ) : null
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
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
            }}
          >
            <span
              className="material-symbols-outlined text-white text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-on-surface',
              )}
            >
              {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline',
            )}
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
                'text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'auth.forgotPassword.enterEmailDescription',
                {},
                { defaultValue: 'Enter your email and we will send you a reset link.' },
              )}
            </p>
          </div>
          <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="email"
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('mr', 3),
                    cm.textSize('xl'),
                    'material-symbols-outlined text-outline',
                  )}
                  aria-hidden="true"
                >
                  mail
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('medium'),
                    'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
                  )}
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t(
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {requestError && (
              <div
                data-mol-id="forgot-error"
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-error-container text-on-error-container rounded-lg',
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
                cm.textSize('base'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'rounded-lg text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              }}
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
