import { useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
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
      // safe to ignore: requestError in hook state surfaces this to the UI
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subtext={t(
        'forgotPassword.subtext',
        { appName: APP_NAME },
        {
          defaultValue:
            "Enter the email on your {{appName}} account and we'll send you a secure reset link.",
        },
      )}
      bottomLinkText={t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}
      bottomLinkLabel={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      bottomLinkTo="/login"
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.textCenter,
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-14 h-14 rounded-full text-white',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
            }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')}>mark_email_read</span>
          </div>
          <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('forgotPassword.checkEmailHeading', {}, { defaultValue: 'Check your email' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'forgotPassword.checkEmailBody',
              { email },
              {
                defaultValue:
                  'We sent a password reset link to {{email}}. The link expires in 30 minutes.',
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.stack(4)}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant')}
                aria-hidden="true"
              >
                mail
              </span>
              <input
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
                  'flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
                )}
              />
            </div>
          </label>

          {requestError ? (
            <div
              role="alert"
              data-mol-id="forgot-error"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'text-sm text-center rounded-lg',
                'bg-error-container text-on-error-container',
              )}
            >
              {requestError.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('py', 3),
              cm.sp('mt', 2),
              'rounded-full text-base font-extrabold text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
            }}
          >
            {isSubmitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
