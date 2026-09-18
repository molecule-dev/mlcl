import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
      /* error tracked in hook */
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={
        submitted
          ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
          : t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })
      }
      description={
        submitted
          ? t(
              'forgotPassword.successBody',
              { email },
              { defaultValue: 'We sent a reset link to {{email}}. It expires in 30 minutes.' },
            )
          : t(
              'auth.forgotPassword.enterEmailDescription',
              {},
              { defaultValue: 'Enter your email and we will send you a reset link.' },
            )
      }
      footer={
        <Link to="/login" className={cm.cn('font-semibold text-primary hover:underline')}>
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50 transition-colors',
          )}
        >
          {t('forgotPassword.tryAnother', {}, { defaultValue: 'Try a different email' })}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder={t(
                'forgotPassword.emailPlaceholder',
                {},
                { defaultValue: 'you@northwindlabs.com' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('base'),
                'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
              )}
            />
          </label>

          {requestError && (
            <div
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('p', 3),
                'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
              )}
              role="alert"
            >
              {requestError.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-full bg-primary text-on-primary disabled:opacity-60 hover:bg-primary-active transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>forward_to_inbox</span>
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
