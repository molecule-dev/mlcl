import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PlumeAuthShell } from '../components/PlumeAuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!token) {
      setError(
        t('resetPassword.invalidLink', {}, { defaultValue: 'Invalid or expired reset link.' }),
      )
      return
    }
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // The molecule auth backend expects `passwordResetToken` to be passed
      // alongside the new credentials at the login endpoint; that flow then
      // verifies the token and updates the user's password atomically.
      await http.post('/users/log-in', { passwordResetToken: token, password })
      navigate('/login', { replace: true })
    } catch (error) {
      logError('resetPassword.submit', error)
      setError(
        t('auth.resetPassword.couldNotReset', {}, { defaultValue: 'Could not reset password.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'h-12 rounded-lg bg-surface border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors',
  )

  return (
    <PlumeAuthShell
      headingKey="resetPassword.heading"
      headingDefault="Set a new password"
      subheadingKey="resetPassword.subheading"
      subheadingDefault="Choose something memorable."
      footerPromptKey="resetPassword.footerPrompt"
      footerPromptDefault="Remembered it?"
      footerLinkKey="resetPassword.footerLink"
      footerLinkDefault="Back to sign in"
      footerLinkTo="/login"
    >
      <form className={cm.stack(5)} onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="reset-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mb', 2),
              'block text-on-surface',
            )}
          >
            {t('resetPassword.password', {}, { defaultValue: 'New password' })}
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="reset-confirm"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('mb', 2),
              'block text-on-surface',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
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
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </PlumeAuthShell>
  )
}

export default ResetPassword
export { ResetPassword as ResetPasswordPage }
