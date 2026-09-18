import { useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PlumeAuthShell } from '../components/PlumeAuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await http.post('/users/forgot-password', { email })
      setSent(true)
    } catch (error) {
      logError('forgotPassword.submit', error)
      setError(
        t(
          'auth.forgotPassword.couldNotSendResetLink',
          {},
          { defaultValue: 'Could not send reset link.' },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PlumeAuthShell
      headingKey="forgotPassword.heading"
      headingDefault="Reset your password"
      subheadingKey="forgotPassword.subheading"
      subheadingDefault="Enter your email and we will send you a reset link."
      footerPromptKey="forgotPassword.footerPrompt"
      footerPromptDefault="Remembered it?"
      footerLinkKey="forgotPassword.footerLink"
      footerLinkDefault="Back to sign in"
      footerLinkTo="/login"
    >
      {sent ? (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textCenter,
            cm.textSize('sm'),
            'rounded-lg bg-success-container text-on-success-container',
          )}
        >
          {t(
            'forgotPassword.sent',
            { email },
            { defaultValue: 'If {{email}} is on file, a reset link is on its way.' },
          )}
        </div>
      ) : (
        <form className={cm.stack(5)} onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="forgot-email"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 2),
                'block text-on-surface',
              )}
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'forgotPassword.emailPlaceholder',
                {},
                { defaultValue: 'author@example.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'h-12 rounded-lg bg-surface border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors',
              )}
            />
          </div>
          {error ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.textCenter,
                cm.roundedFull,
                'bg-error-container text-on-error-container',
              )}
            >
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'h-12 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60',
            )}
          >
            {submitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </PlumeAuthShell>
  )
}

export default ForgotPassword
export { ForgotPassword as ForgotPasswordPage }
