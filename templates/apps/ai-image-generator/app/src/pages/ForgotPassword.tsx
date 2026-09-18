import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthFormField } from '../components/AuthFormField.js'
import { AuthShell } from '../components/AuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestReset, requestStatus, requestError } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)
  const loading = requestStatus === 'pending'
  const error =
    requestError instanceof Error
      ? requestError.message
      : requestError
        ? String(requestError)
        : null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // requestError captured by hook; nothing to do here.
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgot.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            'Enter the email tied to your {{appName}} account and we’ll send a reset link.',
        },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary hover:text-secondary transition-colors',
          )}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div
          role="status"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('p', 6),
            'rounded-2xl bg-success-container/30 text-on-surface text-center',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-12 w-12 rounded-full bg-success text-white',
            )}
          >
            <span className="material-symbols-outlined">mark_email_read</span>
          </span>
          <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
            {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forgot.successBody',
              { email },
              { defaultValue: 'A reset link is on its way to {{email}}.' },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
          {error && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/40 text-error',
              )}
            >
              {error}
            </div>
          )}
          <AuthFormField
            name="email"
            label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            icon="mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('login.emailPlaceholder', {}, { defaultValue: 'you@dreams.com' })}
          />
          <button
            type="submit"
            disabled={loading}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <span className="material-symbols-outlined">send</span>
            {loading
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
