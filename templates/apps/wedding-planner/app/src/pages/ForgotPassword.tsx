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
      // tracked in hook state
    }
  }

  if (submitted) {
    return (
      <AuthShell
        eyebrow={t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
        heading={t('forgotPassword.successHeading', {}, { defaultValue: 'Reset link sent' })}
        subtext={t(
          'forgotPassword.successSubtext',
          {},
          {
            defaultValue:
              'If an account exists for that email, we’ll send a link to reset your password. Check your inbox in the next minute or two.',
          },
        )}
        bottomLinkText={t('forgotPassword.tryAnother', {}, { defaultValue: 'Wrong email?' })}
        bottomLinkLabel={t('forgotPassword.tryAgain', {}, { defaultValue: 'Try again' })}
        bottomLinkTo="/forgot-password"
      >
        <div
          className={cm.cn(
            'p-5 rounded-xl bg-success-container/40 border border-outline-variant/40 text-center stack-y space-y-2',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-3xl')}
            style={{ color: 'var(--color-success)' }}
            aria-hidden="true"
          >
            mark_email_read
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
            {t(
              'forgotPassword.sentTo',
              { email },
              { defaultValue: 'Reset email sent to {{email}}' },
            )}
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: 'Account help' })}
      heading={t('forgotPassword.heading', {}, { defaultValue: 'Recover your serene workspace.' })}
      subtext={t(
        'forgotPassword.subtext',
        { appName: APP_NAME },
        {
          defaultValue:
            'Enter the email associated with your {{appName}} account. We’ll send a secure link to set a new password.',
        },
      )}
      bottomLinkText={t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}
      bottomLinkLabel={t('forgotPassword.signIn', {}, { defaultValue: 'Back to Sign in' })}
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
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
                'w-0 min-w-0 flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
        </label>

        {requestError ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'text-sm text-center rounded-lg bg-error-container text-on-error-container',
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
            'rounded-full text-base font-extrabold text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          }}
        >
          {isSubmitting
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ForgotPassword
