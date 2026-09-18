import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
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
      /* error tracked in hook state */
    }
  }

  return (
    <AuthShell dataMolId="page-forgot-password">
      <AuthBrandHeader />

      {submitted ? (
        <div
          data-mol-id="forgot-sent"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.textCenter,
          )}
        >
          <div
            className={cm.cn(
              cm.w(12),
              cm.h(12),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-2xl bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-primary/20',
            )}
          >
            <span
              className="material-symbols-outlined text-3xl text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              check_circle
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('common.checkYourEmail', {}, { defaultValue: 'Check your email.' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'serif-text text-on-surface-variant')}>
            {t(
              'common.weSentAPasswordResetLink',
              { email },
              { defaultValue: 'We sent a password reset link to {{email}}.' },
            )}
          </p>
          <button
            type="button"
            data-mol-id="forgot-back-link"
            onClick={() => navigate('/login')}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'text-primary hover:underline',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </button>
        </div>
      ) : (
        <>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
              cm.sp('mt', 2),
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-center text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'serif-text italic text-center text-on-surface-variant',
              )}
            >
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: "Enter your email and we'll send you a reset link." },
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <label
                htmlFor="email"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
                  aria-hidden="true"
                >
                  mail
                </span>
                <input
                  id="email"
                  data-mol-id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
                  className={cm.cn(
                    cm.w('full'),
                    cm.fontWeight('medium'),
                    'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
                  )}
                />
              </div>
            </div>

            {requestError ? (
              <div
                data-mol-id="forgot-error"
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'rounded-xl bg-error-container text-on-error-container',
                )}
              >
                {requestError.message}
              </div>
            ) : null}

            <button
              type="submit"
              data-mol-id="forgot-submit"
              disabled={isSubmitting}
              className={cm.cn(
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-60 transition-opacity active:scale-95',
              )}
            >
              {isSubmitting
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            </button>
          </form>

          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
            <Link
              to="/login"
              data-mol-id="forgot-login-link"
              className={'font-bold text-primary hover:underline'}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
