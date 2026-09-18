import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthSplitLayout } from '../components/AuthSplitLayout.js'
import { AuthField } from './Login.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestReset, requestStatus, requestError } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)

  const loading = requestStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // surfaced via requestError from the usePasswordReset hook
    }
  }

  return (
    <AuthSplitLayout
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter the email on your account and we will send a reset link.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'hover:underline')}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {submitted ? (
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-success/10 border border-success/20 text-on-surface',
          )}
          role="status"
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={cm.cn('material-symbols-outlined text-success text-2xl')}>
              mark_email_read
            </span>
            <p className={cm.cn(cm.fontWeight('bold'))}>
              {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'forgotPassword.sentBody',
              { email },
              {
                defaultValue:
                  'If an account exists for {{email}}, a password reset link is on its way.',
              },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.stack(5)}>
          {requestError ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error/10 text-error border border-error/20',
              )}
            >
              {requestError instanceof Error
                ? requestError.message
                : t(
                    'auth.forgotPassword.couldNotSendResetLink',
                    {},
                    { defaultValue: 'Could not send reset link.' },
                  )}
            </div>
          ) : null}

          <AuthField
            id="email"
            label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            icon="mail"
          >
            <input
              id="email"
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
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/60',
              )}
            />
          </AuthField>

          <button
            type="submit"
            disabled={loading}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md',
            )}
          >
            {loading
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  )
}
