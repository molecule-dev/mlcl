import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { AuthInput, FieldLabel, FormErrorMessage, SubmitButton } from './Login.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const client = useAuthClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError(
        t(
          'reset.missingToken',
          {},
          { defaultValue: 'This link is invalid. Request a new reset email.' },
        ),
      )
      return
    }
    if (password !== confirmPassword) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await client.confirmPasswordReset({ token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('reset.failed', {}, { defaultValue: 'Could not reset your password.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t(
        'auth.resetPassword.setNewPasswordShort',
        {},
        { defaultValue: 'Set new password' },
      )}
      subheading={t(
        'reset.subheading',
        { appName: APP_NAME },
        { defaultValue: 'Choose a new password for your {{appName}} account.' },
      )}
      footer={
        <Link className={cm.cn('text-sm text-primary font-semibold hover:underline')} to="/login">
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))} noValidate>
        <div>
          <FieldLabel htmlFor="reset-password">
            {t('reset.password', {}, { defaultValue: 'New password' })}
          </FieldLabel>
          <AuthInput
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.passwordMinHint', {}, { defaultValue: 'At least 12 characters' })}
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="reset-confirm">
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </FieldLabel>
          <AuthInput
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.reenterPasswordHint', {}, { defaultValue: 'Re-enter password' })}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
        <SubmitButton submitting={submitting}>
          {submitting
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </SubmitButton>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
