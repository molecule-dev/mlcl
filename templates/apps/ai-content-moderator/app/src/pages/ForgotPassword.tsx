import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuthClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { AuthField, FormErrorMessage, SubmitButton } from './Login.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const client = useAuthClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await client.requestPasswordReset({ email })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'forgot.failed',
              {},
              { defaultValue: 'Could not start the reset flow. Try again shortly.' },
            ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
      subheading={t(
        'forgot.subheading',
        {},
        { defaultValue: 'Enter your work email to receive a reset link.' },
      )}
      footer={
        <Link className={cm.cn('text-sm text-primary font-semibold hover:underline')} to="/login">
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      {submitted ? (
        <div className={cm.cn(cm.stack(4))}>
          <div
            className={cm.cn(
              'rounded-lg border border-emerald-300 bg-success-light px-4 py-4 text-sm text-success',
            )}
          >
            {t(
              'forgot.success',
              { email },
              {
                defaultValue:
                  'If an account exists for that address, we just sent a reset link. Check your inbox.',
              },
            )}
          </div>
          <p className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'forgot.tryAgain',
              {},
              { defaultValue: "Didn't get it? Wait a minute, then try again." },
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))} noValidate>
          <AuthField
            id="forgot-email"
            label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            type="email"
            autoComplete="email"
            placeholder={t('forgot.emailHint', {}, { defaultValue: 'you@yourdomain.com' })}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {error && <FormErrorMessage>{error}</FormErrorMessage>}
          <SubmitButton submitting={submitting}>
            {submitting
              ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
